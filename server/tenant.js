const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '::1']);
const STATUS_ASSINATURA_BLOQUEADOS = new Set([
  'bloqueada',
  'cancelada',
  'inadimplente',
  'suspensa'
]);

function erroTenant(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

function normalizarDominio(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/^\./, '');
}

export function extrairHostname(cabecalhoHost) {
  const informado = String(cabecalhoHost ?? '').trim().toLowerCase();
  if (!informado || informado.includes(',') || /[\s/\\]/.test(informado)) {
    throw erroTenant('O domínio da requisição é inválido.', 400);
  }
  if (informado.startsWith('[')) {
    const fim = informado.indexOf(']');
    if (fim < 0) throw erroTenant('O domínio da requisição é inválido.', 400);
    return informado.slice(1, fim);
  }
  return informado.split(':')[0];
}

export function identificarEstabelecimentoPeloHost(hostname, {
  dominioPrincipal = '',
  tenantDesenvolvimento = ''
} = {}) {
  const host = extrairHostname(hostname);
  const slugDesenvolvimento = String(tenantDesenvolvimento ?? '').trim().toLowerCase();
  if (HOSTS_LOCAIS.has(host) && slugDesenvolvimento) {
    return { tipo: 'slug', valor: slugDesenvolvimento };
  }

  const dominioBase = normalizarDominio(dominioPrincipal);
  if (dominioBase && host.endsWith(`.${dominioBase}`)) {
    const slug = host.slice(0, -(dominioBase.length + 1));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw erroTenant('O subdomínio informado é inválido.', 404);
    }
    return { tipo: 'slug', valor: slug };
  }

  if (host === dominioBase) throw erroTenant('Informe o subdomínio do estabelecimento.', 404);
  return { tipo: 'dominio', valor: host };
}

export async function resolverEstabelecimento(banco, requisicao, opcoes = {}) {
  const identificador = identificarEstabelecimentoPeloHost(requisicao.headers.host, opcoes);
  const condicao = identificador.tipo === 'slug'
    ? 'LOWER(e.slug) = LOWER(?)'
    : 'LOWER(e.dominio_personalizado) = LOWER(?)';
  const [linhas] = await banco.execute(`
    SELECT e.id_estabelecimento, e.nome_fantasia, e.slug,
           e.dominio_personalizado, e.status, e.plano,
           e.status_assinatura, e.vencimento_assinatura_em
    FROM estabelecimentos AS e
    WHERE ${condicao}
    LIMIT 1
  `, [identificador.valor]);
  const estabelecimento = linhas[0];
  if (!estabelecimento) throw erroTenant('Estabelecimento não encontrado para este domínio.', 404);
  if (String(estabelecimento.status).toLowerCase() !== 'ativo') {
    throw erroTenant('Este estabelecimento está desativado.', 403);
  }

  const statusAssinatura = String(estabelecimento.status_assinatura ?? '').toLowerCase();
  if (STATUS_ASSINATURA_BLOQUEADOS.has(statusAssinatura)) {
    throw erroTenant('O acesso deste estabelecimento está temporariamente bloqueado.', 403);
  }
  const vencimento = estabelecimento.vencimento_assinatura_em
    ? new Date(estabelecimento.vencimento_assinatura_em)
    : null;
  if (vencimento && !Number.isNaN(vencimento.getTime()) && vencimento < new Date()) {
    throw erroTenant('A assinatura deste estabelecimento está vencida.', 403);
  }

  return {
    id: Number(estabelecimento.id_estabelecimento),
    nomeFantasia: estabelecimento.nome_fantasia,
    slug: estabelecimento.slug,
    dominioPersonalizado: estabelecimento.dominio_personalizado ?? null,
    plano: estabelecimento.plano,
    statusAssinatura: estabelecimento.status_assinatura
  };
}
