import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve } from 'node:path';

import {
  alternarStatusAdicional,
  alternarStatusProduto,
  atualizarAdicional,
  atualizarProduto,
  buscarProduto,
  criarAdicional,
  criarProduto,
  excluirAdicional,
  excluirProduto,
  listarCatalogo
} from './catalog.js';
import { removerImagemLocal, salvarImagemDataUrl } from './imageStore.js';
import {
  acompanharPedido,
  adicionarItemComanda,
  abrirComanda,
  alternarStatusFuncionario,
  atualizarStatusPedido,
  buscarConfiguracao,
  buscarFuncionarioPorToken,
  criarPedidoDelivery,
  enviarComanda,
  excluirPromocao,
  fecharComanda,
  listarDadosAdmin,
  listarDadosGarcom,
  listarDadosPublicos,
  removerItemComanda,
  salvarConfiguracao,
  salvarFuncionario,
  salvarPromocao,
  solicitarConta
} from './operations.js';
import { criarHashToken, criarTokenSessao, verificarSenha } from './security.js';

const LIMITE_CORPO = 2 * 1024 * 1024;
const DURACAO_SESSAO_ADMIN_MS = 12 * 60 * 60 * 1000;
const DURACAO_SESSAO_GARCOM_MS = 8 * 60 * 60 * 1000;
const JANELA_TENTATIVAS_LOGIN_MS = 15 * 60 * 1000;

class ErroHttp extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function criarLimitadorTentativas({ limite = 5, janelaMs = JANELA_TENTATIVAS_LOGIN_MS } = {}) {
  const registros = new Map();

  function obter(chave, agora) {
    const registro = registros.get(chave);
    if (!registro || registro.inicio + janelaMs <= agora) {
      registros.delete(chave);
      return null;
    }
    return registro;
  }

  return {
    permite(chave, agora = Date.now()) {
      return (obter(chave, agora)?.tentativas ?? 0) < limite;
    },
    registrarFalha(chave, agora = Date.now()) {
      const registro = obter(chave, agora);
      registros.set(chave, registro
        ? { ...registro, tentativas: registro.tentativas + 1 }
        : { inicio: agora, tentativas: 1 });
    },
    limpar(chave) {
      registros.delete(chave);
    }
  };
}

function chavesTentativa(requisicao, tipo, identificador) {
  const endereco = requisicao.socket.remoteAddress || 'desconhecido';
  return [
    `${tipo}:ip:${endereco}`,
    `${tipo}:identificador:${criarHashToken(String(identificador ?? ''))}`
  ];
}

function validarLimiteLogin(limitador, chaves) {
  if (chaves.some((chave) => !limitador.permite(chave))) {
    throw new ErroHttp(429, 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.');
  }
}

function cabecalhosSeguranca(resposta) {
  resposta.setHeader('X-Content-Type-Options', 'nosniff');
  resposta.setHeader('X-Frame-Options', 'DENY');
  resposta.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function responderJson(resposta, status, dados) {
  cabecalhosSeguranca(resposta);
  resposta.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  resposta.end(JSON.stringify(dados));
}

async function lerJson(requisicao) {
  const tamanhoInformado = Number(requisicao.headers['content-length'] || 0);
  if (tamanhoInformado > LIMITE_CORPO) throw new ErroHttp(413, 'O conteúdo enviado é muito grande.');

  const partes = [];
  let tamanho = 0;
  for await (const parte of requisicao) {
    tamanho += parte.length;
    if (tamanho > LIMITE_CORPO) throw new ErroHttp(413, 'O conteúdo enviado é muito grande.');
    partes.push(parte);
  }

  if (!partes.length) return {};
  try {
    return JSON.parse(Buffer.concat(partes).toString('utf8'));
  } catch {
    throw new ErroHttp(400, 'O corpo da requisição deve ser um JSON válido.');
  }
}

function tokenBearer(requisicao) {
  const cabecalho = requisicao.headers.authorization || '';
  const correspondencia = cabecalho.match(/^Bearer\s+(.+)$/i);
  return correspondencia?.[1] ?? null;
}

async function obterAdministrador(banco, requisicao) {
  const token = tokenBearer(requisicao);
  if (!token) throw new ErroHttp(401, 'Faça login para continuar.');

  await banco.query('DELETE FROM sessoes_admin WHERE expira_em <= CURRENT_TIMESTAMP(3)');
  const [linhas] = await banco.execute(`
    SELECT a.id, a.nome, a.usuario, a.email
    FROM sessoes_admin s
    INNER JOIN administradores a ON a.id = s.administrador_id
    WHERE s.token_hash = ? AND s.expira_em > CURRENT_TIMESTAMP(3) AND a.ativo = 1
  `, [criarHashToken(token)]);
  const sessao = linhas[0];
  if (!sessao) throw new ErroHttp(401, 'Sua sessão expirou. Entre novamente.');
  return {
    id: Number(sessao.id),
    nome: sessao.nome,
    usuario: sessao.usuario,
    email: sessao.email,
    perfil: 'Administrador'
  };
}

async function obterGarcom(banco, requisicao) {
  const token = tokenBearer(requisicao);
  if (!token) throw new ErroHttp(401, 'Entre com o QR Code e o PIN para continuar.');

  await banco.query('DELETE FROM sessoes_garcom WHERE expira_em <= CURRENT_TIMESTAMP(3)');
  const [linhas] = await banco.execute(`
    SELECT f.id, f.nome, f.cargo
    FROM sessoes_garcom s
    INNER JOIN funcionarios f ON f.id = s.funcionario_id
    WHERE s.token_hash = ? AND s.expira_em > CURRENT_TIMESTAMP(3) AND f.ativo = 1
  `, [criarHashToken(token)]);
  const sessao = linhas[0];
  if (!sessao) throw new ErroHttp(401, 'Sua sessão expirou. Leia o QR Code novamente.');
  return {
    id: String(sessao.id),
    nome: sessao.nome,
    cargo: sessao.cargo
  };
}

function tratarErroDados(erro) {
  if (erro instanceof ErroHttp || erro.status) throw erro;
  if (erro.code === 'ER_DUP_ENTRY') throw new ErroHttp(409, 'Já existe um cadastro com esses dados.');
  if (['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2'].includes(erro.code)) {
    throw new ErroHttp(409, 'Este cadastro está vinculado a outro registro e não pode ser alterado.');
  }
  throw erro;
}

async function criarSessao(banco, tabela, campoId, id, duracaoMs) {
  const token = criarTokenSessao();
  const expiraEm = new Date(Date.now() + duracaoMs);
  await banco.execute(`
    INSERT INTO ${tabela} (token_hash, ${campoId}, expira_em) VALUES (?, ?, ?)
  `, [criarHashToken(token), id, expiraEm]);
  return { token, expiraEm: expiraEm.toISOString() };
}

async function processarImagemNova(imagem, pastaUploads) {
  if (!String(imagem ?? '').startsWith('data:')) return null;
  return salvarImagemDataUrl(imagem, pastaUploads);
}

async function processarImagemAtualizada(imagem, imagemAnterior, pastaUploads, prefixo = 'produto') {
  if (String(imagem ?? '').startsWith('data:')) return salvarImagemDataUrl(imagem, pastaUploads, prefixo);
  if (imagem === null || imagem === '') return null;
  return imagemAnterior ?? null;
}

async function rotaPublica({ banco, requisicao, resposta, caminho, url, limitadorPedidos }) {
  if (requisicao.method === 'GET' && caminho === '/api/saude') {
    await banco.query('SELECT 1');
    responderJson(resposta, 200, { status: 'ok', banco: 'mysql-conectado' });
    return true;
  }

  if (requisicao.method === 'GET' && caminho === '/api/catalogo') {
    resposta.setHeader('Cache-Control', 'no-store');
    responderJson(resposta, 200, await listarCatalogo(banco));
    return true;
  }

  if (requisicao.method === 'GET' && caminho === '/api/publico/inicial') {
    resposta.setHeader('Cache-Control', 'no-store');
    responderJson(resposta, 200, await listarDadosPublicos(banco));
    return true;
  }

  if (requisicao.method === 'POST' && caminho === '/api/pedidos') {
    const chaveLimite = `pedido:ip:${requisicao.socket.remoteAddress || 'desconhecido'}`;
    if (!limitadorPedidos.permite(chaveLimite)) {
      throw new ErroHttp(429, 'Muitas tentativas de pedido. Aguarde um minuto e tente novamente.');
    }
    limitadorPedidos.registrarFalha(chaveLimite);
    const dados = await lerJson(requisicao);
    try {
      const pedido = await criarPedidoDelivery(banco, dados);
      responderJson(resposta, 201, { pedido });
    } catch (erro) {
      tratarErroDados(erro);
    }
    return true;
  }

  const acompanhamento = caminho.match(/^\/api\/pedidos\/([^/]+)$/);
  if (requisicao.method === 'GET' && acompanhamento) {
    const pedido = await acompanharPedido(banco, acompanhamento[1], url.searchParams.get('token'));
    if (!pedido) throw new ErroHttp(404, 'Pedido não encontrado ou link de acompanhamento inválido.');
    responderJson(resposta, 200, { pedido });
    return true;
  }

  return false;
}

async function rotaAdmin({ banco, pastaUploads, requisicao, resposta, caminho, limitadorAdmin }) {
  if (requisicao.method === 'POST' && caminho === '/api/admin/login') {
    const dados = await lerJson(requisicao);
    const identificador = String(dados.usuario ?? '').trim();
    const chaves = chavesTentativa(requisicao, 'admin', identificador);
    validarLimiteLogin(limitadorAdmin, chaves);
    const [linhas] = await banco.execute(`
      SELECT * FROM administradores
      WHERE (LOWER(usuario) = LOWER(?) OR LOWER(email) = LOWER(?)) AND ativo = 1
      LIMIT 1
    `, [identificador, identificador]);
    const administrador = linhas[0];
    if (!administrador || !verificarSenha(String(dados.senha ?? ''), administrador.senha_hash)) {
      chaves.forEach((chave) => limitadorAdmin.registrarFalha(chave));
      throw new ErroHttp(401, 'Usuário ou senha incorretos.');
    }
    chaves.forEach((chave) => limitadorAdmin.limpar(chave));
    const sessao = await criarSessao(
      banco,
      'sessoes_admin',
      'administrador_id',
      administrador.id,
      DURACAO_SESSAO_ADMIN_MS
    );
    responderJson(resposta, 200, {
      token: sessao.token,
      expiraEm: sessao.expiraEm,
      admin: { id: Number(administrador.id), nome: administrador.nome, perfil: 'Administrador' }
    });
    return true;
  }

  if (requisicao.method === 'GET' && caminho === '/api/admin/sessao') {
    responderJson(resposta, 200, { admin: await obterAdministrador(banco, requisicao) });
    return true;
  }

  if (requisicao.method === 'DELETE' && caminho === '/api/admin/sessao') {
    const token = tokenBearer(requisicao);
    if (token) await banco.execute('DELETE FROM sessoes_admin WHERE token_hash = ?', [criarHashToken(token)]);
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }

  if (!caminho.startsWith('/api/admin/')) return false;
  await obterAdministrador(banco, requisicao);

  if (requisicao.method === 'GET' && caminho === '/api/admin/dados') {
    responderJson(resposta, 200, await listarDadosAdmin(banco));
    return true;
  }

  if (requisicao.method === 'POST' && caminho === '/api/admin/produtos') {
    const dados = await lerJson(requisicao);
    let imagemUrl = null;
    try {
      imagemUrl = await processarImagemNova(dados.imagem, pastaUploads);
      const produto = await criarProduto(banco, dados, imagemUrl);
      responderJson(resposta, 201, { produto });
    } catch (erro) {
      if (imagemUrl) await removerImagemLocal(imagemUrl, pastaUploads);
      tratarErroDados(erro);
    }
    return true;
  }

  const produtoStatus = caminho.match(/^\/api\/admin\/produtos\/(\d+)\/status$/);
  if (requisicao.method === 'PATCH' && produtoStatus) {
    const dados = await lerJson(requisicao);
    const produto = await alternarStatusProduto(banco, Number(produtoStatus[1]), Boolean(dados.ativo));
    if (!produto) throw new ErroHttp(404, 'Produto não encontrado.');
    responderJson(resposta, 200, { produto });
    return true;
  }

  const produtoId = caminho.match(/^\/api\/admin\/produtos\/(\d+)$/);
  if (requisicao.method === 'PUT' && produtoId) {
    const id = Number(produtoId[1]);
    const anterior = await buscarProduto(banco, id);
    if (!anterior) throw new ErroHttp(404, 'Produto não encontrado.');
    const dados = await lerJson(requisicao);
    let imagemUrl;
    let novaImagem = null;
    try {
      imagemUrl = await processarImagemAtualizada(dados.imagem, anterior.imagem, pastaUploads);
      if (imagemUrl !== anterior.imagem) novaImagem = imagemUrl;
      const produto = await atualizarProduto(banco, id, dados, imagemUrl);
      if (anterior.imagem && anterior.imagem !== imagemUrl) await removerImagemLocal(anterior.imagem, pastaUploads);
      responderJson(resposta, 200, { produto });
    } catch (erro) {
      if (novaImagem) await removerImagemLocal(novaImagem, pastaUploads);
      tratarErroDados(erro);
    }
    return true;
  }

  if (requisicao.method === 'DELETE' && produtoId) {
    const id = Number(produtoId[1]);
    const produto = await buscarProduto(banco, id);
    if (!produto) throw new ErroHttp(404, 'Produto não encontrado.');
    await excluirProduto(banco, id);
    await removerImagemLocal(produto.imagem, pastaUploads);
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }

  if (requisicao.method === 'POST' && caminho === '/api/admin/adicionais') {
    const dados = await lerJson(requisicao);
    try {
      responderJson(resposta, 201, { adicional: await criarAdicional(banco, dados) });
    } catch (erro) {
      tratarErroDados(erro);
    }
    return true;
  }

  const adicionalStatus = caminho.match(/^\/api\/admin\/adicionais\/(\d+)\/status$/);
  if (requisicao.method === 'PATCH' && adicionalStatus) {
    const dados = await lerJson(requisicao);
    const adicional = await alternarStatusAdicional(banco, Number(adicionalStatus[1]), Boolean(dados.ativo));
    if (!adicional) throw new ErroHttp(404, 'Adicional não encontrado.');
    responderJson(resposta, 200, { adicional });
    return true;
  }

  const adicionalId = caminho.match(/^\/api\/admin\/adicionais\/(\d+)$/);
  if (requisicao.method === 'PUT' && adicionalId) {
    const dados = await lerJson(requisicao);
    try {
      const adicional = await atualizarAdicional(banco, Number(adicionalId[1]), dados);
      if (!adicional) throw new ErroHttp(404, 'Adicional não encontrado.');
      responderJson(resposta, 200, { adicional });
    } catch (erro) {
      tratarErroDados(erro);
    }
    return true;
  }

  if (requisicao.method === 'DELETE' && adicionalId) {
    if (!await excluirAdicional(banco, Number(adicionalId[1]))) throw new ErroHttp(404, 'Adicional não encontrado.');
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }

  if (requisicao.method === 'POST' && caminho === '/api/admin/promocoes') {
    const promocao = await salvarPromocao(banco, await lerJson(requisicao));
    responderJson(resposta, 201, { promocao });
    return true;
  }
  const promocaoId = caminho.match(/^\/api\/admin\/promocoes\/(\d+)$/);
  if (requisicao.method === 'PUT' && promocaoId) {
    responderJson(resposta, 200, { promocao: await salvarPromocao(banco, await lerJson(requisicao), promocaoId[1]) });
    return true;
  }
  if (requisicao.method === 'DELETE' && promocaoId) {
    if (!await excluirPromocao(banco, promocaoId[1])) throw new ErroHttp(404, 'Promoção não encontrada.');
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }

  if (requisicao.method === 'POST' && caminho === '/api/admin/funcionarios') {
    responderJson(resposta, 201, { funcionario: await salvarFuncionario(banco, await lerJson(requisicao)) });
    return true;
  }
  const funcionarioStatus = caminho.match(/^\/api\/admin\/funcionarios\/(\d+)\/status$/);
  if (requisicao.method === 'PATCH' && funcionarioStatus) {
    const dados = await lerJson(requisicao);
    const funcionario = await alternarStatusFuncionario(banco, funcionarioStatus[1], Boolean(dados.ativo));
    if (!funcionario) throw new ErroHttp(404, 'Funcionário não encontrado.');
    responderJson(resposta, 200, { funcionario });
    return true;
  }
  const funcionarioId = caminho.match(/^\/api\/admin\/funcionarios\/(\d+)$/);
  if (requisicao.method === 'PUT' && funcionarioId) {
    responderJson(resposta, 200, { funcionario: await salvarFuncionario(banco, await lerJson(requisicao), funcionarioId[1]) });
    return true;
  }

  const pedidoStatus = caminho.match(/^\/api\/admin\/pedidos\/([^/]+)\/status$/);
  if (requisicao.method === 'PATCH' && pedidoStatus) {
    const dados = await lerJson(requisicao);
    const pedido = await atualizarStatusPedido(banco, pedidoStatus[1], dados.status);
    if (!pedido) throw new ErroHttp(404, 'Pedido não encontrado.');
    responderJson(resposta, 200, { pedido });
    return true;
  }

  if (requisicao.method === 'PUT' && caminho === '/api/admin/configuracao') {
    const anterior = await buscarConfiguracao(banco);
    const dados = await lerJson(requisicao);
    let logo;
    let novaLogo = null;
    try {
      logo = await processarImagemAtualizada(dados.logo, anterior.logo, pastaUploads, 'logo');
      if (logo !== anterior.logo) novaLogo = logo;
      const configuracao = await salvarConfiguracao(banco, { ...dados, logo });
      if (anterior.logo && anterior.logo !== logo) await removerImagemLocal(anterior.logo, pastaUploads);
      responderJson(resposta, 200, { configuracao });
    } catch (erro) {
      if (novaLogo) await removerImagemLocal(novaLogo, pastaUploads);
      tratarErroDados(erro);
    }
    return true;
  }

  return false;
}

async function rotaGarcom({ banco, requisicao, resposta, caminho, limitadorGarcom }) {
  if (requisicao.method === 'POST' && caminho === '/api/garcom/login') {
    const dados = await lerJson(requisicao);
    const tokenAcesso = String(dados.token ?? '');
    const chaves = chavesTentativa(requisicao, 'garcom', tokenAcesso);
    validarLimiteLogin(limitadorGarcom, chaves);
    const funcionario = await buscarFuncionarioPorToken(banco, tokenAcesso);
    if (!funcionario || !verificarSenha(String(dados.pin ?? ''), funcionario.pin_hash)) {
      chaves.forEach((chave) => limitadorGarcom.registrarFalha(chave));
      throw new ErroHttp(401, 'Não foi possível autenticar com os dados informados.');
    }
    chaves.forEach((chave) => limitadorGarcom.limpar(chave));
    const sessao = await criarSessao(
      banco,
      'sessoes_garcom',
      'funcionario_id',
      funcionario.id,
      DURACAO_SESSAO_GARCOM_MS
    );
    responderJson(resposta, 200, {
      token: sessao.token,
      expiraEm: sessao.expiraEm,
      garcom: { id: String(funcionario.id), nome: funcionario.nome, cargo: funcionario.cargo }
    });
    return true;
  }

  if (requisicao.method === 'GET' && caminho === '/api/garcom/sessao') {
    responderJson(resposta, 200, { garcom: await obterGarcom(banco, requisicao) });
    return true;
  }

  if (requisicao.method === 'DELETE' && caminho === '/api/garcom/sessao') {
    const token = tokenBearer(requisicao);
    if (token) await banco.execute('DELETE FROM sessoes_garcom WHERE token_hash = ?', [criarHashToken(token)]);
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }

  if (!caminho.startsWith('/api/garcom/')) return false;
  const garcom = await obterGarcom(banco, requisicao);

  if (requisicao.method === 'GET' && caminho === '/api/garcom/dados') {
    responderJson(resposta, 200, await listarDadosGarcom(banco, garcom.id));
    return true;
  }

  if (requisicao.method === 'POST' && caminho === '/api/garcom/comandas') {
    const dados = await lerJson(requisicao);
    responderJson(resposta, 201, { comanda: await abrirComanda(banco, Number(dados.mesaId), garcom.id) });
    return true;
  }

  const itemComanda = caminho.match(/^\/api\/garcom\/comandas\/(\d+)\/itens\/(\d+)$/);
  if (requisicao.method === 'DELETE' && itemComanda) {
    await removerItemComanda(banco, itemComanda[1], itemComanda[2], garcom.id);
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }
  const itensComanda = caminho.match(/^\/api\/garcom\/comandas\/(\d+)\/itens$/);
  if (requisicao.method === 'POST' && itensComanda) {
    await adicionarItemComanda(banco, itensComanda[1], garcom.id, await lerJson(requisicao));
    responderJson(resposta, 201, { sucesso: true });
    return true;
  }
  const enviar = caminho.match(/^\/api\/garcom\/comandas\/(\d+)\/enviar$/);
  if (requisicao.method === 'POST' && enviar) {
    await enviarComanda(banco, enviar[1], garcom.id);
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }
  const conta = caminho.match(/^\/api\/garcom\/comandas\/(\d+)\/conta$/);
  if (requisicao.method === 'POST' && conta) {
    await solicitarConta(banco, conta[1], garcom.id);
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }
  const fechar = caminho.match(/^\/api\/garcom\/comandas\/(\d+)\/fechar$/);
  if (requisicao.method === 'POST' && fechar) {
    const dados = await lerJson(requisicao);
    await fecharComanda(banco, fechar[1], garcom.id, String(dados.pagamento ?? ''));
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }

  return false;
}

async function rotaApi(parametros) {
  const { requisicao, resposta } = parametros;
  if (requisicao.method === 'OPTIONS') {
    cabecalhosSeguranca(resposta);
    resposta.writeHead(204, { Allow: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' });
    resposta.end();
    return true;
  }
  return await rotaPublica(parametros)
    || await rotaAdmin(parametros)
    || await rotaGarcom(parametros);
}

const TIPOS_CONTEUDO = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

async function enviarArquivo(resposta, caminhoArquivo, cacheControl) {
  try {
    const informacoes = await stat(caminhoArquivo);
    if (!informacoes.isFile()) return false;
    const conteudo = await readFile(caminhoArquivo);
    cabecalhosSeguranca(resposta);
    resposta.writeHead(200, {
      'Content-Type': TIPOS_CONTEUDO[extname(caminhoArquivo).toLowerCase()] || 'application/octet-stream',
      'Content-Length': conteudo.length,
      'Cache-Control': cacheControl
    });
    resposta.end(conteudo);
    return true;
  } catch (erro) {
    if (erro.code === 'ENOENT') return false;
    throw erro;
  }
}

async function servirFrontend({ requisicao, resposta, caminho, pastaUploads, pastaDist }) {
  if (!['GET', 'HEAD'].includes(requisicao.method)) return false;
  if (caminho.startsWith('/uploads/')) {
    const nomeArquivo = basename(caminho);
    if (caminho !== `/uploads/${nomeArquivo}`) return false;
    return enviarArquivo(resposta, resolve(pastaUploads, nomeArquivo), 'public, max-age=31536000, immutable');
  }
  if (!pastaDist) return false;
  const caminhoRelativo = caminho === '/' ? 'index.html' : caminho.replace(/^\//, '');
  const arquivo = resolve(pastaDist, caminhoRelativo);
  const relativoAoDist = relative(resolve(pastaDist), arquivo);
  const estaDentroDoDist = relativoAoDist && !relativoAoDist.startsWith('..') && !isAbsolute(relativoAoDist);
  if (estaDentroDoDist && await enviarArquivo(resposta, arquivo, 'public, max-age=3600')) return true;
  return enviarArquivo(resposta, resolve(pastaDist, 'index.html'), 'no-cache');
}

export function criarServidor({ banco, pastaUploads, pastaDist = null, limitePedidosPorMinuto = 30 }) {
  const limitadorAdmin = criarLimitadorTentativas({ limite: 10 });
  const limitadorGarcom = criarLimitadorTentativas({ limite: 5 });
  const limitadorPedidos = criarLimitadorTentativas({ limite: limitePedidosPorMinuto, janelaMs: 60 * 1000 });
  return createServer(async (requisicao, resposta) => {
    try {
      const url = new URL(requisicao.url, 'http://localhost');
      let caminho;
      try {
        caminho = decodeURIComponent(url.pathname);
      } catch {
        throw new ErroHttp(400, 'A URL informada é inválida.');
      }
      if (caminho.startsWith('/api/')) {
        const atendida = await rotaApi({
          banco,
          pastaUploads,
          requisicao,
          resposta,
          caminho,
          url,
          limitadorAdmin,
          limitadorGarcom,
          limitadorPedidos
        });
        if (!atendida) responderJson(resposta, 404, { erro: 'Rota da API não encontrada.' });
        return;
      }
      if (await servirFrontend({ requisicao, resposta, caminho, pastaUploads, pastaDist })) return;
      responderJson(resposta, 404, { erro: 'Página não encontrada.' });
    } catch (erro) {
      const erroDuplicado = erro.code === 'ER_DUP_ENTRY';
      const erroRelacionamento = ['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2'].includes(erro.code);
      const status = Number(erro.status) || (erroDuplicado || erroRelacionamento ? 409 : 500);
      if (status >= 500) console.error(erro);
      const mensagem = erroDuplicado
        ? 'Já existe um cadastro com esses dados.'
        : erroRelacionamento
          ? 'Este cadastro está vinculado a outro registro.'
          : erro.message;
      responderJson(resposta, status, { erro: status >= 500 ? 'Erro interno do servidor.' : mensagem });
    }
  });
}
