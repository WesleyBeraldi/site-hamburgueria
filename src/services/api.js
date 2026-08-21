const CHAVE_SESSAO_ADMIN = 'hamburgueria_admin_sessao';
const URL_API = import.meta.env.VITE_API_URL ?? '';

export class ErroApi extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function obterToken() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO_ADMIN))?.token ?? null;
  } catch {
    return null;
  }
}

async function requisicao(caminho, { metodo = 'GET', dados, autenticar = false } = {}) {
  const cabecalhos = { Accept: 'application/json' };
  if (dados !== undefined) cabecalhos['Content-Type'] = 'application/json';

  if (autenticar) {
    const token = obterToken();
    if (token) cabecalhos.Authorization = `Bearer ${token}`;
  }

  let resposta;
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 8000);
  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: dados === undefined ? undefined : JSON.stringify(dados),
      signal: controlador.signal
    });
  } catch {
    throw new ErroApi('Não foi possível conectar ao servidor. Verifique se o backend está ligado.', 0);
  } finally {
    clearTimeout(limite);
  }

  const conteudo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ErroApi(conteudo.erro || 'Não foi possível concluir a operação.', resposta.status);
  return conteudo;
}

export function buscarCatalogo() {
  return requisicao('/api/catalogo');
}

export function loginAdmin(usuario, senha) {
  return requisicao('/api/admin/login', { metodo: 'POST', dados: { usuario, senha } });
}

export function validarSessaoAdmin() {
  return requisicao('/api/admin/sessao', { autenticar: true });
}

export function logoutAdmin() {
  return requisicao('/api/admin/sessao', { metodo: 'DELETE', autenticar: true });
}

export function criarProdutoApi(dados) {
  return requisicao('/api/admin/produtos', { metodo: 'POST', dados, autenticar: true });
}

export function atualizarProdutoApi(id, dados) {
  return requisicao(`/api/admin/produtos/${id}`, { metodo: 'PUT', dados, autenticar: true });
}

export function alterarStatusProdutoApi(id, ativo) {
  return requisicao(`/api/admin/produtos/${id}/status`, { metodo: 'PATCH', dados: { ativo }, autenticar: true });
}

export function excluirProdutoApi(id) {
  return requisicao(`/api/admin/produtos/${id}`, { metodo: 'DELETE', autenticar: true });
}

export function criarAdicionalApi(dados) {
  return requisicao('/api/admin/adicionais', { metodo: 'POST', dados, autenticar: true });
}

export function atualizarAdicionalApi(id, dados) {
  return requisicao(`/api/admin/adicionais/${id}`, { metodo: 'PUT', dados, autenticar: true });
}

export function alterarStatusAdicionalApi(id, ativo) {
  return requisicao(`/api/admin/adicionais/${id}/status`, { metodo: 'PATCH', dados: { ativo }, autenticar: true });
}

export function excluirAdicionalApi(id) {
  return requisicao(`/api/admin/adicionais/${id}`, { metodo: 'DELETE', autenticar: true });
}
