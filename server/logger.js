const CAMPOS_SENSIVEIS = /senha|password|token|authorization|cookie|secret/i;

function limpar(valor, profundidade = 0) {
  if (profundidade > 3) return '[limite]';
  if (valor == null || ['string', 'number', 'boolean'].includes(typeof valor)) return valor;
  if (Array.isArray(valor)) return valor.slice(0, 20).map((item) => limpar(item, profundidade + 1));
  if (typeof valor !== 'object') return String(valor);
  return Object.fromEntries(Object.entries(valor).map(([chave, conteudo]) => [
    chave,
    CAMPOS_SENSIVEIS.test(chave) ? '[redigido]' : limpar(conteudo, profundidade + 1)
  ]));
}

export function registrarErro(erro, contexto = {}) {
  const registro = {
    nivel: 'erro',
    horario: new Date().toISOString(),
    mensagem: 'Falha interna na operação.',
    tipo: erro?.name ?? 'Error',
    codigo: erro?.code ?? null,
    errno: erro?.errno ?? null,
    sqlState: erro?.sqlState ?? null,
    contexto: limpar(contexto)
  };
  console.error(JSON.stringify(registro));
}

export function registrarInfo(evento, contexto = {}) {
  console.info(JSON.stringify({
    nivel: 'info',
    horario: new Date().toISOString(),
    evento,
    contexto: limpar(contexto)
  }));
}
