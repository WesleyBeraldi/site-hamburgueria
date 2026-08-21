import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import mysql from 'mysql2/promise';

import { criarServidor } from './app.js';
import { precoParaCentavos } from './catalog.js';
import { abrirBanco, fecharBanco } from './database.js';
import { aguardarServidor, fecharServidor } from './runtime.js';

test('converte preços brasileiros e decimais para centavos', () => {
  assert.equal(precoParaCentavos('34,90'), 3490);
  assert.equal(precoParaCentavos('1.234,56'), 123456);
  assert.equal(precoParaCentavos(7.9), 790);
});

const executarIntegracao = process.env.RUN_MYSQL_TESTS === '1' || Boolean(process.env.DB_PASSWORD);

if (!executarIntegracao) {
  test('integração MySQL', { skip: 'Defina DB_PASSWORD para executar os testes de integração MySQL.' }, () => {});
} else {
  let banco;
  let servidor;
  let pastaTemporaria;
  let pastaUploads;
  let urlBase;

  const nomeBanco = `${process.env.DB_NAME || 'hamburgueria'}_testes`;
  const configuracaoMySql = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: nomeBanco,
    connectionLimit: 4
  };
  const administrador = {
    usuario: 'admin-teste',
    email: 'admin@teste.local',
    nome: 'Administrador de teste',
    senha: 'senha-segura',
    sincronizarCredenciais: true
  };

  async function chamar(caminho, { metodo = 'GET', dados, token } = {}) {
    const resposta = await fetch(`${urlBase}${caminho}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(dados === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: dados === undefined ? undefined : JSON.stringify(dados)
    });
    return { status: resposta.status, corpo: await resposta.json() };
  }

  before(async () => {
    pastaTemporaria = await mkdtemp(join(tmpdir(), 'hamburgueria-api-'));
    pastaUploads = join(pastaTemporaria, 'uploads');
    banco = await abrirBanco({ mysql: configuracaoMySql, administrador });
    servidor = criarServidor({ banco, pastaUploads });
    await aguardarServidor(servidor, 0);
    urlBase = `http://127.0.0.1:${servidor.address().port}`;
  });

  after(async () => {
    if (servidor) await fecharServidor(servidor);
    if (banco) await fecharBanco(banco);
    const conexao = await mysql.createConnection({
      host: configuracaoMySql.host,
      port: configuracaoMySql.port,
      user: configuracaoMySql.user,
      password: configuracaoMySql.password
    });
    await conexao.query(`DROP DATABASE IF EXISTS \`${nomeBanco}\``);
    await conexao.end();
    if (pastaTemporaria) await rm(pastaTemporaria, { recursive: true, force: true });
  });

  test('expõe saúde e dados públicos persistidos no MySQL', async () => {
    const saude = await chamar('/api/saude');
    assert.equal(saude.status, 200);
    assert.equal(saude.corpo.banco, 'mysql-conectado');

    const publico = await chamar('/api/publico/inicial');
    assert.equal(publico.status, 200);
    assert.equal(publico.corpo.produtos.length, 7);
    assert.equal(publico.corpo.adicionais.length, 6);
    assert.equal(publico.corpo.promocoes.length, 5);
    assert.equal(publico.corpo.funcionarios.length, 2);
  });

  test('autentica o administrador e protege os dados gerenciais', async () => {
    const semSessao = await chamar('/api/admin/dados');
    assert.equal(semSessao.status, 401);

    const login = await chamar('/api/admin/login', {
      metodo: 'POST',
      dados: { usuario: 'admin-teste', senha: 'senha-segura' }
    });
    assert.equal(login.status, 200);
    assert.ok(login.corpo.token);

    const dados = await chamar('/api/admin/dados', { token: login.corpo.token });
    assert.equal(dados.status, 200);
    assert.equal(dados.corpo.pedidos.length, 4);
    assert.equal(dados.corpo.mesas.length, 12);
  });

  test('cria delivery com preços recalculados e acompanhamento protegido', async () => {
    const criado = await chamar('/api/pedidos', {
      metodo: 'POST',
      dados: {
        nome: 'Cliente Teste',
        telefone: '(11) 90000-0000',
        email: 'cliente@teste.local',
        rua: 'Rua do Teste',
        numero: '10',
        bairro: 'Centro',
        pagamento: 'Pix',
        itens: [{ id: 1, quantidade: 1, adicionais: [{ id: 1 }] }]
      }
    });
    assert.equal(criado.status, 201);
    assert.equal(criado.corpo.pedido.total, 47.8);
    assert.ok(criado.corpo.pedido.tokenAcompanhamento);

    const negado = await chamar(`/api/pedidos/${encodeURIComponent(criado.corpo.pedido.id)}?token=invalido`);
    assert.equal(negado.status, 404);

    const acompanhado = await chamar(`/api/pedidos/${encodeURIComponent(criado.corpo.pedido.id)}?token=${encodeURIComponent(criado.corpo.pedido.tokenAcompanhamento)}`);
    assert.equal(acompanhado.status, 200);
    assert.equal(acompanhado.corpo.pedido.status, 'Recebido');
  });

  test('persiste catálogo e imagem compartilhada', async () => {
    const login = await chamar('/api/admin/login', {
      metodo: 'POST',
      dados: { usuario: 'admin@teste.local', senha: 'senha-segura' }
    });
    const token = login.corpo.token;

    const extra = await chamar('/api/admin/adicionais', {
      metodo: 'POST',
      token,
      dados: { nome: 'Molho da casa', preco: '2,50', ativo: true }
    });
    assert.equal(extra.status, 201);

    const webpMinimo = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([4, 0, 0, 0]),
      Buffer.from('WEBP')
    ]).toString('base64');
    const produto = await chamar('/api/admin/produtos', {
      metodo: 'POST',
      token,
      dados: {
        nome: 'Burger da API',
        categoria: 'Hambúrgueres',
        descricao: 'Produto criado durante o teste do backend.',
        preco: '28,50',
        imagem: `data:image/webp;base64,${webpMinimo}`,
        adicionaisIds: [extra.corpo.adicional.id],
        destaque: 'Novo',
        ativo: true
      }
    });
    assert.equal(produto.status, 201);
    assert.deepEqual(produto.corpo.produto.adicionaisIds, [extra.corpo.adicional.id]);

    const imagemNoDisco = join(pastaUploads, produto.corpo.produto.imagem.split('/').at(-1));
    assert.ok((await stat(imagemNoDisco)).size > 0);
  });

  test('autentica garçom e abre comanda vinculada automaticamente', async () => {
    const login = await chamar('/api/garcom/login', {
      metodo: 'POST',
      dados: { token: 'carlos-7f3a9d2c', pin: '1234' }
    });
    assert.equal(login.status, 200);
    assert.equal(login.corpo.garcom.nome, 'Carlos Silva');

    const aberta = await chamar('/api/garcom/comandas', {
      metodo: 'POST',
      token: login.corpo.token,
      dados: { mesaId: 1 }
    });
    assert.equal(aberta.status, 201);
    assert.equal(aberta.corpo.comanda.mesaId, 1);
    assert.equal(aberta.corpo.comanda.funcionarioId, login.corpo.garcom.id);
  });
}
