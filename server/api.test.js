import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import { criarServidor } from './app.js';
import { abrirBanco } from './database.js';
import { aguardarServidor, fecharServidor } from './runtime.js';

let banco;
let servidor;
let pastaTemporaria;
let pastaUploads;
let urlBase;

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
  banco = abrirBanco({
    caminho: join(pastaTemporaria, 'teste.sqlite'),
    administrador: {
      usuario: 'admin',
      email: 'admin@teste.local',
      nome: 'Administrador de teste',
      senha: 'senha-segura'
    }
  });
  servidor = criarServidor({ banco, pastaUploads });
  await aguardarServidor(servidor, 0);
  urlBase = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await fecharServidor(servidor);
  banco.close();
  await rm(pastaTemporaria, { recursive: true, force: true });
});

test('expõe a saúde e o catálogo inicial publicamente', async () => {
  const saude = await chamar('/api/saude');
  assert.equal(saude.status, 200);
  assert.equal(saude.corpo.banco, 'conectado');

  const catalogo = await chamar('/api/catalogo');
  assert.equal(catalogo.status, 200);
  assert.equal(catalogo.corpo.produtos.length, 7);
  assert.equal(catalogo.corpo.adicionais.length, 6);
  assert.equal(catalogo.corpo.produtos[0].preco, '34,90');
});

test('protege as alterações e autentica o administrador no backend', async () => {
  const semSessao = await chamar('/api/admin/produtos', { metodo: 'POST', dados: {} });
  assert.equal(semSessao.status, 401);

  const invalido = await chamar('/api/admin/login', {
    metodo: 'POST',
    dados: { usuario: 'admin', senha: 'incorreta' }
  });
  assert.equal(invalido.status, 401);

  const login = await chamar('/api/admin/login', {
    metodo: 'POST',
    dados: { usuario: 'admin', senha: 'senha-segura' }
  });
  assert.equal(login.status, 200);
  assert.ok(login.corpo.token);

  const sessao = await chamar('/api/admin/sessao', { token: login.corpo.token });
  assert.equal(sessao.status, 200);
  assert.equal(sessao.corpo.admin.nome, 'Administrador de teste');
});

test('persiste adicionais, produtos, vínculos e imagens compartilhadas', async () => {
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
  assert.equal(extra.corpo.adicional.preco, 2.5);

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
  assert.equal(produto.corpo.produto.preco, '28,50');
  assert.deepEqual(produto.corpo.produto.adicionaisIds, [extra.corpo.adicional.id]);
  assert.match(produto.corpo.produto.imagem, /^\/uploads\/produto-/);

  const imagemNoDisco = join(pastaUploads, produto.corpo.produto.imagem.split('/').at(-1));
  const informacoesImagem = await stat(imagemNoDisco);
  assert.ok(informacoesImagem.size > 0);

  const catalogo = await chamar('/api/catalogo');
  assert.ok(catalogo.corpo.produtos.some((item) => item.id === produto.corpo.produto.id));

  const excluirExtra = await chamar(`/api/admin/adicionais/${extra.corpo.adicional.id}`, {
    metodo: 'DELETE',
    token
  });
  assert.equal(excluirExtra.status, 200);

  const catalogoSemExtra = await chamar('/api/catalogo');
  const produtoAtualizado = catalogoSemExtra.corpo.produtos.find((item) => item.id === produto.corpo.produto.id);
  assert.deepEqual(produtoAtualizado.adicionaisIds, []);

  const excluirProduto = await chamar(`/api/admin/produtos/${produto.corpo.produto.id}`, {
    metodo: 'DELETE',
    token
  });
  assert.equal(excluirProduto.status, 200);
  await assert.rejects(stat(imagemNoDisco), { code: 'ENOENT' });
});

test('não recria o catálogo quando todos os produtos forem removidos', async () => {
  const caminhoBanco = join(pastaTemporaria, 'catalogo-vazio.sqlite');
  const administrador = {
    usuario: 'admin-vazio',
    email: 'admin-vazio@teste.local',
    nome: 'Admin vazio',
    senha: 'senha-segura'
  };
  const primeiroBanco = abrirBanco({ caminho: caminhoBanco, administrador });
  primeiroBanco.prepare('DELETE FROM produtos').run();
  primeiroBanco.close();

  const bancoReaberto = abrirBanco({ caminho: caminhoBanco, administrador });
  const quantidade = bancoReaberto.prepare('SELECT COUNT(*) AS total FROM produtos').get().total;
  bancoReaberto.close();
  assert.equal(quantidade, 0);
});
