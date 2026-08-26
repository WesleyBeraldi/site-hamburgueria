import { readdir, readFile } from 'node:fs/promises';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import mysql from 'mysql2/promise';

import { criarHashSenha } from './security.js';
import {
  adicionaisSeed,
  categoriasSeed,
  comandasSeed,
  configuracaoSeed,
  funcionariosSeed,
  mesasSeed,
  pedidosSeed,
  produtosSeed,
  promocoesSeed
} from './seed.js';

const pastaServidor = dirname(fileURLToPath(import.meta.url));
const pastaProjeto = resolve(pastaServidor, '..');
const pastaMigracoes = resolve(pastaProjeto, 'database/migrations');
const padraoMigration = /^\d{3}_[a-z0-9_-]+\.sql$/;
const caminhosEstrutura = [
  resolve(pastaProjeto, 'database/estrutura/001_criar_tabelas.sql'),
  resolve(pastaProjeto, 'database/estrutura/003_criar_indices.sql'),
  resolve(pastaProjeto, 'database/estrutura/002_criar_relacionamentos.sql')
];

function validarNomeBanco(nome) {
  if (!/^[a-zA-Z0-9_]+$/.test(nome)) {
    throw new Error('DB_NAME deve conter apenas letras, números e sublinhado.');
  }
  return nome;
}

function dataMySql(valor = new Date()) {
  return valor.toISOString().slice(0, 23).replace('T', ' ');
}

function separarInstrucoesSql(conteudo) {
  return conteudo
    .split(/;\s*(?:\r?\n|$)/)
    .map((instrucao) => instrucao.trim())
    .filter(Boolean);
}

async function aplicarEstruturaInicial(banco) {
  for (const caminho of caminhosEstrutura) {
    const conteudo = await readFile(caminho, 'utf8');
    for (const instrucao of separarInstrucoesSql(conteudo)) await banco.query(instrucao);
  }
}

async function registrarBaselineMigracoes(banco) {
  const arquivos = (await readdir(pastaMigracoes))
    .filter((arquivo) => padraoMigration.test(arquivo))
    .sort((a, b) => a.localeCompare(b));

  for (const arquivo of arquivos) {
    const conteudo = await readFile(resolve(pastaMigracoes, arquivo), 'utf8');
    const checksum = createHash('sha256').update(conteudo).digest('hex');
    await banco.execute(
      'INSERT INTO schema_migrations (versao, checksum) VALUES (?, ?)',
      [arquivo, checksum]
    );
  }
}

async function carregarSsl(configuracaoMySql) {
  if (!configuracaoMySql.ssl) return undefined;
  const caInformada = String(configuracaoMySql.sslCa ?? '').trim();
  let ca;
  if (caInformada) {
    ca = caInformada.includes('-----BEGIN CERTIFICATE-----')
      ? caInformada.replaceAll('\\n', '\n')
      : await readFile(resolve(pastaProjeto, caInformada), 'utf8');
  }
  return {
    rejectUnauthorized: true,
    ...(ca ? { ca } : {})
  };
}

async function configuracaoBaseMySql(configuracaoMySql) {
  return {
    host: configuracaoMySql.host,
    port: configuracaoMySql.port,
    user: configuracaoMySql.user,
    password: configuracaoMySql.password,
    charset: 'utf8mb4',
    timezone: 'Z',
    decimalNumbers: true,
    ...(configuracaoMySql.ssl ? { ssl: await carregarSsl(configuracaoMySql) } : {})
  };
}

async function revogarCredenciaisDemonstracaoLegadas(banco) {
  const hashesTokensLegados = [
    'eae37569f974549b25e5d60627f12fbef1dafe4f79a950eff455a62b38c7b9c1',
    '816711d2b11be214316287916c7a1f3bd61ca9be413755f8dbb1d51bfac9fb36'
  ];
  const marcadores = hashesTokensLegados.map(() => '?').join(', ');
  const [funcionarios] = await banco.execute(`
    SELECT id FROM funcionarios WHERE SHA2(token_acesso, 256) IN (${marcadores})
  `, hashesTokensLegados);
  if (funcionarios.length === 0) return;

  await executarTransacao(banco, async (conexao) => {
    for (const funcionario of funcionarios) {
      const pinAleatorio = String(randomInt(100000, 1000000));
      const tokenAleatorio = `garcom-${randomUUID().replaceAll('-', '')}`;
      await conexao.execute(`
        UPDATE funcionarios
        SET pin_hash = ?, token_acesso = ?, ativo = 0
        WHERE id = ?
      `, [criarHashSenha(pinAleatorio), tokenAleatorio, funcionario.id]);
      await conexao.execute('DELETE FROM sessoes_garcom WHERE funcionario_id = ?', [funcionario.id]);
    }
  });
}

export async function executarTransacao(banco, operacao) {
  const conexao = await banco.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await operacao(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function criarAdministradorInicial(banco, administrador) {
  const [linhas] = await banco.execute('SELECT id FROM administradores ORDER BY id LIMIT 1');
  const existente = linhas[0];
  if (!existente) {
    await banco.execute(`
      INSERT INTO administradores (usuario, email, nome, senha_hash)
      VALUES (?, ?, ?, ?)
    `, [administrador.usuario, administrador.email, administrador.nome, criarHashSenha(administrador.senha)]);
    return;
  }

  if (!administrador.sincronizarCredenciais) return;
  await executarTransacao(banco, async (conexao) => {
    await conexao.execute(`
      UPDATE administradores
      SET usuario = ?, email = ?, nome = ?, senha_hash = ?
      WHERE id = ?
    `, [
      administrador.usuario,
      administrador.email,
      administrador.nome,
      criarHashSenha(administrador.senha),
      existente.id
    ]);
    await conexao.execute('DELETE FROM sessoes_admin WHERE administrador_id = ?', [existente.id]);
  });
}

async function metadadoExiste(banco, chave) {
  const [linhas] = await banco.execute('SELECT 1 FROM metadados WHERE chave = ? LIMIT 1', [chave]);
  return linhas.length > 0;
}

async function marcarMetadado(conexao, chave) {
  await conexao.execute(`
    INSERT INTO metadados (chave, valor) VALUES (?, '1')
    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
  `, [chave]);
}

async function criarCatalogoInicial(banco, incluirDadosDemonstracao) {
  if (await metadadoExiste(banco, 'catalogo_inicial_criado')) return;

  const [[{ total }]] = await banco.query('SELECT COUNT(*) AS total FROM produtos');
  if (Number(total) > 0) {
    await banco.execute("INSERT INTO metadados (chave, valor) VALUES ('catalogo_inicial_criado', '1')");
    return;
  }

  await executarTransacao(banco, async (conexao) => {
    for (const categoria of categoriasSeed) {
      await conexao.execute(`
        INSERT INTO categorias (id, nome, ordem, ativo) VALUES (?, ?, ?, 1)
      `, [categoria.id, categoria.nome, categoria.ordem]);
    }
    if (incluirDadosDemonstracao) {
      for (const adicional of adicionaisSeed) {
        await conexao.execute(`
          INSERT INTO adicionais (id, nome, preco_centavos, ativo) VALUES (?, ?, ?, 1)
        `, [adicional.id, adicional.nome, adicional.precoCentavos]);
      }
      for (const produto of produtosSeed) {
        await conexao.execute(`
          INSERT INTO produtos
            (id, categoria_id, nome, descricao, preco_centavos, imagem_url, destaque, ativo)
          VALUES (?, ?, ?, ?, ?, NULL, ?, 1)
        `, [produto.id, produto.categoriaId, produto.nome, produto.descricao, produto.precoCentavos, produto.destaque ?? null]);
        for (const adicionalId of produto.adicionaisIds) {
          await conexao.execute(`
            INSERT INTO produto_adicionais (produto_id, adicional_id) VALUES (?, ?)
          `, [produto.id, adicionalId]);
        }
      }
    }
    await marcarMetadado(conexao, 'catalogo_inicial_criado');
  });
}

async function inserirItemComanda(conexao, comandaId, item) {
  const [resultado] = await conexao.execute(`
    INSERT INTO comanda_itens
      (comanda_id, produto_id, nome_produto, preco_unitario_centavos, quantidade, observacao)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [comandaId, item.produtoId, item.nome, item.precoCentavos, item.quantidade, item.observacao ?? null]);
  for (const adicional of item.adicionais ?? []) {
    await conexao.execute(`
      INSERT INTO comanda_item_adicionais
        (comanda_item_id, adicional_id, nome_adicional, preco_centavos)
      VALUES (?, ?, ?, ?)
    `, [resultado.insertId, adicional.id, adicional.nome, adicional.precoCentavos]);
  }
}

async function inserirItemPedido(conexao, pedidoId, item) {
  const [produtoLinhas] = await conexao.execute('SELECT descricao, imagem_url FROM produtos WHERE id = ?', [item.produtoId]);
  const produto = produtoLinhas[0];
  const [resultado] = await conexao.execute(`
    INSERT INTO pedido_itens
      (pedido_id, produto_id, nome_produto, descricao_produto, imagem_url,
       preco_unitario_centavos, quantidade, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    pedidoId,
    item.produtoId,
    item.nome,
    produto?.descricao ?? '',
    produto?.imagem_url ?? null,
    item.precoCentavos,
    item.quantidade,
    item.observacao ?? null
  ]);
  for (const adicional of item.adicionais ?? []) {
    await conexao.execute(`
      INSERT INTO pedido_item_adicionais
        (pedido_item_id, adicional_id, nome_adicional, preco_centavos)
      VALUES (?, ?, ?, ?)
    `, [resultado.insertId, adicional.id, adicional.nome, adicional.precoCentavos]);
  }
}

async function criarOperacaoInicial(banco, incluirDadosDemonstracao, pinFuncionarioDemonstracao) {
  if (await metadadoExiste(banco, 'operacao_inicial_criada')) return;

  const [[{ total }]] = await banco.query('SELECT COUNT(*) AS total FROM funcionarios');
  if (Number(total) > 0) {
    await banco.execute("INSERT INTO metadados (chave, valor) VALUES ('operacao_inicial_criada', '1')");
    return;
  }

  await executarTransacao(banco, async (conexao) => {
    for (const mesa of mesasSeed) {
      await conexao.execute(`
        INSERT INTO mesas (id, numero, lugares, ativo) VALUES (?, ?, ?, 1)
      `, [mesa.id, mesa.numero, mesa.lugares]);
    }

    if (incluirDadosDemonstracao) {
      for (const promocao of promocoesSeed) {
        await conexao.execute(`
          INSERT INTO promocoes
            (id, produto_id, nome, categoria, descricao, preco_anterior_centavos,
             preco_centavos, destaque, tipo, ativo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          promocao.id,
          promocao.produtoId,
          promocao.nome,
          promocao.categoria,
          promocao.descricao,
          promocao.precoAnteriorCentavos,
          promocao.precoCentavos,
          promocao.destaque,
          promocao.tipo
        ]);
      }

      for (const funcionario of funcionariosSeed) {
        const pin = pinFuncionarioDemonstracao || String(randomInt(100000, 1000000));
        const token = `garcom-${randomUUID().replaceAll('-', '')}`;
        await conexao.execute(`
          INSERT INTO funcionarios (id, nome, cargo, pin_hash, token_acesso, ativo)
          VALUES (?, ?, ?, ?, ?, 1)
        `, [funcionario.id, funcionario.nome, funcionario.cargo, criarHashSenha(pin), token]);
      }

      for (const comanda of comandasSeed) {
        await conexao.execute(`
          INSERT INTO comandas (id, mesa_id, funcionario_id, status, aberta_em)
          VALUES (?, ?, ?, ?, ?)
        `, [comanda.id, comanda.mesaId, comanda.funcionarioId, comanda.status, dataMySql(new Date(comanda.abertaEm))]);
        for (const item of comanda.itens) await inserirItemComanda(conexao, comanda.id, item);
      }

      for (const pedido of pedidosSeed) {
        await conexao.execute(`
          INSERT INTO pedidos
            (id, origem, cliente, telefone, email, status, pagamento, rua, numero,
             bairro, complemento, referencia, taxa_entrega_centavos,
             total_centavos, comanda_id, mesa_id, funcionario_id, criado_em)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          pedido.id,
          pedido.origem,
          pedido.cliente,
          pedido.telefone,
          pedido.email ?? null,
          pedido.status,
          pedido.pagamento,
          pedido.rua ?? null,
          pedido.numero ?? null,
          pedido.bairro ?? null,
          pedido.complemento ?? null,
          pedido.referencia ?? null,
          pedido.taxaEntregaCentavos,
          pedido.totalCentavos,
          pedido.comandaId ?? null,
          pedido.mesaId ?? null,
          pedido.funcionarioId ?? null,
          dataMySql(new Date(pedido.criadoEm))
        ]);
        for (const item of pedido.itens) await inserirItemPedido(conexao, pedido.id, item);
        await conexao.execute(`
          INSERT INTO pagamentos (pedido_id, comanda_id, forma, status, valor_centavos, pago_em)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          pedido.id,
          pedido.comandaId ?? null,
          pedido.pagamento,
          pedido.origem === 'mesa'
            ? 'Pago'
            : pedido.pagamento === 'Pix' ? 'Aguardando pagamento' : 'Pagamento na entrega',
          pedido.totalCentavos,
          pedido.origem === 'mesa' ? dataMySql(new Date(pedido.criadoEm)) : null
        ]);
      }
    }

    const configuracaoInicial = incluirDadosDemonstracao
      ? configuracaoSeed
      : {
          nomeLoja: '',
          telefone: '',
          email: '',
          endereco: '',
          taxaEntregaCentavos: 0,
          tempoEntrega: '',
          pedidoMinimoCentavos: 0,
          lojaAberta: false
        };
    await conexao.execute(`
      INSERT INTO configuracoes
        (id, nome_loja, telefone, email, endereco, taxa_entrega_centavos,
         tempo_entrega, pedido_minimo_centavos, loja_aberta, entrega_ativa,
         aceita_cartao, aceita_dinheiro)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      configuracaoInicial.nomeLoja,
      configuracaoInicial.telefone,
      configuracaoInicial.email,
      configuracaoInicial.endereco,
      configuracaoInicial.taxaEntregaCentavos,
      configuracaoInicial.tempoEntrega,
      configuracaoInicial.pedidoMinimoCentavos,
      configuracaoInicial.lojaAberta ? 1 : 0,
      incluirDadosDemonstracao ? 1 : 0,
      incluirDadosDemonstracao ? 1 : 0,
      incluirDadosDemonstracao ? 1 : 0
    ]);
    await marcarMetadado(conexao, 'operacao_inicial_criada');
  });
}

async function criarPool(configuracaoMySql) {
  const nomeBanco = validarNomeBanco(configuracaoMySql.database);
  const configuracaoBase = await configuracaoBaseMySql(configuracaoMySql);
  return mysql.createPool({
    ...configuracaoBase,
    database: nomeBanco,
    waitForConnections: true,
    connectionLimit: Number(configuracaoMySql.connectionLimit) || 10,
    queueLimit: 0
  });
}

export async function abrirBanco({ mysql: configuracaoMySql }) {
  const banco = await criarPool(configuracaoMySql);
  try {
    await banco.query('SELECT 1 AS conexao');
    return banco;
  } catch (erro) {
    await banco.end();
    throw erro;
  }
}

export async function prepararBanco({
  mysql: configuracaoMySql,
  administrador,
  incluirDadosDemonstracao = false,
  pinFuncionarioDemonstracao = null
}) {
  if (!administrador?.senha) throw new Error('Defina ADMIN_PASSWORD para preparar o banco.');
  if (pinFuncionarioDemonstracao && !/^\d{4,6}$/.test(pinFuncionarioDemonstracao)) {
    throw new Error('DEMO_WAITER_PIN deve conter de 4 a 6 dígitos.');
  }
  const nomeBanco = validarNomeBanco(configuracaoMySql.database);
  const configuracaoBase = await configuracaoBaseMySql(configuracaoMySql);

  if (configuracaoMySql.criarBancoSeAusente !== false) {
    const inicial = await mysql.createConnection(configuracaoBase);
    try {
      await inicial.query(`CREATE DATABASE IF NOT EXISTS \`${nomeBanco}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    } finally {
      await inicial.end();
    }
  }

  const banco = await criarPool(configuracaoMySql);
  try {
    const [tabelasExistentes] = await banco.query(`
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
    `);
    if (Number(tabelasExistentes[0]?.total) > 0) {
      throw new Error(
        'O preparo inicial exige um banco vazio. Para um banco existente, use npm run db:migrate.'
      );
    }
    await aplicarEstruturaInicial(banco);
    await registrarBaselineMigracoes(banco);
    await revogarCredenciaisDemonstracaoLegadas(banco);
    await criarAdministradorInicial(banco, administrador);
    await criarCatalogoInicial(banco, incluirDadosDemonstracao);
    await criarOperacaoInicial(banco, incluirDadosDemonstracao, pinFuncionarioDemonstracao);
    return banco;
  } catch (erro) {
    await banco.end();
    throw erro;
  }
}

export async function fecharBanco(banco) {
  await banco.end();
}
