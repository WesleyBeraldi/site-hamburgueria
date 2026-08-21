const CHAVE_SESSAO_ADMIN = 'hamburgueria_admin_sessao';
const CHAVE_SESSAO_GARCOM = 'hamburgueria_garcom_sessao';
const URL_API = import.meta.env.VITE_API_URL ?? '';

export class ErroApi extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function obterToken(chave) {
  try {
    return JSON.parse(sessionStorage.getItem(chave))?.token ?? null;
  } catch {
    return null;
  }
}

async function requisicao(caminho, { metodo = 'GET', dados, autenticacao } = {}) {
  const cabecalhos = { Accept: 'application/json' };
  if (dados !== undefined) cabecalhos['Content-Type'] = 'application/json';

  if (autenticacao) {
    const chave = autenticacao === 'admin' ? CHAVE_SESSAO_ADMIN : CHAVE_SESSAO_GARCOM;
    const token = obterToken(chave);
    if (token) cabecalhos.Authorization = `Bearer ${token}`;
  }

  let resposta;
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 10000);
  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: dados === undefined ? undefined : JSON.stringify(dados),
      signal: controlador.signal
    });
  } catch {
    throw new ErroApi('Não foi possível conectar ao servidor. Verifique se o backend e o MySQL estão ligados.', 0);
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

export function buscarDadosPublicos() {
  return requisicao('/api/publico/inicial');
}

export function criarPedidoDeliveryApi(dados, itens) {
  return requisicao('/api/pedidos', { metodo: 'POST', dados: { ...dados, itens } });
}

export function acompanharPedidoApi(codigo, token) {
  return requisicao(`/api/pedidos/${encodeURIComponent(codigo)}?token=${encodeURIComponent(token)}`);
}

export function loginAdmin(usuario, senha) {
  return requisicao('/api/admin/login', { metodo: 'POST', dados: { usuario, senha } });
}

export function validarSessaoAdmin() {
  return requisicao('/api/admin/sessao', { autenticacao: 'admin' });
}

export function logoutAdmin() {
  return requisicao('/api/admin/sessao', { metodo: 'DELETE', autenticacao: 'admin' });
}

export function buscarDadosAdmin() {
  return requisicao('/api/admin/dados', { autenticacao: 'admin' });
}

export function criarProdutoApi(dados) {
  return requisicao('/api/admin/produtos', { metodo: 'POST', dados, autenticacao: 'admin' });
}

export function atualizarProdutoApi(id, dados) {
  return requisicao(`/api/admin/produtos/${id}`, { metodo: 'PUT', dados, autenticacao: 'admin' });
}

export function alterarStatusProdutoApi(id, ativo) {
  return requisicao(`/api/admin/produtos/${id}/status`, { metodo: 'PATCH', dados: { ativo }, autenticacao: 'admin' });
}

export function excluirProdutoApi(id) {
  return requisicao(`/api/admin/produtos/${id}`, { metodo: 'DELETE', autenticacao: 'admin' });
}

export function criarAdicionalApi(dados) {
  return requisicao('/api/admin/adicionais', { metodo: 'POST', dados, autenticacao: 'admin' });
}

export function atualizarAdicionalApi(id, dados) {
  return requisicao(`/api/admin/adicionais/${id}`, { metodo: 'PUT', dados, autenticacao: 'admin' });
}

export function alterarStatusAdicionalApi(id, ativo) {
  return requisicao(`/api/admin/adicionais/${id}/status`, { metodo: 'PATCH', dados: { ativo }, autenticacao: 'admin' });
}

export function excluirAdicionalApi(id) {
  return requisicao(`/api/admin/adicionais/${id}`, { metodo: 'DELETE', autenticacao: 'admin' });
}

export function criarPromocaoApi(dados) {
  return requisicao('/api/admin/promocoes', { metodo: 'POST', dados, autenticacao: 'admin' });
}

export function atualizarPromocaoApi(id, dados) {
  return requisicao(`/api/admin/promocoes/${id}`, { metodo: 'PUT', dados, autenticacao: 'admin' });
}

export function excluirPromocaoApi(id) {
  return requisicao(`/api/admin/promocoes/${id}`, { metodo: 'DELETE', autenticacao: 'admin' });
}

export function criarFuncionarioApi(dados) {
  return requisicao('/api/admin/funcionarios', { metodo: 'POST', dados, autenticacao: 'admin' });
}

export function atualizarFuncionarioApi(id, dados) {
  return requisicao(`/api/admin/funcionarios/${id}`, { metodo: 'PUT', dados, autenticacao: 'admin' });
}

export function alterarStatusFuncionarioApi(id, ativo) {
  return requisicao(`/api/admin/funcionarios/${id}/status`, { metodo: 'PATCH', dados: { ativo }, autenticacao: 'admin' });
}

export function atualizarStatusPedidoApi(id, status) {
  return requisicao(`/api/admin/pedidos/${encodeURIComponent(id)}/status`, {
    metodo: 'PATCH',
    dados: { status },
    autenticacao: 'admin'
  });
}

export function salvarConfiguracaoApi(dados) {
  return requisicao('/api/admin/configuracao', { metodo: 'PUT', dados, autenticacao: 'admin' });
}

export function loginGarcom(token, pin) {
  return requisicao('/api/garcom/login', { metodo: 'POST', dados: { token, pin } });
}

export function validarSessaoGarcom() {
  return requisicao('/api/garcom/sessao', { autenticacao: 'garcom' });
}

export function logoutGarcom() {
  return requisicao('/api/garcom/sessao', { metodo: 'DELETE', autenticacao: 'garcom' });
}

export function buscarDadosGarcom() {
  return requisicao('/api/garcom/dados', { autenticacao: 'garcom' });
}

export function abrirComandaApi(mesaId) {
  return requisicao('/api/garcom/comandas', { metodo: 'POST', dados: { mesaId }, autenticacao: 'garcom' });
}

export function adicionarItemComandaApi(comandaId, dados) {
  return requisicao(`/api/garcom/comandas/${comandaId}/itens`, { metodo: 'POST', dados, autenticacao: 'garcom' });
}

export function removerItemComandaApi(comandaId, itemId) {
  return requisicao(`/api/garcom/comandas/${comandaId}/itens/${itemId}`, { metodo: 'DELETE', autenticacao: 'garcom' });
}

export function enviarComandaApi(comandaId) {
  return requisicao(`/api/garcom/comandas/${comandaId}/enviar`, { metodo: 'POST', autenticacao: 'garcom' });
}

export function solicitarContaApi(comandaId) {
  return requisicao(`/api/garcom/comandas/${comandaId}/conta`, { metodo: 'POST', autenticacao: 'garcom' });
}

export function fecharComandaApi(comandaId, pagamento) {
  return requisicao(`/api/garcom/comandas/${comandaId}/fechar`, {
    metodo: 'POST',
    dados: { pagamento },
    autenticacao: 'garcom'
  });
}
