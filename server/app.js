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
import { criarHashToken, criarTokenSessao, verificarSenha } from './security.js';

const LIMITE_CORPO = 2 * 1024 * 1024;
const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000;

class ErroHttp extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
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

function obterAdministrador(banco, requisicao) {
  const token = tokenBearer(requisicao);
  if (!token) throw new ErroHttp(401, 'Faça login para continuar.');

  banco.prepare('DELETE FROM sessoes_admin WHERE expira_em <= ?').run(new Date().toISOString());
  const sessao = banco.prepare(`
    SELECT a.id, a.nome, a.usuario, a.email
    FROM sessoes_admin s
    INNER JOIN administradores a ON a.id = s.administrador_id
    WHERE s.token_hash = ? AND s.expira_em > ? AND a.ativo = 1
  `).get(criarHashToken(token), new Date().toISOString());

  if (!sessao) throw new ErroHttp(401, 'Sua sessão expirou. Entre novamente.');
  return { id: Number(sessao.id), nome: sessao.nome, usuario: sessao.usuario, email: sessao.email, perfil: 'Administrador' };
}

function tratarErroDados(erro) {
  if (erro instanceof ErroHttp) throw erro;
  if (String(erro.code ?? '').startsWith('SQLITE_CONSTRAINT_UNIQUE')) {
    throw new ErroHttp(409, 'Já existe um cadastro com esse nome.');
  }
  if (String(erro.code ?? '').startsWith('SQLITE_CONSTRAINT')) {
    throw new ErroHttp(409, 'Este cadastro está sendo usado e não pode ser removido.');
  }
  throw new ErroHttp(400, erro.message || 'Não foi possível salvar os dados.');
}

function criarSessaoAdmin(banco, administradorId) {
  const token = criarTokenSessao();
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS).toISOString();
  banco.prepare(`
    INSERT INTO sessoes_admin (token_hash, administrador_id, expira_em) VALUES (?, ?, ?)
  `).run(criarHashToken(token), administradorId, expiraEm);
  return { token, expiraEm };
}

async function processarImagemNova(imagem, pastaUploads) {
  if (!String(imagem ?? '').startsWith('data:')) return null;
  return salvarImagemDataUrl(imagem, pastaUploads);
}

async function processarImagemAtualizada(imagem, imagemAnterior, pastaUploads) {
  if (String(imagem ?? '').startsWith('data:')) return salvarImagemDataUrl(imagem, pastaUploads);
  if (imagem === null || imagem === '') return null;
  return imagemAnterior ?? null;
}

async function rotaApi({ banco, pastaUploads, requisicao, resposta, caminho }) {
  if (requisicao.method === 'OPTIONS') {
    cabecalhosSeguranca(resposta);
    resposta.writeHead(204, { Allow: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' });
    resposta.end();
    return true;
  }

  if (requisicao.method === 'GET' && caminho === '/api/saude') {
    responderJson(resposta, 200, { status: 'ok', banco: 'conectado' });
    return true;
  }

  if (requisicao.method === 'GET' && caminho === '/api/catalogo') {
    resposta.setHeader('Cache-Control', 'no-store');
    responderJson(resposta, 200, listarCatalogo(banco));
    return true;
  }

  if (requisicao.method === 'POST' && caminho === '/api/admin/login') {
    const dados = await lerJson(requisicao);
    const identificador = String(dados.usuario ?? '').trim();
    const administrador = banco.prepare(`
      SELECT * FROM administradores
      WHERE (usuario = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) AND ativo = 1
    `).get(identificador, identificador);

    if (!administrador || !verificarSenha(String(dados.senha ?? ''), administrador.senha_hash)) {
      throw new ErroHttp(401, 'Usuário ou senha incorretos.');
    }

    const sessao = criarSessaoAdmin(banco, administrador.id);
    responderJson(resposta, 200, {
      token: sessao.token,
      expiraEm: sessao.expiraEm,
      admin: { id: Number(administrador.id), nome: administrador.nome, perfil: 'Administrador' }
    });
    return true;
  }

  if (requisicao.method === 'GET' && caminho === '/api/admin/sessao') {
    responderJson(resposta, 200, { admin: obterAdministrador(banco, requisicao) });
    return true;
  }

  if (requisicao.method === 'DELETE' && caminho === '/api/admin/sessao') {
    const token = tokenBearer(requisicao);
    if (token) banco.prepare('DELETE FROM sessoes_admin WHERE token_hash = ?').run(criarHashToken(token));
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }

  if (!caminho.startsWith('/api/admin/')) return false;
  obterAdministrador(banco, requisicao);

  if (requisicao.method === 'POST' && caminho === '/api/admin/produtos') {
    const dados = await lerJson(requisicao);
    let imagemUrl = null;
    try {
      imagemUrl = await processarImagemNova(dados.imagem, pastaUploads);
      const produto = criarProduto(banco, dados, imagemUrl);
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
    const produto = alternarStatusProduto(banco, Number(produtoStatus[1]), Boolean(dados.ativo));
    if (!produto) throw new ErroHttp(404, 'Produto não encontrado.');
    responderJson(resposta, 200, { produto });
    return true;
  }

  const produtoId = caminho.match(/^\/api\/admin\/produtos\/(\d+)$/);
  if (requisicao.method === 'PUT' && produtoId) {
    const id = Number(produtoId[1]);
    const anterior = buscarProduto(banco, id);
    if (!anterior) throw new ErroHttp(404, 'Produto não encontrado.');

    const dados = await lerJson(requisicao);
    let imagemUrl;
    let novaImagem = null;
    try {
      imagemUrl = await processarImagemAtualizada(dados.imagem, anterior.imagem, pastaUploads);
      if (imagemUrl !== anterior.imagem) novaImagem = imagemUrl;
      const produto = atualizarProduto(banco, id, dados, imagemUrl);
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
    const produto = buscarProduto(banco, id);
    if (!produto) throw new ErroHttp(404, 'Produto não encontrado.');
    excluirProduto(banco, id);
    await removerImagemLocal(produto.imagem, pastaUploads);
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }

  if (requisicao.method === 'POST' && caminho === '/api/admin/adicionais') {
    const dados = await lerJson(requisicao);
    try {
      responderJson(resposta, 201, { adicional: criarAdicional(banco, dados) });
    } catch (erro) {
      tratarErroDados(erro);
    }
    return true;
  }

  const adicionalStatus = caminho.match(/^\/api\/admin\/adicionais\/(\d+)\/status$/);
  if (requisicao.method === 'PATCH' && adicionalStatus) {
    const dados = await lerJson(requisicao);
    const adicional = alternarStatusAdicional(banco, Number(adicionalStatus[1]), Boolean(dados.ativo));
    if (!adicional) throw new ErroHttp(404, 'Adicional não encontrado.');
    responderJson(resposta, 200, { adicional });
    return true;
  }

  const adicionalId = caminho.match(/^\/api\/admin\/adicionais\/(\d+)$/);
  if (requisicao.method === 'PUT' && adicionalId) {
    const dados = await lerJson(requisicao);
    try {
      const adicional = atualizarAdicional(banco, Number(adicionalId[1]), dados);
      if (!adicional) throw new ErroHttp(404, 'Adicional não encontrado.');
      responderJson(resposta, 200, { adicional });
    } catch (erro) {
      tratarErroDados(erro);
    }
    return true;
  }

  if (requisicao.method === 'DELETE' && adicionalId) {
    if (!excluirAdicional(banco, Number(adicionalId[1]))) throw new ErroHttp(404, 'Adicional não encontrado.');
    responderJson(resposta, 200, { sucesso: true });
    return true;
  }

  return false;
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

export function criarServidor({ banco, pastaUploads, pastaDist = null }) {
  return createServer(async (requisicao, resposta) => {
    const url = new URL(requisicao.url, 'http://localhost');
    const caminho = decodeURIComponent(url.pathname);

    try {
      if (caminho.startsWith('/api/')) {
        const atendida = await rotaApi({ banco, pastaUploads, requisicao, resposta, caminho });
        if (!atendida) responderJson(resposta, 404, { erro: 'Rota da API não encontrada.' });
        return;
      }

      if (await servirFrontend({ requisicao, resposta, caminho, pastaUploads, pastaDist })) return;
      responderJson(resposta, 404, { erro: 'Página não encontrada.' });
    } catch (erro) {
      const status = erro instanceof ErroHttp ? erro.status : 500;
      if (status === 500) console.error(erro);
      responderJson(resposta, status, { erro: status === 500 ? 'Erro interno do servidor.' : erro.message });
    }
  });
}
