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

test('persiste pedidos, calcula preços no servidor e permite acompanhamento seguro', async () => {
  const adicionalInvalido = await chamar('/api/pedidos', {
    metodo: 'POST',
    dados: {
      nome: 'Cliente teste',
      telefone: '(11) 99999-0000',
      email: 'cliente@teste.local',
      rua: 'Rua de teste',
      numero: '10',
      bairro: 'Centro',
      pagamento: 'Pix',
      itens: [{ produtoId: 7, quantidade: 3, adicionaisIds: [1] }]
    }
  });
  assert.equal(adicionalInvalido.status, 400);

  const criacao = await chamar('/api/pedidos', {
    metodo: 'POST',
    dados: {
      nome: 'Cliente teste',
      telefone: '(11) 99999-0000',
      email: 'cliente@teste.local',
      rua: 'Rua de teste',
      numero: '10',
      bairro: 'Centro',
      complemento: 'Casa',
      referencia: 'Próximo à praça',
      observacao: 'Tocar a campainha',
      pagamento: 'Pix',
      itens: [{
        produtoId: 1,
        quantidade: 2,
        adicionaisIds: [1],
        preco: 0,
        observacao: 'Sem tomate'
      }]
    }
  });
  assert.equal(criacao.status, 201);
  assert.match(criacao.corpo.pedido.id, /^#PED\d+$/);
  assert.ok(criacao.corpo.tokenAcompanhamento);
  assert.equal(criacao.corpo.pedido.itens[0].preco, 39.9);
  assert.equal(criacao.corpo.pedido.subtotal, 79.8);
  assert.equal(criacao.corpo.pedido.taxaEntrega, 7.9);
  assert.equal(criacao.corpo.pedido.total, 87.7);
  assert.equal(banco.prepare('SELECT COUNT(*) AS total FROM pedidos').get().total, 1);

  const codigo = encodeURIComponent(criacao.corpo.pedido.id);
  const acessoInvalido = await chamar(`/api/pedidos/${codigo}/acompanhamento?token=invalido`);
  assert.equal(acessoInvalido.status, 404);

  const acompanhamento = await chamar(
    `/api/pedidos/${codigo}/acompanhamento?token=${encodeURIComponent(criacao.corpo.tokenAcompanhamento)}`
  );
  assert.equal(acompanhamento.status, 200);
  assert.equal(acompanhamento.corpo.pedido.status, 'Recebido');

  const listaSemLogin = await chamar('/api/admin/pedidos');
  assert.equal(listaSemLogin.status, 401);

  const login = await chamar('/api/admin/login', {
    metodo: 'POST',
    dados: { usuario: 'admin', senha: 'senha-segura' }
  });
  const token = login.corpo.token;
  const lista = await chamar('/api/admin/pedidos', { token });
  assert.equal(lista.status, 200);
  assert.equal(lista.corpo.pedidos[0].id, criacao.corpo.pedido.id);
  assert.equal(lista.corpo.pedidos[0].tokenAcompanhamento, undefined);

  const status = await chamar(`/api/admin/pedidos/${codigo}/status`, {
    metodo: 'PATCH',
    token,
    dados: { status: 'Em preparo' }
  });
  assert.equal(status.status, 200);
  assert.equal(status.corpo.pedido.status, 'Em preparo');

  const acompanhamentoAtualizado = await chamar(
    `/api/pedidos/${codigo}/acompanhamento?token=${encodeURIComponent(criacao.corpo.tokenAcompanhamento)}`
  );
  assert.equal(acompanhamentoAtualizado.corpo.pedido.status, 'Em preparo');

  const configuracaoSemLogin = await chamar('/api/admin/configuracao', {
    metodo: 'PUT',
    dados: {}
  });
  assert.equal(configuracaoSemLogin.status, 401);

  const configuracao = await chamar('/api/admin/configuracao', {
    metodo: 'PUT',
    token,
    dados: {
      nomeLoja: 'Hamburgueria Teste',
      telefone: '(11) 4000-0000',
      email: 'loja@teste.local',
      endereco: 'Rua da Loja, 1',
      taxaEntrega: 8.5,
      tempoEntrega: '30–40 min',
      pedidoMinimo: 25,
      lojaAberta: true
    }
  });
  assert.equal(configuracao.status, 200);
  assert.equal(configuracao.corpo.configuracao.taxaEntrega, 8.5);

  const catalogo = await chamar('/api/catalogo');
  assert.equal(catalogo.corpo.configuracao.nomeLoja, 'Hamburgueria Teste');
  assert.equal(catalogo.corpo.configuracao.pedidoMinimo, 25);
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
