import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { criarHashSenha, verificarSenha } from './security.js';
import { adicionaisSeed, categoriasSeed, produtosSeed } from './seed.js';

const SCHEMA = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS metadados (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessoes_admin (
    token_hash TEXT PRIMARY KEY,
    administrador_id INTEGER NOT NULL,
    expira_em TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (administrador_id) REFERENCES administradores(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
    ordem INTEGER NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
  );

  CREATE TABLE IF NOT EXISTS adicionais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
    preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT NOT NULL,
    preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
    imagem_url TEXT,
    destaque TEXT,
    ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
  );

  CREATE TABLE IF NOT EXISTS produto_adicionais (
    produto_id INTEGER NOT NULL,
    adicional_id INTEGER NOT NULL,
    PRIMARY KEY (produto_id, adicional_id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    FOREIGN KEY (adicional_id) REFERENCES adicionais(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS configuracoes (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nome_loja TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    endereco TEXT NOT NULL,
    taxa_entrega_centavos INTEGER NOT NULL CHECK (taxa_entrega_centavos >= 0),
    tempo_entrega TEXT NOT NULL,
    pedido_minimo_centavos INTEGER NOT NULL CHECK (pedido_minimo_centavos >= 0),
    loja_aberta INTEGER NOT NULL DEFAULT 1 CHECK (loja_aberta IN (0, 1)),
    atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE,
    token_acompanhamento_hash TEXT NOT NULL UNIQUE,
    origem TEXT NOT NULL DEFAULT 'Delivery',
    status TEXT NOT NULL DEFAULT 'Recebido',
    cliente TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    rua TEXT NOT NULL,
    numero TEXT NOT NULL,
    bairro TEXT NOT NULL,
    complemento TEXT,
    referencia TEXT,
    observacao TEXT,
    pagamento TEXT NOT NULL,
    subtotal_centavos INTEGER NOT NULL CHECK (subtotal_centavos >= 0),
    taxa_entrega_centavos INTEGER NOT NULL CHECK (taxa_entrega_centavos >= 0),
    total_centavos INTEGER NOT NULL CHECK (total_centavos >= 0),
    previsao TEXT NOT NULL,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pedido_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    produto_id INTEGER,
    nome_snapshot TEXT NOT NULL,
    descricao_snapshot TEXT NOT NULL,
    preco_unitario_centavos INTEGER NOT NULL CHECK (preco_unitario_centavos >= 0),
    imagem_url_snapshot TEXT,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    observacao TEXT,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS pedido_item_adicionais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_item_id INTEGER NOT NULL,
    adicional_id INTEGER,
    nome_snapshot TEXT NOT NULL,
    preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
    FOREIGN KEY (pedido_item_id) REFERENCES pedido_itens(id) ON DELETE CASCADE,
    FOREIGN KEY (adicional_id) REFERENCES adicionais(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
  CREATE INDEX IF NOT EXISTS idx_produto_adicionais_adicional ON produto_adicionais(adicional_id);
  CREATE INDEX IF NOT EXISTS idx_sessoes_admin_expiracao ON sessoes_admin(expira_em);
  CREATE INDEX IF NOT EXISTS idx_pedidos_criado_em ON pedidos(criado_em DESC);
  CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
  CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedido_id);
  CREATE INDEX IF NOT EXISTS idx_pedido_adicionais_item ON pedido_item_adicionais(pedido_item_id);
`;

function executarTransacao(banco, operacao) {
  banco.exec('BEGIN IMMEDIATE');
  try {
    const resultado = operacao();
    banco.exec('COMMIT');
    return resultado;
  } catch (erro) {
    banco.exec('ROLLBACK');
    throw erro;
  }
}

function criarAdministradorInicial(banco, administrador) {
  const existente = banco.prepare('SELECT * FROM administradores ORDER BY id LIMIT 1').get();
  if (existente) {
    const credenciaisMudaram = administrador.sincronizarCredenciais && (
      existente.usuario !== administrador.usuario
      || existente.email !== administrador.email
      || existente.nome !== administrador.nome
      || !verificarSenha(administrador.senha, existente.senha_hash)
    );

    if (credenciaisMudaram) {
      executarTransacao(banco, () => {
        banco.prepare(`
          UPDATE administradores
          SET usuario = ?, email = ?, nome = ?, senha_hash = ?, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          administrador.usuario,
          administrador.email,
          administrador.nome,
          criarHashSenha(administrador.senha),
          existente.id
        );
        banco.prepare('DELETE FROM sessoes_admin WHERE administrador_id = ?').run(existente.id);
      });
    }
    return;
  }

  banco.prepare(`
    INSERT INTO administradores (usuario, email, nome, senha_hash)
    VALUES (?, ?, ?, ?)
  `).run(
    administrador.usuario,
    administrador.email,
    administrador.nome,
    criarHashSenha(administrador.senha)
  );
}

function criarCatalogoInicial(banco) {
  const inicializado = banco.prepare(`
    SELECT valor FROM metadados WHERE chave = 'catalogo_inicial_criado'
  `).get();
  if (inicializado) return;

  const quantidade = banco.prepare('SELECT COUNT(*) AS total FROM produtos').get().total;
  if (quantidade > 0) {
    banco.prepare(`
      INSERT INTO metadados (chave, valor) VALUES ('catalogo_inicial_criado', '1')
    `).run();
    return;
  }

  executarTransacao(banco, () => {
    const inserirCategoria = banco.prepare(`
      INSERT OR IGNORE INTO categorias (id, nome, ordem, ativo) VALUES (?, ?, ?, 1)
    `);
    const inserirAdicional = banco.prepare(`
      INSERT OR IGNORE INTO adicionais (id, nome, preco_centavos, ativo) VALUES (?, ?, ?, 1)
    `);
    const inserirProduto = banco.prepare(`
      INSERT OR IGNORE INTO produtos
        (id, categoria_id, nome, descricao, preco_centavos, imagem_url, destaque, ativo)
      VALUES (?, ?, ?, ?, ?, NULL, ?, 1)
    `);
    const vincularAdicional = banco.prepare(`
      INSERT OR IGNORE INTO produto_adicionais (produto_id, adicional_id) VALUES (?, ?)
    `);

    categoriasSeed.forEach((categoria) => inserirCategoria.run(categoria.id, categoria.nome, categoria.ordem));
    adicionaisSeed.forEach((adicional) => inserirAdicional.run(adicional.id, adicional.nome, adicional.precoCentavos));
    produtosSeed.forEach((produto) => {
      inserirProduto.run(
        produto.id,
        produto.categoriaId,
        produto.nome,
        produto.descricao,
        produto.precoCentavos,
        produto.destaque ?? null
      );
      produto.adicionaisIds.forEach((adicionalId) => vincularAdicional.run(produto.id, adicionalId));
    });
    banco.prepare(`
      INSERT INTO metadados (chave, valor) VALUES ('catalogo_inicial_criado', '1')
    `).run();
  });
}

function criarConfiguracaoInicial(banco) {
  banco.prepare(`
    INSERT OR IGNORE INTO configuracoes (
      id, nome_loja, telefone, email, endereco, taxa_entrega_centavos,
      tempo_entrega, pedido_minimo_centavos, loja_aberta
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    'Hamburgueria',
    '(11) 99999-9999',
    'contato@hamburgueria.com',
    'Rua Principal, 100 - Centro',
    790,
    '35–45 min',
    2000
  );
}

export function abrirBanco({ caminho, administrador }) {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });

  const banco = new DatabaseSync(caminho);
  banco.exec('PRAGMA journal_mode = WAL');
  banco.exec(SCHEMA);
  criarAdministradorInicial(banco, administrador);
  criarCatalogoInicial(banco);
  criarConfiguracaoInicial(banco);
  return banco;
}

export { executarTransacao };
