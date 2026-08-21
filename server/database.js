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

  CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
  CREATE INDEX IF NOT EXISTS idx_produto_adicionais_adicional ON produto_adicionais(adicional_id);
  CREATE INDEX IF NOT EXISTS idx_sessoes_admin_expiracao ON sessoes_admin(expira_em);
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

export function abrirBanco({ caminho, administrador }) {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });

  const banco = new DatabaseSync(caminho);
  banco.exec('PRAGMA journal_mode = WAL');
  banco.exec(SCHEMA);
  criarAdministradorInicial(banco, administrador);
  criarCatalogoInicial(banco);
  return banco;
}

export { executarTransacao };
