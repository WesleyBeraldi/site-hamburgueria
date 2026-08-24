import { randomUUID } from 'node:crypto';

import { formatarPreco, listarCatalogo, precoParaCentavos } from './catalog.js';
import { executarTransacao } from './database.js';
import { criarHashSenha, criarHashToken, verificarSenha } from './security.js';

const PAGAMENTOS = new Set(['Pix', 'Cartão na entrega', 'Cartão na retirada', 'Cartão', 'Dinheiro', 'A definir']);
const PAGAMENTOS_DELIVERY = new Set(['Pix', 'Cartão na entrega', 'Dinheiro']);
const PAGAMENTOS_RETIRADA = new Set(['Pix', 'Cartão na retirada', 'Dinheiro']);
const STATUS_DELIVERY = new Set(['Recebido', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Cancelado']);
const STATUS_RETIRADA = new Set(['Recebido', 'Em preparo', 'Pronto', 'Retirado', 'Cancelado']);
const STATUS_MESA = new Set(['Recebido', 'Em preparo', 'Pronto', 'Entregue na mesa', 'Cancelado']);
const PAGAMENTO_AGUARDANDO = 'Aguardando pagamento';
const PAGAMENTO_ENTREGA = 'Pagamento na entrega';
const PAGAMENTO_PAGO = 'Pago';
const PAGAMENTO_CANCELADO = 'Cancelado';
const PAGAMENTO_ESTORNADO = 'Estornado';
const MAX_LINHAS_PEDIDO = 100;
const MAX_UNIDADES_PEDIDO = 500;
const MAX_ADICIONAIS_POR_ITEM = 50;
const MAX_TOTAL_CENTAVOS = 4_294_967_295;
const STATUS_TERMINAIS = new Set(['Entregue', 'Entregue na mesa', 'Retirado', 'Cancelado']);

function erroDominio(mensagem, status = 400) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

function texto(valor, limite = 255) {
  return String(valor ?? '').trim().slice(0, limite);
}

function dataIso(valor) {
  if (!valor) return null;
  return new Date(valor).toISOString();
}

function dataOpcional(valor, campo) {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) throw erroDominio(`Informe uma data válida para ${campo}.`);
  return data;
}

function promocaoDisponivel(linha, agora = new Date()) {
  if (!linha || !linha.ativo) return false;
  const inicio = linha.inicio_em ? new Date(linha.inicio_em) : null;
  const fim = linha.fim_em ? new Date(linha.fim_em) : null;
  return (!inicio || inicio <= agora) && (!fim || fim >= agora);
}

function normalizarStatusPagamento(status, forma) {
  if (status === 'Pendente') return forma === 'Pix' ? PAGAMENTO_AGUARDANDO : PAGAMENTO_ENTREGA;
  return status || (forma === 'Pix' ? PAGAMENTO_AGUARDANDO : PAGAMENTO_ENTREGA);
}

function horaPtBr(valor) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(valor));
}

function codigoPedido(id) {
  return `#PED${String(id).padStart(4, '0')}`;
}

function idPedidoPeloCodigo(codigo) {
  const correspondencia = String(codigo ?? '').match(/PED(\d+)/i);
  return correspondencia ? Number(correspondencia[1]) : null;
}

function normalizarToken(nome) {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'funcionario';
  return `${base}-${randomUUID().replaceAll('-', '').slice(0, 12)}`;
}

function normalizarBairro(valor) {
  return texto(valor, 120)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function lerAreasEntrega(valor) {
  if (!valor) return [];
  try {
    const areas = typeof valor === 'string' ? JSON.parse(valor) : valor;
    return Array.isArray(areas) ? areas : [];
  } catch {
    return [];
  }
}

function validarUrlOpcional(valor, campo) {
  const url = texto(valor, 500);
  if (!url) return '';
  try {
    const analisada = new URL(url);
    if (!['http:', 'https:'].includes(analisada.protocol)) throw new Error();
  } catch {
    throw erroDominio(`Informe uma URL válida para ${campo}.`);
  }
  return url;
}

function campoPix(id, valor) {
  const conteudo = String(valor ?? '');
  return `${id}${String(conteudo.length).padStart(2, '0')}${conteudo}`;
}

function textoPix(valor, limite) {
  return texto(valor, limite)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, '')
    .toUpperCase()
    .slice(0, limite);
}

function crc16Pix(valor) {
  let crc = 0xffff;
  for (const caractere of Buffer.from(valor, 'utf8')) {
    crc ^= caractere << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function gerarPixCopiaCola({ chave, beneficiario, cidade, valorCentavos, txid }) {
  if (!chave || !beneficiario || !cidade) return null;
  const conta = campoPix('00', 'BR.GOV.BCB.PIX') + campoPix('01', chave);
  const valor = (Number(valorCentavos) / 100).toFixed(2);
  const dadosAdicionais = campoPix('05', textoPix(txid, 25) || '***');
  const semCrc = [
    campoPix('00', '01'),
    campoPix('01', '11'),
    campoPix('26', conta),
    campoPix('52', '0000'),
    campoPix('53', '986'),
    campoPix('54', valor),
    campoPix('58', 'BR'),
    campoPix('59', textoPix(beneficiario, 25)),
    campoPix('60', textoPix(cidade, 15)),
    campoPix('62', dadosAdicionais),
    '6304'
  ].join('');
  return `${semCrc}${crc16Pix(semCrc)}`;
}

async function registrarAuditoria(conexao, administradorId, acao, entidade, entidadeId, detalhes = null) {
  await conexao.execute(`
    INSERT INTO auditoria_admin (administrador_id, acao, entidade, entidade_id, detalhes_json)
    VALUES (?, ?, ?, ?, ?)
  `, [administradorId ?? null, acao, entidade, entidadeId == null ? null : String(entidadeId), detalhes ? JSON.stringify(detalhes) : null]);
}

function mapearConfiguracao(linha) {
  return {
    nomeLoja: linha.nome_loja,
    telefone: linha.telefone,
    email: linha.email,
    endereco: linha.endereco,
    taxaEntrega: Number(linha.taxa_entrega_centavos) / 100,
    tempoEntrega: linha.tempo_entrega,
    pedidoMinimo: Number(linha.pedido_minimo_centavos) / 100,
    lojaAberta: Boolean(linha.loja_aberta),
    pixChave: linha.pix_chave ?? '',
    pixBeneficiario: linha.pix_beneficiario ?? '',
    pixCidade: linha.pix_cidade ?? '',
    logo: linha.logo_url ?? '',
    whatsapp: linha.whatsapp ?? '',
    horarioFuncionamento: linha.horario_funcionamento ?? '',
    instagramUrl: linha.instagram_url ?? '',
    facebookUrl: linha.facebook_url ?? '',
    entregaAtiva: Boolean(linha.entrega_ativa),
    retiradaAtiva: Boolean(linha.retirada_ativa),
    aceitaCartao: Boolean(linha.aceita_cartao),
    aceitaDinheiro: Boolean(linha.aceita_dinheiro),
    areasEntrega: lerAreasEntrega(linha.areas_entrega_json).map((area) => ({
      bairro: area.bairro,
      taxa: Number(area.taxaCentavos) / 100
    }))
  };
}

export async function buscarConfiguracao(banco) {
  const [linhas] = await banco.query('SELECT * FROM configuracoes WHERE id = 1');
  if (!linhas[0]) throw erroDominio('As configurações da loja ainda não foram cadastradas.', 500);
  return mapearConfiguracao(linhas[0]);
}

export async function salvarConfiguracao(banco, dados) {
  const nomeLoja = texto(dados.nomeLoja, 160);
  const telefone = texto(dados.telefone, 40);
  const email = texto(dados.email, 160);
  const endereco = texto(dados.endereco, 255);
  const tempoEntrega = texto(dados.tempoEntrega, 60);
  const pixChave = texto(dados.pixChave, 180);
  const pixBeneficiario = texto(dados.pixBeneficiario, 160);
  const pixCidade = texto(dados.pixCidade, 60);
  const logo = texto(dados.logo, 500);
  const whatsapp = texto(dados.whatsapp, 40);
  const horarioFuncionamento = texto(dados.horarioFuncionamento, 2000);
  const instagramUrl = validarUrlOpcional(dados.instagramUrl, 'o Instagram');
  const facebookUrl = validarUrlOpcional(dados.facebookUrl, 'o Facebook');
  const taxaEntregaCentavos = precoParaCentavos(dados.taxaEntrega);
  const pedidoMinimoCentavos = precoParaCentavos(dados.pedidoMinimo);
  const aceitaCartao = dados.aceitaCartao !== false;
  const aceitaDinheiro = dados.aceitaDinheiro !== false;
  const areasRecebidas = Array.isArray(dados.areasEntrega) ? dados.areasEntrega : [];
  const bairros = new Set();
  const areasEntrega = areasRecebidas.map((area) => {
    const bairro = texto(area?.bairro, 120);
    const taxaCentavos = precoParaCentavos(area?.taxa);
    const bairroNormalizado = normalizarBairro(bairro);
    if (!bairro || !Number.isInteger(taxaCentavos) || taxaCentavos < 0) {
      throw erroDominio('Informe bairro e taxa válidos em todas as áreas de entrega.');
    }
    if (bairros.has(bairroNormalizado)) throw erroDominio(`O bairro ${bairro} está repetido nas áreas de entrega.`);
    bairros.add(bairroNormalizado);
    return { bairro, taxaCentavos };
  });

  if (!nomeLoja || !telefone || !email || !endereco || !tempoEntrega || !horarioFuncionamento) {
    throw erroDominio('Preencha todos os dados da lanchonete.');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw erroDominio('Informe um e-mail válido para a loja.');
  if (pixChave && (!pixBeneficiario || !pixCidade)) {
    throw erroDominio('Informe o beneficiário e a cidade da chave Pix ou deixe a configuração Pix vazia.');
  }
  if (pixCidade && !pixChave) {
    throw erroDominio('Cadastre a chave Pix antes de informar a cidade do recebedor.');
  }
  if (!Number.isInteger(taxaEntregaCentavos) || taxaEntregaCentavos < 0
      || !Number.isInteger(pedidoMinimoCentavos) || pedidoMinimoCentavos < 0) {
    throw erroDominio('Informe valores válidos para entrega e pedido mínimo.');
  }
  if (!pixChave && !aceitaCartao && !aceitaDinheiro) {
    throw erroDominio('Habilite ao menos uma forma de pagamento.');
  }

  await banco.execute(`
    INSERT INTO configuracoes
      (id, nome_loja, telefone, email, endereco, taxa_entrega_centavos,
       tempo_entrega, pedido_minimo_centavos, loja_aberta, pix_chave, pix_beneficiario, pix_cidade,
       logo_url, whatsapp, horario_funcionamento, instagram_url, facebook_url,
       entrega_ativa, retirada_ativa, aceita_cartao, aceita_dinheiro, areas_entrega_json)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nome_loja = VALUES(nome_loja), telefone = VALUES(telefone), email = VALUES(email),
      endereco = VALUES(endereco), taxa_entrega_centavos = VALUES(taxa_entrega_centavos),
      tempo_entrega = VALUES(tempo_entrega), pedido_minimo_centavos = VALUES(pedido_minimo_centavos),
      loja_aberta = VALUES(loja_aberta), pix_chave = VALUES(pix_chave),
      pix_beneficiario = VALUES(pix_beneficiario), pix_cidade = VALUES(pix_cidade), logo_url = VALUES(logo_url),
      whatsapp = VALUES(whatsapp), horario_funcionamento = VALUES(horario_funcionamento),
      instagram_url = VALUES(instagram_url), facebook_url = VALUES(facebook_url),
      entrega_ativa = VALUES(entrega_ativa), retirada_ativa = VALUES(retirada_ativa), aceita_cartao = VALUES(aceita_cartao),
      aceita_dinheiro = VALUES(aceita_dinheiro), areas_entrega_json = VALUES(areas_entrega_json)
  `, [
    nomeLoja,
    telefone,
    email,
    endereco,
    taxaEntregaCentavos,
    tempoEntrega,
    pedidoMinimoCentavos,
    dados.lojaAberta === false ? 0 : 1,
    pixChave || null,
    pixChave ? pixBeneficiario : null,
    pixChave ? (pixCidade || null) : null,
    logo || null,
    whatsapp || null,
    horarioFuncionamento,
    instagramUrl || null,
    facebookUrl || null,
    dados.entregaAtiva === false ? 0 : 1,
    dados.retiradaAtiva === false ? 0 : 1,
    aceitaCartao ? 1 : 0,
    aceitaDinheiro ? 1 : 0,
    areasEntrega.length ? JSON.stringify(areasEntrega) : null
  ]);
  return buscarConfiguracao(banco);
}

function mapearPromocao(linha) {
  return {
    id: Number(linha.id),
    produtoId: linha.produto_id ? Number(linha.produto_id) : null,
    nome: linha.nome,
    categoria: linha.categoria,
    descricao: linha.descricao,
    precoAntigo: formatarPreco(linha.preco_anterior_centavos),
    preco: formatarPreco(linha.preco_centavos),
    imagem: linha.imagem_url || linha.imagem_produto || null,
    destaque: linha.destaque ?? '',
    tipo: linha.tipo ?? '',
    ativo: Boolean(linha.ativo),
    disponivel: promocaoDisponivel(linha),
    inicioEm: dataIso(linha.inicio_em),
    fimEm: dataIso(linha.fim_em)
  };
}

export async function listarPromocoes(banco, { somenteAtivas = false } = {}) {
  const [linhas] = await banco.query(`
    SELECT pr.*, p.imagem_url AS imagem_produto
    FROM promocoes pr
    LEFT JOIN produtos p ON p.id = pr.produto_id
    ${somenteAtivas ? `WHERE pr.ativo = 1
      AND (pr.inicio_em IS NULL OR pr.inicio_em <= CURRENT_TIMESTAMP)
      AND (pr.fim_em IS NULL OR pr.fim_em >= CURRENT_TIMESTAMP)` : ''}
    ORDER BY pr.id
  `);
  return linhas.map(mapearPromocao);
}

async function validarPromocao(banco, dados) {
  const nome = texto(dados.nome, 160);
  const descricao = texto(dados.descricao, 2000);
  const precoAnteriorCentavos = precoParaCentavos(dados.precoAntigo || 0);
  const precoCentavos = precoParaCentavos(dados.preco);
  const inicioEm = dataOpcional(dados.inicioEm, 'o início da promoção');
  const fimEm = dataOpcional(dados.fimEm, 'o fim da promoção');
  if (!nome || !descricao) throw erroDominio('Preencha nome e descrição da promoção.');
  if (!Number.isInteger(precoAnteriorCentavos) || precoAnteriorCentavos < 0
      || !Number.isInteger(precoCentavos) || precoCentavos <= 0) {
    throw erroDominio('Informe preços válidos para a promoção.');
  }
  if (inicioEm && fimEm && inicioEm >= fimEm) {
    throw erroDominio('O fim da promoção deve ser posterior ao início.');
  }

  const produtoId = Number(dados.produtoId) || null;
  if (!produtoId) throw erroDominio('Vincule a promoção a um produto do cardápio.');
  const [produtos] = await banco.execute(`
    SELECT p.id, c.nome AS categoria
    FROM produtos p
    INNER JOIN categorias c ON c.id = p.categoria_id
    WHERE p.id = ? AND p.ativo = 1 AND c.ativo = 1
  `, [produtoId]);
  if (!produtos[0]) throw erroDominio('O produto vinculado à promoção não está disponível.', 409);

  return {
    produtoId,
    nome,
    categoria: produtos[0].categoria,
    descricao,
    precoAnteriorCentavos,
    precoCentavos,
    imagem: texto(dados.imagem, 500) || null,
    destaque: texto(dados.destaque, 100) || null,
    tipo: texto(dados.tipo, 100) || null,
    ativo: dados.ativo === false ? 0 : 1,
    inicioEm,
    fimEm
  };
}

export async function salvarPromocao(banco, dados, id = null) {
  const promocao = await validarPromocao(banco, dados);
  let promocaoId = Number(id) || null;
  if (promocaoId) {
    const [resultado] = await banco.execute(`
      UPDATE promocoes
      SET produto_id = ?, nome = ?, categoria = ?, descricao = ?, preco_anterior_centavos = ?,
          preco_centavos = ?, imagem_url = ?, destaque = ?, tipo = ?, ativo = ?, inicio_em = ?, fim_em = ?
      WHERE id = ?
    `, [
      promocao.produtoId, promocao.nome, promocao.categoria, promocao.descricao,
      promocao.precoAnteriorCentavos, promocao.precoCentavos, promocao.imagem,
      promocao.destaque, promocao.tipo, promocao.ativo, promocao.inicioEm, promocao.fimEm, promocaoId
    ]);
    if (!resultado.affectedRows) throw erroDominio('Promoção não encontrada.', 404);
  } else {
    const [resultado] = await banco.execute(`
      INSERT INTO promocoes
        (produto_id, nome, categoria, descricao, preco_anterior_centavos,
         preco_centavos, imagem_url, destaque, tipo, ativo, inicio_em, fim_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      promocao.produtoId, promocao.nome, promocao.categoria, promocao.descricao,
      promocao.precoAnteriorCentavos, promocao.precoCentavos, promocao.imagem,
      promocao.destaque, promocao.tipo, promocao.ativo, promocao.inicioEm, promocao.fimEm
    ]);
    promocaoId = Number(resultado.insertId);
  }
  const promocoes = await listarPromocoes(banco);
  return promocoes.find((item) => item.id === promocaoId);
}

export async function excluirPromocao(banco, id) {
  const [resultado] = await banco.execute('DELETE FROM promocoes WHERE id = ?', [id]);
  return resultado.affectedRows > 0;
}

function mapearFuncionario(linha) {
  return {
    id: String(linha.id),
    nome: linha.nome,
    cargo: linha.cargo,
    pin: '',
    status: linha.ativo ? 'Ativo' : 'Inativo',
    token: linha.token_acesso,
    vendas: Number(linha.vendas ?? 0),
    comandas: Number(linha.comandas ?? 0)
  };
}

export async function listarFuncionarios(banco, { somenteAtivos = false } = {}) {
  const [linhas] = await banco.query(`
    SELECT f.*,
      COUNT(DISTINCT CASE WHEN c.status = 'Encerrada' THEN c.id END) AS comandas,
      COUNT(DISTINCT CASE WHEN p.status IN ('Entregue', 'Entregue na mesa') THEN p.id END) AS vendas
    FROM funcionarios f
    LEFT JOIN comandas c ON c.funcionario_id = f.id
    LEFT JOIN pedidos p ON p.funcionario_id = f.id
    ${somenteAtivos ? 'WHERE f.ativo = 1' : ''}
    GROUP BY f.id
    ORDER BY f.nome
  `);
  return linhas.map(mapearFuncionario);
}

export async function buscarFuncionarioPorToken(banco, token) {
  const [linhas] = await banco.execute('SELECT * FROM funcionarios WHERE token_acesso = ? AND ativo = 1', [token]);
  return linhas[0] ?? null;
}

export async function salvarFuncionario(banco, dados, id = null) {
  const nome = texto(dados.nome, 160);
  const cargo = texto(dados.cargo, 80);
  const pin = texto(dados.pin, 6);
  if (!nome || !cargo || !/^\d{4,6}$/.test(pin)) {
    throw erroDominio('Informe o nome, o cargo e um PIN numérico de 4 a 6 dígitos.');
  }

  let funcionarioId = Number(id) || null;
  if (funcionarioId) {
    const [resultado] = await banco.execute(`
      UPDATE funcionarios SET nome = ?, cargo = ?, pin_hash = ? WHERE id = ?
    `, [nome, cargo, criarHashSenha(pin), funcionarioId]);
    if (!resultado.affectedRows) throw erroDominio('Funcionário não encontrado.', 404);
    await banco.execute('DELETE FROM sessoes_garcom WHERE funcionario_id = ?', [funcionarioId]);
  } else {
    const [resultado] = await banco.execute(`
      INSERT INTO funcionarios (nome, cargo, pin_hash, token_acesso, ativo)
      VALUES (?, ?, ?, ?, 1)
    `, [nome, cargo, criarHashSenha(pin), normalizarToken(nome)]);
    funcionarioId = Number(resultado.insertId);
  }
  const funcionarios = await listarFuncionarios(banco);
  return funcionarios.find((item) => item.id === String(funcionarioId));
}

export async function alternarStatusFuncionario(banco, id, ativo) {
  const [resultado] = await banco.execute('UPDATE funcionarios SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, id]);
  if (!resultado.affectedRows) return null;
  if (!ativo) await banco.execute('DELETE FROM sessoes_garcom WHERE funcionario_id = ?', [id]);
  const funcionarios = await listarFuncionarios(banco);
  return funcionarios.find((item) => item.id === String(id));
}

export async function listarMesas(banco) {
  const [linhas] = await banco.query(`
    SELECT m.*, CASE WHEN c.id IS NULL THEN 'Livre' ELSE 'Ocupada' END AS status
    FROM mesas m
    LEFT JOIN comandas c ON c.mesa_id = m.id AND c.status <> 'Encerrada'
    WHERE m.ativo = 1
    ORDER BY CAST(m.numero AS UNSIGNED), m.numero
  `);
  return linhas.map((linha) => ({
    id: Number(linha.id),
    numero: linha.numero,
    lugares: Number(linha.lugares),
    status: linha.status
  }));
}

export async function criarMesa(banco, dados) {
  const numeroInformado = texto(dados?.numero, 10);
  if (!/^\d{1,3}$/.test(numeroInformado) || Number(numeroInformado) < 1) {
    throw erroDominio('Informe um número de mesa entre 1 e 999.');
  }
  const numero = String(Number(numeroInformado)).padStart(2, '0');
  const [resultado] = await banco.execute(`
    INSERT INTO mesas (numero, lugares, ativo) VALUES (?, 4, 1)
  `, [numero]);
  const mesas = await listarMesas(banco);
  return mesas.find((mesa) => mesa.id === Number(resultado.insertId));
}

async function listarAdicionaisDeItens(banco, tabela, campo, itensIds) {
  const mapa = new Map();
  if (itensIds.length === 0) return mapa;
  const marcadores = itensIds.map(() => '?').join(', ');
  const [linhas] = await banco.execute(`
    SELECT ${campo} AS item_id, adicional_id, nome_adicional, preco_centavos
    FROM ${tabela}
    WHERE ${campo} IN (${marcadores})
    ORDER BY nome_adicional
  `, itensIds);
  for (const linha of linhas) {
    const itemId = Number(linha.item_id);
    if (!mapa.has(itemId)) mapa.set(itemId, []);
    mapa.get(itemId).push({
      id: linha.adicional_id ? Number(linha.adicional_id) : null,
      nome: linha.nome_adicional,
      preco: Number(linha.preco_centavos) / 100
    });
  }
  return mapa;
}

export async function listarComandas(banco, { funcionarioId = null } = {}) {
  const parametros = [];
  const filtroFuncionario = funcionarioId == null ? '' : 'AND c.funcionario_id = ?';
  if (funcionarioId != null) parametros.push(funcionarioId);
  const [comandas] = await banco.execute(`
    SELECT c.*, m.numero AS mesa_numero, f.nome AS garcom
    FROM comandas c
    INNER JOIN mesas m ON m.id = c.mesa_id
    INNER JOIN funcionarios f ON f.id = c.funcionario_id
    WHERE c.status <> 'Encerrada'
      ${filtroFuncionario}
    ORDER BY c.aberta_em DESC
  `, parametros);
  if (comandas.length === 0) return [];
  const ids = comandas.map((comanda) => Number(comanda.id));
  const marcadores = ids.map(() => '?').join(', ');
  const [itens] = await banco.execute(`
    SELECT ci.*, p.descricao, p.imagem_url, p.categoria_id
    FROM comanda_itens ci
    LEFT JOIN produtos p ON p.id = ci.produto_id
    WHERE ci.comanda_id IN (${marcadores})
    ORDER BY ci.id
  `, ids);
  const adicionais = await listarAdicionaisDeItens(banco, 'comanda_item_adicionais', 'comanda_item_id', itens.map((item) => Number(item.id)));
  const itensPorComanda = new Map();
  for (const item of itens) {
    const comandaId = Number(item.comanda_id);
    if (!itensPorComanda.has(comandaId)) itensPorComanda.set(comandaId, []);
    itensPorComanda.get(comandaId).push({
      id: item.produto_id ? Number(item.produto_id) : null,
      linhaId: String(item.id),
      nome: item.nome_produto,
      descricao: item.descricao ?? '',
      imagem: item.imagem_url,
      preco: Number(item.preco_unitario_centavos) / 100,
      quantidade: Number(item.quantidade),
      adicionais: adicionais.get(Number(item.id)) ?? [],
      observacao: item.observacao ?? ''
    });
  }
  return comandas.map((comanda) => ({
    id: String(comanda.id),
    mesaId: Number(comanda.mesa_id),
    funcionarioId: String(comanda.funcionario_id),
    garcom: comanda.garcom,
    status: comanda.status,
    pagamento: comanda.pagamento ?? null,
    abertaEm: horaPtBr(comanda.aberta_em),
    itens: itensPorComanda.get(Number(comanda.id)) ?? []
  }));
}

export async function listarPedidos(banco, { id = null } = {}) {
  const parametros = [];
  let filtro = '';
  if (id) {
    filtro = 'WHERE p.id = ?';
    parametros.push(id);
  }
  const [pedidos] = await banco.execute(`
    SELECT p.*, m.numero AS mesa_numero, f.nome AS garcom,
      pg.id AS pagamento_id, pg.status AS pagamento_status,
      pg.pix_chave, pg.pix_beneficiario, pg.pix_copia_cola,
      pg.sem_troco, pg.troco_para_centavos, pg.pago_em,
      pg.confirmado_em, pg.estornado_em,
      confirmador.nome AS pagamento_confirmado_por,
      estornador.nome AS pagamento_estornado_por
    FROM pedidos p
    LEFT JOIN mesas m ON m.id = p.mesa_id
    LEFT JOIN funcionarios f ON f.id = p.funcionario_id
    LEFT JOIN pagamentos pg ON pg.id = (
      SELECT pg2.id FROM pagamentos pg2 WHERE pg2.pedido_id = p.id ORDER BY pg2.id DESC LIMIT 1
    )
    LEFT JOIN administradores confirmador ON confirmador.id = pg.confirmado_por
    LEFT JOIN administradores estornador ON estornador.id = pg.estornado_por
    ${filtro}
    ORDER BY p.criado_em DESC
    LIMIT 500
  `, parametros);
  if (pedidos.length === 0) return [];
  const ids = pedidos.map((pedido) => Number(pedido.id));
  const marcadores = ids.map(() => '?').join(', ');
  const [itens] = await banco.execute(`
    SELECT * FROM pedido_itens WHERE pedido_id IN (${marcadores}) ORDER BY id
  `, ids);
  const adicionais = await listarAdicionaisDeItens(banco, 'pedido_item_adicionais', 'pedido_item_id', itens.map((item) => Number(item.id)));
  const itensPorPedido = new Map();
  for (const item of itens) {
    const pedidoId = Number(item.pedido_id);
    if (!itensPorPedido.has(pedidoId)) itensPorPedido.set(pedidoId, []);
    itensPorPedido.get(pedidoId).push({
      id: item.produto_id ? Number(item.produto_id) : null,
      promocaoId: item.promocao_id ? Number(item.promocao_id) : null,
      nome: item.nome_produto,
      descricao: item.descricao_produto ?? '',
      imagem: item.imagem_url,
      quantidade: Number(item.quantidade),
      preco: Number(item.preco_unitario_centavos) / 100,
      adicionais: (adicionais.get(Number(item.id)) ?? []).map((adicional) => adicional.nome),
      observacao: item.observacao ?? ''
    });
  }
  return pedidos.map((pedido) => {
    const endereco = pedido.origem === 'delivery'
      ? `${pedido.rua}, ${pedido.numero} - ${pedido.bairro}${pedido.complemento ? `, ${pedido.complemento}` : ''}`
      : null;
    const origem = pedido.origem === 'delivery'
      ? 'Delivery'
      : pedido.origem === 'retirada'
        ? 'Retirada no balcão'
        : `Mesa ${pedido.mesa_numero}`;
    return {
      id: codigoPedido(pedido.id),
      cliente: pedido.cliente,
      telefone: pedido.telefone,
      email: pedido.email ?? '',
      origem,
      modalidade: pedido.origem,
      status: pedido.status,
      pagamento: pedido.pagamento,
      pagamentoStatus: normalizarStatusPagamento(pedido.pagamento_status, pedido.pagamento),
      pixChave: pedido.pix_chave ?? '',
      pixBeneficiario: pedido.pix_beneficiario ?? '',
      pixCopiaCola: pedido.pix_copia_cola ?? '',
      semTroco: pedido.sem_troco === null ? null : Boolean(pedido.sem_troco),
      trocoPara: pedido.troco_para_centavos === null ? null : Number(pedido.troco_para_centavos) / 100,
      pagamentoConfirmadoEm: dataIso(pedido.confirmado_em ?? pedido.pago_em),
      pagamentoConfirmadoPor: pedido.pagamento_confirmado_por ?? '',
      pagamentoEstornadoEm: dataIso(pedido.estornado_em),
      pagamentoEstornadoPor: pedido.pagamento_estornado_por ?? '',
      horario: horaPtBr(pedido.criado_em),
      criadoEm: dataIso(pedido.criado_em),
      endereco,
      referencia: pedido.referencia ?? '',
      itens: itensPorPedido.get(Number(pedido.id)) ?? [],
      taxaEntrega: Number(pedido.taxa_entrega_centavos) / 100,
      total: Number(pedido.total_centavos) / 100,
      comandaId: pedido.comanda_id ? String(pedido.comanda_id) : null,
      mesaId: pedido.mesa_id ? Number(pedido.mesa_id) : null,
      funcionarioId: pedido.funcionario_id ? String(pedido.funcionario_id) : null,
      garcom: pedido.garcom ?? null
    };
  });
}

export async function buscarItensValidados(conexao, itensRecebidos) {
  if (!Array.isArray(itensRecebidos) || itensRecebidos.length === 0) {
    throw erroDominio('Adicione ao menos um produto ao pedido.');
  }
  if (itensRecebidos.length > MAX_LINHAS_PEDIDO) {
    throw erroDominio(`O pedido pode ter no máximo ${MAX_LINHAS_PEDIDO} itens diferentes.`);
  }

  const itens = [];
  let totalUnidades = 0;
  for (const item of itensRecebidos) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw erroDominio('Um item do pedido possui formato inválido.');
    }
    const produtoId = Number(item.produtoId ?? item.id);
    const promocaoId = item.promocaoId == null || item.promocaoId === ''
      ? null
      : Number(item.promocaoId);
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(produtoId)
        || (promocaoId !== null && (!Number.isInteger(promocaoId) || promocaoId <= 0))
        || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 50) {
      throw erroDominio('Um item do pedido possui produto ou quantidade inválida.');
    }
    totalUnidades += quantidade;
    if (totalUnidades > MAX_UNIDADES_PEDIDO) {
      throw erroDominio(`O pedido pode ter no máximo ${MAX_UNIDADES_PEDIDO} unidades.`);
    }
    const [produtos] = await conexao.execute(`
      SELECT p.* FROM produtos p
      INNER JOIN categorias c ON c.id = p.categoria_id
      WHERE p.id = ? AND p.ativo = 1 AND c.ativo = 1 FOR UPDATE
    `, [produtoId]);
    const produto = produtos[0];
    if (!produto) throw erroDominio('Um produto do pedido não está mais disponível.', 409);

    let promocao = null;
    if (promocaoId !== null) {
      const [promocoes] = await conexao.execute(`
        SELECT * FROM promocoes WHERE id = ? AND produto_id = ? FOR UPDATE
      `, [promocaoId, produtoId]);
      promocao = promocoes[0];
      if (!promocao || !promocaoDisponivel(promocao)) {
        throw erroDominio('A promoção selecionada não está mais disponível.', 409);
      }
    }

    if (item.adicionais != null && !Array.isArray(item.adicionais)) {
      throw erroDominio('A lista de adicionais de um item é inválida.');
    }
    if ((item.adicionais?.length ?? 0) > MAX_ADICIONAIS_POR_ITEM) {
      throw erroDominio(`Cada item pode ter no máximo ${MAX_ADICIONAIS_POR_ITEM} adicionais.`);
    }
    const adicionaisIds = [...new Set((item.adicionais ?? []).map((adicional) => Number(adicional?.id ?? adicional)))]
      .filter((adicionalId) => Number.isInteger(adicionalId) && adicionalId > 0);
    let adicionais = [];
    if (adicionaisIds.length > 0) {
      const marcadores = adicionaisIds.map(() => '?').join(', ');
      const [linhas] = await conexao.execute(`
        SELECT a.id, a.nome, a.preco_centavos
        FROM adicionais a
        INNER JOIN produto_adicionais pa ON pa.adicional_id = a.id AND pa.produto_id = ?
        WHERE a.id IN (${marcadores}) AND a.ativo = 1
        FOR UPDATE
      `, [produtoId, ...adicionaisIds]);
      if (linhas.length !== adicionaisIds.length) throw erroDominio('Um adicional não está disponível para o produto.', 409);
      adicionais = linhas.map((linha) => ({
        id: Number(linha.id),
        nome: linha.nome,
        precoCentavos: Number(linha.preco_centavos)
      }));
    }
    const precoCentavos = Number(promocao?.preco_centavos ?? produto.preco_centavos)
      + adicionais.reduce((total, adicional) => total + adicional.precoCentavos, 0);
    itens.push({
      produtoId,
      promocaoId,
      nome: promocao?.nome ?? produto.nome,
      descricao: promocao?.descricao ?? produto.descricao,
      imagem: promocao?.imagem_url || produto.imagem_url,
      precoCentavos,
      quantidade,
      observacao: texto(item.observacao, 1000) || null,
      adicionais
    });
  }
  return itens;
}

export async function revalidarCarrinho(banco, itensRecebidos) {
  if (!Array.isArray(itensRecebidos)) throw erroDominio('O carrinho informado é inválido.');
  if (itensRecebidos.length > MAX_LINHAS_PEDIDO) {
    throw erroDominio(`O carrinho pode ter no máximo ${MAX_LINHAS_PEDIDO} itens diferentes.`);
  }

  const itens = [];
  const alteracoes = [];
  for (const [indice, recebido] of itensRecebidos.entries()) {
    if (!recebido || typeof recebido !== 'object' || Array.isArray(recebido)) {
      alteracoes.push({ tipo: 'removido', mensagem: `O item ${indice + 1} tinha formato inválido e foi removido.` });
      continue;
    }
    const produtoId = Number(recebido.produtoId ?? recebido.id);
    const quantidade = Number(recebido.quantidade);
    const carrinhoId = texto(recebido.carrinhoId, 160) || `produto-${produtoId}-${indice}`;
    if (!Number.isInteger(produtoId) || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 50) {
      alteracoes.push({ carrinhoId, tipo: 'removido', mensagem: 'Um item inválido foi removido do carrinho.' });
      continue;
    }

    const [produtos] = await banco.execute(`
      SELECT p.*, c.nome AS categoria
      FROM produtos p
      INNER JOIN categorias c ON c.id = p.categoria_id
      WHERE p.id = ? AND p.ativo = 1 AND c.ativo = 1
    `, [produtoId]);
    const produto = produtos[0];
    if (!produto) {
      alteracoes.push({ carrinhoId, tipo: 'removido', mensagem: `${texto(recebido.nome, 160) || 'Um produto'} não está mais disponível e foi removido.` });
      continue;
    }

    let promocao = null;
    const promocaoIdRecebida = Number(recebido.promocaoId) || null;
    if (promocaoIdRecebida) {
      const [promocoes] = await banco.execute('SELECT * FROM promocoes WHERE id = ? AND produto_id = ?', [promocaoIdRecebida, produtoId]);
      promocao = promocoes[0];
      if (!promocaoDisponivel(promocao)) {
        promocao = null;
        alteracoes.push({ carrinhoId, tipo: 'atualizado', mensagem: `A promoção de ${produto.nome} terminou; o preço normal foi aplicado.` });
      }
    }

    const idsRecebidos = [...new Set((Array.isArray(recebido.adicionais) ? recebido.adicionais : [])
      .map((adicional) => Number(adicional?.id ?? adicional))
      .filter((id) => Number.isInteger(id) && id > 0))];
    let adicionais = [];
    if (idsRecebidos.length > 0) {
      const marcadores = idsRecebidos.map(() => '?').join(', ');
      const [linhas] = await banco.execute(`
        SELECT a.id, a.nome, a.preco_centavos
        FROM adicionais a
        INNER JOIN produto_adicionais pa ON pa.adicional_id = a.id AND pa.produto_id = ?
        WHERE a.id IN (${marcadores}) AND a.ativo = 1
        ORDER BY a.nome
      `, [produtoId, ...idsRecebidos]);
      adicionais = linhas.map((linha) => ({
        id: Number(linha.id),
        nome: linha.nome,
        preco: Number(linha.preco_centavos) / 100
      }));
      if (adicionais.length !== idsRecebidos.length) {
        alteracoes.push({ carrinhoId, tipo: 'atualizado', mensagem: `Adicionais indisponíveis de ${produto.nome} foram removidos.` });
      }
    }

    const precoBaseCentavos = Number(promocao?.preco_centavos ?? produto.preco_centavos);
    const precoFinal = (precoBaseCentavos + adicionais.reduce((total, adicional) => total + Math.round(adicional.preco * 100), 0)) / 100;
    const precoAnterior = Number(recebido.precoFinal ?? String(recebido.preco ?? '').replace(',', '.'));
    if (Number.isFinite(precoAnterior) && Math.abs(precoAnterior - precoFinal) >= 0.005) {
      alteracoes.push({ carrinhoId, tipo: 'atualizado', mensagem: `O preço de ${produto.nome} foi atualizado para R$ ${precoFinal.toFixed(2).replace('.', ',')}.` });
    }

    itens.push({
      id: produtoId,
      produtoId,
      promocaoId: promocao ? Number(promocao.id) : null,
      carrinhoId,
      nome: promocao?.nome ?? produto.nome,
      categoria: produto.categoria,
      descricao: promocao?.descricao ?? produto.descricao,
      imagem: promocao?.imagem_url || produto.imagem_url || null,
      preco: formatarPreco(precoBaseCentavos),
      precoFinal,
      quantidade,
      observacao: texto(recebido.observacao, 1000),
      adicionais
    });
  }
  return { itens, alteracoes };
}

async function inserirItensPedido(conexao, pedidoId, itens) {
  for (const item of itens) {
    const [resultado] = await conexao.execute(`
      INSERT INTO pedido_itens
        (pedido_id, produto_id, promocao_id, nome_produto, descricao_produto, imagem_url,
         preco_unitario_centavos, quantidade, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pedidoId, item.produtoId, item.promocaoId, item.nome, item.descricao, item.imagem,
      item.precoCentavos, item.quantidade, item.observacao
    ]);
    for (const adicional of item.adicionais) {
      await conexao.execute(`
        INSERT INTO pedido_item_adicionais
          (pedido_item_id, adicional_id, nome_adicional, preco_centavos)
        VALUES (?, ?, ?, ?)
      `, [resultado.insertId, adicional.id, adicional.nome, adicional.precoCentavos]);
    }
  }
}

export function calcularTotaisPedido(itens, taxaEntregaCentavos) {
  const subtotalCentavos = itens.reduce(
    (total, item) => total + Number(item.precoCentavos) * Number(item.quantidade),
    0
  );
  const totalCentavos = subtotalCentavos + Number(taxaEntregaCentavos);
  if (!Number.isSafeInteger(subtotalCentavos) || !Number.isSafeInteger(totalCentavos)
      || subtotalCentavos < 0 || totalCentavos < 0 || totalCentavos > MAX_TOTAL_CENTAVOS) {
    throw erroDominio('O valor total do pedido excede o limite permitido.');
  }
  return {
    subtotalCentavos,
    totalCentavos
  };
}

export async function criarPedidoDelivery(banco, dados) {
  const nome = texto(dados.nome, 160);
  const telefone = texto(dados.telefone, 40);
  const email = texto(dados.email, 160);
  const rua = texto(dados.rua, 180);
  const numero = texto(dados.numero, 30);
  const bairro = texto(dados.bairro, 120);
  const pagamento = texto(dados.pagamento, 40);
  const modalidade = texto(dados.modalidade, 20);
  const chaveIdempotencia = texto(dados.chaveIdempotencia, 100);
  const retirada = modalidade === 'retirada';
  if (!nome || !telefone || !email || (!retirada && (!rua || !numero || !bairro))) {
    throw erroDominio(retirada
      ? 'Preencha os dados essenciais do cliente.'
      : 'Preencha os dados do cliente e o endereço de entrega.');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw erroDominio('Informe um e-mail válido.');
  if (!/^\d{10,11}$/.test(telefone.replace(/\D/g, ''))) throw erroDominio('Informe um telefone válido com DDD.');
  if (!['delivery', 'retirada'].includes(modalidade)) throw erroDominio('A modalidade de atendimento informada não está disponível.');
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(chaveIdempotencia)) {
    throw erroDominio('Não foi possível identificar esta tentativa de pedido. Atualize a página e tente novamente.');
  }
  const pagamentosPermitidos = retirada ? PAGAMENTOS_RETIRADA : PAGAMENTOS_DELIVERY;
  if (!pagamentosPermitidos.has(pagamento)) throw erroDominio('Selecione uma forma de pagamento válida.');

  const informouSemTroco = dados.semTroco !== undefined && dados.semTroco !== null;
  const informouTrocoPara = dados.trocoPara !== undefined && dados.trocoPara !== null && dados.trocoPara !== '';
  let semTroco = null;
  let trocoParaCentavos = null;
  if (pagamento === 'Dinheiro') {
    semTroco = dados.semTroco === true;
    if (semTroco === informouTrocoPara) {
      throw erroDominio('Para pagamento em dinheiro, escolha sem troco ou informe o valor entregue.');
    }
    if (informouTrocoPara) {
      trocoParaCentavos = precoParaCentavos(dados.trocoPara);
      if (!Number.isInteger(trocoParaCentavos) || trocoParaCentavos <= 0) {
        throw erroDominio('Informe um valor válido para o troco.');
      }
    }
  } else if (informouSemTroco || informouTrocoPara) {
    throw erroDominio('As opções de troco só podem ser usadas no pagamento em dinheiro.');
  }

  const hashIdempotencia = criarHashToken(chaveIdempotencia);
  const [pedidosExistentes] = await banco.execute(
    'SELECT id FROM pedidos WHERE chave_idempotencia_hash = ?',
    [hashIdempotencia]
  );
  if (pedidosExistentes[0]) {
    const [pedidoExistente] = await listarPedidos(banco, { id: Number(pedidosExistentes[0].id) });
    return { ...pedidoExistente, tokenAcompanhamento: chaveIdempotencia };
  }

  let pedidoId;
  try {
    pedidoId = await executarTransacao(banco, async (conexao) => {
      const [configuracoes] = await conexao.execute('SELECT * FROM configuracoes WHERE id = 1 FOR UPDATE');
      const configuracao = configuracoes[0];
      if (!configuracao?.loja_aberta) throw erroDominio('A loja está fechada no momento.', 409);
      if (!retirada && !configuracao.entrega_ativa) throw erroDominio('A entrega está indisponível no momento.', 409);
      if (retirada && !configuracao.retirada_ativa) throw erroDominio('A retirada no balcão está indisponível no momento.', 409);
      if (pagamento === 'Pix' && (!texto(configuracao.pix_chave, 180)
          || !texto(configuracao.pix_beneficiario, 160) || !texto(configuracao.pix_cidade, 60))) {
        throw erroDominio('O pagamento por Pix não está disponível no momento.', 409);
      }
      if (['Cartão na entrega', 'Cartão na retirada'].includes(pagamento) && !configuracao.aceita_cartao) {
        throw erroDominio('O pagamento com cartão está indisponível.', 409);
      }
      if (pagamento === 'Dinheiro' && !configuracao.aceita_dinheiro) {
        throw erroDominio('O pagamento em dinheiro está indisponível.', 409);
      }

      const itens = await buscarItensValidados(conexao, dados.itens);
      const areasEntrega = retirada ? [] : lerAreasEntrega(configuracao.areas_entrega_json);
      const areaEntrega = retirada
        ? null
        : areasEntrega.find((area) => normalizarBairro(area.bairro) === normalizarBairro(bairro));
      if (!retirada && areasEntrega.length > 0 && !areaEntrega) {
        throw erroDominio('O bairro informado está fora da área de entrega.', 409);
      }
      const taxaEntrega = retirada
        ? 0
        : areaEntrega
        ? Number(areaEntrega.taxaCentavos)
        : Number(configuracao.taxa_entrega_centavos);
      const { subtotalCentavos, totalCentavos } = calcularTotaisPedido(itens, taxaEntrega);
      if (!retirada && subtotalCentavos < Number(configuracao.pedido_minimo_centavos)) {
        throw erroDominio(`O pedido mínimo é R$ ${formatarPreco(configuracao.pedido_minimo_centavos)}.`, 409);
      }
      if (trocoParaCentavos !== null && trocoParaCentavos < totalCentavos) {
        throw erroDominio('O valor entregue em dinheiro não pode ser menor que o total do pedido.', 409);
      }

      const statusPagamento = pagamento === 'Pix'
        ? PAGAMENTO_AGUARDANDO
        : retirada ? 'Pagamento na retirada' : PAGAMENTO_ENTREGA;
      const [resultado] = await conexao.execute(`
        INSERT INTO pedidos
          (token_acompanhamento_hash, chave_idempotencia_hash, origem, cliente, telefone, email, status, pagamento,
           rua, numero, bairro, complemento, referencia,
           taxa_entrega_centavos, total_centavos)
        VALUES (?, ?, ?, ?, ?, ?, 'Recebido', ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        hashIdempotencia, hashIdempotencia, modalidade, nome, telefone, email, pagamento,
        retirada ? null : rua, retirada ? null : numero, retirada ? null : (areaEntrega?.bairro ?? bairro),
        retirada ? null : (texto(dados.complemento, 160) || null),
        texto(dados.referencia, 255) || null, taxaEntrega, totalCentavos
      ]);
      await inserirItensPedido(conexao, resultado.insertId, itens);
      const pixCopiaCola = pagamento === 'Pix'
        ? gerarPixCopiaCola({
            chave: configuracao.pix_chave,
            beneficiario: configuracao.pix_beneficiario,
            cidade: configuracao.pix_cidade,
            valorCentavos: totalCentavos,
            txid: `PED${resultado.insertId}`
          })
        : null;
      await conexao.execute(`
        INSERT INTO pagamentos
          (pedido_id, forma, status, valor_centavos, pix_chave, pix_beneficiario,
           sem_troco, troco_para_centavos, pix_copia_cola)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        resultado.insertId,
        pagamento,
        statusPagamento,
        totalCentavos,
        pagamento === 'Pix' ? configuracao.pix_chave : null,
        pagamento === 'Pix' ? configuracao.pix_beneficiario : null,
        pagamento === 'Dinheiro' ? (semTroco ? 1 : 0) : null,
        pagamento === 'Dinheiro' ? trocoParaCentavos : null,
        pixCopiaCola
      ]);
      return Number(resultado.insertId);
    });
  } catch (erro) {
    if (erro.code !== 'ER_DUP_ENTRY') throw erro;
    const [existentes] = await banco.execute(
      'SELECT id FROM pedidos WHERE chave_idempotencia_hash = ?',
      [hashIdempotencia]
    );
    if (!existentes[0]) throw erro;
    pedidoId = Number(existentes[0].id);
  }

  const [pedido] = await listarPedidos(banco, { id: pedidoId });
  return { ...pedido, tokenAcompanhamento: chaveIdempotencia };
}

export async function acompanharPedido(banco, codigo, token) {
  const id = idPedidoPeloCodigo(codigo);
  if (!id || !token) return null;
  const [linhas] = await banco.execute(`
    SELECT id FROM pedidos
    WHERE id = ? AND origem IN ('delivery', 'retirada') AND token_acompanhamento_hash = ?
  `, [id, criarHashToken(token)]);
  if (!linhas[0]) return null;
  const [pedido] = await listarPedidos(banco, { id });
  return { ...pedido, tokenAcompanhamento: token };
}

export async function atualizarStatusPedido(banco, codigo, status, administradorId = null) {
  const id = idPedidoPeloCodigo(codigo);
  if (!id) return null;
  const atualizado = await executarTransacao(banco, async (conexao) => {
    const [linhas] = await conexao.execute('SELECT origem, status FROM pedidos WHERE id = ? FOR UPDATE', [id]);
    if (!linhas[0]) return false;
    const permitidos = linhas[0].origem === 'delivery'
      ? STATUS_DELIVERY
      : linhas[0].origem === 'retirada' ? STATUS_RETIRADA : STATUS_MESA;
    if (!permitidos.has(status)) throw erroDominio('Status inválido para a origem deste pedido.');
    if (STATUS_TERMINAIS.has(linhas[0].status) && status !== linhas[0].status) {
      throw erroDominio('Um pedido concluído ou cancelado não pode voltar para outra etapa.', 409);
    }
    if (status === linhas[0].status) return true;
    await conexao.execute('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
    if (status === 'Cancelado') {
      const [pagamentos] = await conexao.execute('SELECT * FROM pagamentos WHERE pedido_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [id]);
      const pagamento = pagamentos[0];
      if (pagamento?.status === PAGAMENTO_PAGO) {
        await conexao.execute(`
          UPDATE pagamentos
          SET status = ?, estornado_por = ?, estornado_em = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [PAGAMENTO_ESTORNADO, administradorId, pagamento.id]);
      } else if (pagamento && ![PAGAMENTO_CANCELADO, PAGAMENTO_ESTORNADO].includes(pagamento.status)) {
        await conexao.execute('UPDATE pagamentos SET status = ? WHERE id = ?', [PAGAMENTO_CANCELADO, pagamento.id]);
      }
    }
    await registrarAuditoria(conexao, administradorId, status === 'Cancelado' ? 'pedido.cancelado' : 'pedido.status_alterado', 'pedido', id, {
      statusAnterior: linhas[0].status,
      statusNovo: status
    });
    return true;
  });
  if (!atualizado) return null;
  const [pedido] = await listarPedidos(banco, { id });
  return pedido;
}

export async function confirmarPagamento(banco, codigo, administradorId) {
  const id = idPedidoPeloCodigo(codigo);
  if (!id) return null;
  await executarTransacao(banco, async (conexao) => {
    const [pedidos] = await conexao.execute('SELECT id, status FROM pedidos WHERE id = ? FOR UPDATE', [id]);
    if (!pedidos[0]) throw erroDominio('Pedido não encontrado.', 404);
    if (pedidos[0].status === 'Cancelado') throw erroDominio('Não é possível confirmar o pagamento de um pedido cancelado.', 409);
    const [pagamentos] = await conexao.execute('SELECT * FROM pagamentos WHERE pedido_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [id]);
    const pagamento = pagamentos[0];
    if (!pagamento) throw erroDominio('O pagamento deste pedido não foi encontrado.', 404);
    if (pagamento.status === PAGAMENTO_PAGO) return;
    if ([PAGAMENTO_CANCELADO, PAGAMENTO_ESTORNADO].includes(pagamento.status)) {
      throw erroDominio('Este pagamento não pode mais ser confirmado.', 409);
    }
    await conexao.execute(`
      UPDATE pagamentos
      SET status = ?, pago_em = CURRENT_TIMESTAMP, confirmado_por = ?, confirmado_em = CURRENT_TIMESTAMP,
          estornado_por = NULL, estornado_em = NULL
      WHERE id = ?
    `, [PAGAMENTO_PAGO, administradorId, pagamento.id]);
    await registrarAuditoria(conexao, administradorId, 'pagamento.confirmado', 'pedido', id, {
      forma: pagamento.forma,
      valorCentavos: Number(pagamento.valor_centavos)
    });
  });
  const [pedido] = await listarPedidos(banco, { id });
  return pedido;
}

export async function estornarPagamento(banco, codigo, administradorId) {
  const id = idPedidoPeloCodigo(codigo);
  if (!id) return null;
  await executarTransacao(banco, async (conexao) => {
    const [pedidos] = await conexao.execute('SELECT id FROM pedidos WHERE id = ? FOR UPDATE', [id]);
    if (!pedidos[0]) throw erroDominio('Pedido não encontrado.', 404);
    const [pagamentos] = await conexao.execute('SELECT * FROM pagamentos WHERE pedido_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [id]);
    const pagamento = pagamentos[0];
    if (!pagamento) throw erroDominio('O pagamento deste pedido não foi encontrado.', 404);
    if (pagamento.status === PAGAMENTO_ESTORNADO) return;
    if (pagamento.status !== PAGAMENTO_PAGO) throw erroDominio('Somente pagamentos pagos podem ser estornados.', 409);
    await conexao.execute(`
      UPDATE pagamentos SET status = ?, estornado_por = ?, estornado_em = CURRENT_TIMESTAMP WHERE id = ?
    `, [PAGAMENTO_ESTORNADO, administradorId, pagamento.id]);
    await registrarAuditoria(conexao, administradorId, 'pagamento.estornado', 'pedido', id, {
      forma: pagamento.forma,
      valorCentavos: Number(pagamento.valor_centavos)
    });
  });
  const [pedido] = await listarPedidos(banco, { id });
  return pedido;
}

function mapearAdministrador(linha) {
  return {
    id: Number(linha.id),
    usuario: linha.usuario,
    email: linha.email,
    nome: linha.nome,
    ativo: Boolean(linha.ativo),
    criadoEm: dataIso(linha.criado_em)
  };
}

export async function listarAdministradores(banco) {
  const [linhas] = await banco.query('SELECT id, usuario, email, nome, ativo, criado_em FROM administradores ORDER BY nome');
  return linhas.map(mapearAdministrador);
}

export async function criarAdministrador(banco, dados, administradorId) {
  const usuario = texto(dados.usuario, 80);
  const email = texto(dados.email, 160).toLowerCase();
  const nome = texto(dados.nome, 160);
  const senha = String(dados.senha ?? '');
  const confirmacao = String(dados.confirmacaoSenha ?? '');
  if (!usuario || !nome || !/^\S+@\S+\.\S+$/.test(email)) throw erroDominio('Informe nome, usuário e e-mail válidos.');
  if (senha.length < 10) throw erroDominio('A senha deve ter pelo menos 10 caracteres.');
  if (senha !== confirmacao) throw erroDominio('A confirmação da senha não confere.');
  const id = await executarTransacao(banco, async (conexao) => {
    const [resultado] = await conexao.execute(`
      INSERT INTO administradores (usuario, email, nome, senha_hash, ativo) VALUES (?, ?, ?, ?, 1)
    `, [usuario, email, nome, criarHashSenha(senha)]);
    await registrarAuditoria(conexao, administradorId, 'administrador.criado', 'administrador', resultado.insertId, { usuario, email });
    return Number(resultado.insertId);
  });
  const [linhas] = await banco.execute('SELECT id, usuario, email, nome, ativo, criado_em FROM administradores WHERE id = ?', [id]);
  return mapearAdministrador(linhas[0]);
}

export async function alternarStatusAdministrador(banco, id, ativo, administradorId) {
  const alvoId = Number(id);
  if (!Number.isInteger(alvoId) || alvoId <= 0) return null;
  if (!ativo && alvoId === Number(administradorId)) throw erroDominio('Você não pode desativar o próprio acesso.', 409);
  return executarTransacao(banco, async (conexao) => {
    const [alvos] = await conexao.execute('SELECT id FROM administradores WHERE id = ? FOR UPDATE', [alvoId]);
    if (!alvos[0]) return null;
    if (!ativo) {
      const [[contagem]] = await conexao.execute('SELECT COUNT(*) AS total FROM administradores WHERE ativo = 1 FOR UPDATE');
      if (Number(contagem.total) <= 1) throw erroDominio('Mantenha ao menos um administrador ativo.', 409);
    }
    await conexao.execute('UPDATE administradores SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, alvoId]);
    if (!ativo) await conexao.execute('DELETE FROM sessoes_admin WHERE administrador_id = ?', [alvoId]);
    await registrarAuditoria(conexao, administradorId, ativo ? 'administrador.ativado' : 'administrador.desativado', 'administrador', alvoId);
    const [linhas] = await conexao.execute('SELECT id, usuario, email, nome, ativo, criado_em FROM administradores WHERE id = ?', [alvoId]);
    return mapearAdministrador(linhas[0]);
  });
}

export async function alterarSenhaAdministrador(banco, administradorId, dados, tokenAtual) {
  const senhaAtual = String(dados.senhaAtual ?? '');
  const novaSenha = String(dados.novaSenha ?? '');
  const confirmacao = String(dados.confirmacaoSenha ?? '');
  if (novaSenha.length < 10) throw erroDominio('A nova senha deve ter pelo menos 10 caracteres.');
  if (novaSenha !== confirmacao) throw erroDominio('A confirmação da nova senha não confere.');
  await executarTransacao(banco, async (conexao) => {
    const [linhas] = await conexao.execute('SELECT senha_hash FROM administradores WHERE id = ? FOR UPDATE', [administradorId]);
    if (!linhas[0] || !verificarSenha(senhaAtual, linhas[0].senha_hash)) throw erroDominio('A senha atual está incorreta.', 401);
    if (verificarSenha(novaSenha, linhas[0].senha_hash)) throw erroDominio('A nova senha deve ser diferente da senha atual.');
    await conexao.execute('UPDATE administradores SET senha_hash = ? WHERE id = ?', [criarHashSenha(novaSenha), administradorId]);
    await conexao.execute('DELETE FROM sessoes_admin WHERE administrador_id = ? AND token_hash <> ?', [administradorId, criarHashToken(tokenAtual)]);
    await registrarAuditoria(conexao, administradorId, 'administrador.senha_alterada', 'administrador', administradorId);
  });
}

export async function listarAuditoriaAdmin(banco) {
  const [linhas] = await banco.query(`
    SELECT au.*, a.nome AS administrador_nome
    FROM auditoria_admin au
    LEFT JOIN administradores a ON a.id = au.administrador_id
    ORDER BY au.criado_em DESC, au.id DESC
    LIMIT 100
  `);
  return linhas.map((linha) => ({
    id: Number(linha.id),
    administrador: linha.administrador_nome ?? 'Sistema',
    acao: linha.acao,
    entidade: linha.entidade,
    entidadeId: linha.entidade_id ?? '',
    detalhes: typeof linha.detalhes_json === 'string' ? JSON.parse(linha.detalhes_json) : (linha.detalhes_json ?? null),
    criadoEm: dataIso(linha.criado_em)
  }));
}

async function obterComandaDoGarcom(conexao, comandaId, funcionarioId, { bloquear = false } = {}) {
  const [linhas] = await conexao.execute(`
    SELECT c.*, m.numero AS mesa_numero
    FROM comandas c
    INNER JOIN mesas m ON m.id = c.mesa_id
    WHERE c.id = ? ${bloquear ? 'FOR UPDATE' : ''}
  `, [comandaId]);
  const comanda = linhas[0];
  if (!comanda) throw erroDominio('Comanda não encontrada.', 404);
  if (Number(comanda.funcionario_id) !== Number(funcionarioId)) {
    throw erroDominio('Esta comanda pertence a outro funcionário.', 403);
  }
  if (comanda.status === 'Encerrada') throw erroDominio('Esta comanda já foi encerrada.', 409);
  return comanda;
}

export async function abrirComanda(banco, mesaId, funcionarioId) {
  const id = await executarTransacao(banco, async (conexao) => {
    const [mesas] = await conexao.execute('SELECT * FROM mesas WHERE id = ? AND ativo = 1 FOR UPDATE', [mesaId]);
    if (!mesas[0]) throw erroDominio('Mesa não encontrada.', 404);
    const [existentes] = await conexao.execute(`
      SELECT * FROM comandas WHERE mesa_id = ? AND status <> 'Encerrada' FOR UPDATE
    `, [mesaId]);
    if (existentes[0]) {
      if (Number(existentes[0].funcionario_id) !== Number(funcionarioId)) {
        throw erroDominio('Esta mesa já está sendo atendida por outro garçom.', 409);
      }
      return Number(existentes[0].id);
    }
    const [resultado] = await conexao.execute(`
      INSERT INTO comandas (mesa_id, funcionario_id, status) VALUES (?, ?, 'Aberta')
    `, [mesaId, funcionarioId]);
    return Number(resultado.insertId);
  });
  const comandas = await listarComandas(banco);
  return comandas.find((comanda) => comanda.id === String(id));
}

export async function adicionarItemComanda(banco, comandaId, funcionarioId, dados) {
  await executarTransacao(banco, async (conexao) => {
    await obterComandaDoGarcom(conexao, comandaId, funcionarioId, { bloquear: true });
    const [item] = await buscarItensValidados(conexao, [{
      id: dados.produtoId,
      quantidade: dados.quantidade,
      adicionais: dados.adicionais,
      observacao: dados.observacao
    }]);
    const [[totais]] = await conexao.execute(`
      SELECT COUNT(*) AS linhas, COALESCE(SUM(quantidade), 0) AS unidades
      FROM comanda_itens WHERE comanda_id = ?
    `, [comandaId]);
    if (Number(totais.linhas) >= MAX_LINHAS_PEDIDO
        || Number(totais.unidades) + item.quantidade > MAX_UNIDADES_PEDIDO) {
      throw erroDominio('A comanda atingiu o limite de itens permitido.');
    }
    const [resultado] = await conexao.execute(`
      INSERT INTO comanda_itens
        (comanda_id, produto_id, nome_produto, preco_unitario_centavos, quantidade, observacao)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [comandaId, item.produtoId, item.nome, item.precoCentavos, item.quantidade, item.observacao]);
    for (const adicional of item.adicionais) {
      await conexao.execute(`
        INSERT INTO comanda_item_adicionais
          (comanda_item_id, adicional_id, nome_adicional, preco_centavos)
        VALUES (?, ?, ?, ?)
      `, [resultado.insertId, adicional.id, adicional.nome, adicional.precoCentavos]);
    }
    await conexao.execute("UPDATE comandas SET status = 'Aberta' WHERE id = ?", [comandaId]);
  });
}

export async function removerItemComanda(banco, comandaId, itemId, funcionarioId) {
  await executarTransacao(banco, async (conexao) => {
    await obterComandaDoGarcom(conexao, comandaId, funcionarioId, { bloquear: true });
    const [[totais]] = await conexao.execute(`
      SELECT COUNT(*) AS linhas,
        EXISTS(SELECT 1 FROM pedidos WHERE comanda_id = ?) AS possui_pedido
      FROM comanda_itens WHERE comanda_id = ?
    `, [comandaId, comandaId]);
    if (Number(totais.possui_pedido) && Number(totais.linhas) <= 1) {
      throw erroDominio('Não é possível remover o último item depois do envio à cozinha.', 409);
    }
    const [resultado] = await conexao.execute(`
      DELETE FROM comanda_itens WHERE id = ? AND comanda_id = ?
    `, [itemId, comandaId]);
    if (!resultado.affectedRows) throw erroDominio('Item da comanda não encontrado.', 404);
    await conexao.execute("UPDATE comandas SET status = 'Aberta' WHERE id = ?", [comandaId]);
  });
}

async function buscarResponsavelComanda(banco, comandaId) {
  const [linhas] = await banco.execute('SELECT funcionario_id FROM comandas WHERE id = ?', [comandaId]);
  if (!linhas[0]) throw erroDominio('Comanda não encontrada.', 404);
  return Number(linhas[0].funcionario_id);
}

export async function adicionarItemComandaAdmin(banco, comandaId, dados) {
  const funcionarioId = await buscarResponsavelComanda(banco, comandaId);
  await adicionarItemComanda(banco, comandaId, funcionarioId, dados);
}

export async function removerItemComandaAdmin(banco, comandaId, itemId) {
  const funcionarioId = await buscarResponsavelComanda(banco, comandaId);
  await removerItemComanda(banco, comandaId, itemId, funcionarioId);
}

export async function atualizarQuantidadeItemComandaAdmin(banco, comandaId, itemId, quantidadeInformada) {
  const quantidade = Number(quantidadeInformada);
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 50) {
    throw erroDominio('Informe uma quantidade entre 1 e 50.');
  }
  await executarTransacao(banco, async (conexao) => {
    const [comandas] = await conexao.execute('SELECT status FROM comandas WHERE id = ? FOR UPDATE', [comandaId]);
    if (!comandas[0]) throw erroDominio('Comanda não encontrada.', 404);
    if (comandas[0].status === 'Encerrada') throw erroDominio('Esta comanda já foi encerrada.', 409);

    const [itens] = await conexao.execute(`
      SELECT id FROM comanda_itens WHERE id = ? AND comanda_id = ? FOR UPDATE
    `, [itemId, comandaId]);
    if (!itens[0]) throw erroDominio('Item da comanda não encontrado.', 404);

    const [[totais]] = await conexao.execute(`
      SELECT COALESCE(SUM(quantidade), 0) AS unidades
      FROM comanda_itens WHERE comanda_id = ? AND id <> ?
    `, [comandaId, itemId]);
    if (Number(totais.unidades) + quantidade > MAX_UNIDADES_PEDIDO) {
      throw erroDominio('A comanda atingiu o limite de itens permitido.');
    }
    await conexao.execute('UPDATE comanda_itens SET quantidade = ? WHERE id = ?', [quantidade, itemId]);
    await conexao.execute("UPDATE comandas SET status = 'Aberta' WHERE id = ?", [comandaId]);
  });
}

async function copiarItensComandaParaPedido(conexao, comandaId, pedidoId) {
  const [itens] = await conexao.execute('SELECT * FROM comanda_itens WHERE comanda_id = ? ORDER BY id', [comandaId]);
  if (itens.length === 0) throw erroDominio('Adicione produtos antes de enviar a comanda.', 409);
  for (const item of itens) {
    const [produtos] = item.produto_id
      ? await conexao.execute('SELECT descricao, imagem_url FROM produtos WHERE id = ?', [item.produto_id])
      : [[]];
    const [resultado] = await conexao.execute(`
      INSERT INTO pedido_itens
        (pedido_id, produto_id, nome_produto, descricao_produto, imagem_url,
         preco_unitario_centavos, quantidade, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pedidoId, item.produto_id, item.nome_produto, produtos[0]?.descricao ?? '',
      produtos[0]?.imagem_url ?? null, item.preco_unitario_centavos,
      item.quantidade, item.observacao
    ]);
    const [adicionais] = await conexao.execute(`
      SELECT * FROM comanda_item_adicionais WHERE comanda_item_id = ?
    `, [item.id]);
    for (const adicional of adicionais) {
      await conexao.execute(`
        INSERT INTO pedido_item_adicionais
          (pedido_item_id, adicional_id, nome_adicional, preco_centavos)
        VALUES (?, ?, ?, ?)
      `, [resultado.insertId, adicional.adicional_id, adicional.nome_adicional, adicional.preco_centavos]);
    }
  }
  const total = itens.reduce(
    (soma, item) => soma + Number(item.preco_unitario_centavos) * Number(item.quantidade),
    0
  );
  if (!Number.isSafeInteger(total) || total < 0 || total > MAX_TOTAL_CENTAVOS) {
    throw erroDominio('O valor total da comanda excede o limite permitido.');
  }
  return total;
}

export async function enviarComanda(banco, comandaId, funcionarioId) {
  await executarTransacao(banco, async (conexao) => {
    const comanda = await obterComandaDoGarcom(conexao, comandaId, funcionarioId, { bloquear: true });
    const [pedidos] = await conexao.execute('SELECT id FROM pedidos WHERE comanda_id = ? FOR UPDATE', [comandaId]);
    let pedidoId = pedidos[0] ? Number(pedidos[0].id) : null;
    if (!pedidoId) {
      const [resultado] = await conexao.execute(`
        INSERT INTO pedidos
          (origem, cliente, telefone, status, pagamento, taxa_entrega_centavos,
           total_centavos, comanda_id, mesa_id, funcionario_id)
        VALUES ('mesa', ?, 'Atendimento presencial', 'Recebido', 'A definir', 0, 0, ?, ?, ?)
      `, [`Mesa ${comanda.mesa_numero}`, comandaId, comanda.mesa_id, funcionarioId]);
      pedidoId = Number(resultado.insertId);
    } else {
      await conexao.execute('DELETE FROM pedido_itens WHERE pedido_id = ?', [pedidoId]);
    }
    const total = await copiarItensComandaParaPedido(conexao, comandaId, pedidoId);
    await conexao.execute(`
      UPDATE pedidos SET total_centavos = ?, status = 'Em preparo' WHERE id = ?
    `, [total, pedidoId]);
    await conexao.execute("UPDATE comandas SET status = 'Na cozinha' WHERE id = ?", [comandaId]);
  });
}

export async function solicitarConta(banco, comandaId, funcionarioId) {
  await executarTransacao(banco, async (conexao) => {
    const comanda = await obterComandaDoGarcom(conexao, comandaId, funcionarioId, { bloquear: true });
    if (comanda.status !== 'Na cozinha') {
      throw erroDominio('Envie as alterações da comanda para a cozinha antes de solicitar a conta.', 409);
    }
    const [pedidos] = await conexao.execute('SELECT id FROM pedidos WHERE comanda_id = ? FOR UPDATE', [comandaId]);
    if (!pedidos[0]) throw erroDominio('Envie a comanda para a cozinha antes de solicitar a conta.', 409);
    await conexao.execute("UPDATE comandas SET status = 'Conta solicitada' WHERE id = ?", [comandaId]);
  });
}

export async function fecharComanda(banco, comandaId, funcionarioId, pagamento) {
  if (!PAGAMENTOS.has(pagamento) || pagamento === 'A definir') throw erroDominio('Selecione uma forma de pagamento válida.');
  await executarTransacao(banco, async (conexao) => {
    const comanda = await obterComandaDoGarcom(conexao, comandaId, funcionarioId, { bloquear: true });
    if (comanda.status !== 'Conta solicitada') {
      throw erroDominio('Solicite a conta antes de confirmar o pagamento.', 409);
    }
    const [pedidos] = await conexao.execute('SELECT * FROM pedidos WHERE comanda_id = ? FOR UPDATE', [comandaId]);
    const pedido = pedidos[0];
    if (!pedido) throw erroDominio('Envie a comanda para a cozinha antes de fechá-la.', 409);
    await conexao.execute(`
      UPDATE comandas SET status = 'Encerrada', pagamento = ?, encerrada_em = CURRENT_TIMESTAMP WHERE id = ?
    `, [pagamento, comandaId]);
    await conexao.execute(`
      UPDATE pedidos SET status = 'Entregue na mesa', pagamento = ? WHERE id = ?
    `, [pagamento, pedido.id]);
    await conexao.execute(`
      INSERT INTO pagamentos (pedido_id, comanda_id, forma, status, valor_centavos, pago_em, confirmado_em)
      VALUES (?, ?, ?, 'Pago', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [pedido.id, comandaId, pagamento, pedido.total_centavos]);
  });
}

export async function finalizarComandaAdmin(banco, comandaId, pagamento, administradorId = null) {
  if (!PAGAMENTOS.has(pagamento) || pagamento === 'A definir') {
    throw erroDominio('Selecione uma forma de pagamento válida.');
  }
  await executarTransacao(banco, async (conexao) => {
    const [comandas] = await conexao.execute(`
      SELECT c.*, m.numero AS mesa_numero
      FROM comandas c
      INNER JOIN mesas m ON m.id = c.mesa_id
      WHERE c.id = ? FOR UPDATE
    `, [comandaId]);
    const comanda = comandas[0];
    if (!comanda) throw erroDominio('Comanda não encontrada.', 404);
    if (comanda.status === 'Encerrada') throw erroDominio('Esta comanda já foi encerrada.', 409);

    const [pedidos] = await conexao.execute('SELECT * FROM pedidos WHERE comanda_id = ? FOR UPDATE', [comandaId]);
    let pedidoId = pedidos[0] ? Number(pedidos[0].id) : null;
    if (!pedidoId) {
      const [resultado] = await conexao.execute(`
        INSERT INTO pedidos
          (origem, cliente, telefone, status, pagamento, taxa_entrega_centavos,
           total_centavos, comanda_id, mesa_id, funcionario_id)
        VALUES ('mesa', ?, 'Atendimento presencial', 'Recebido', ?, 0, 0, ?, ?, ?)
      `, [`Mesa ${comanda.mesa_numero}`, pagamento, comandaId, comanda.mesa_id, comanda.funcionario_id]);
      pedidoId = Number(resultado.insertId);
    } else {
      await conexao.execute('DELETE FROM pedido_itens WHERE pedido_id = ?', [pedidoId]);
    }

    const total = await copiarItensComandaParaPedido(conexao, comandaId, pedidoId);
    await conexao.execute(`
      UPDATE pedidos SET total_centavos = ?, status = 'Entregue na mesa', pagamento = ? WHERE id = ?
    `, [total, pagamento, pedidoId]);
    await conexao.execute(`
      UPDATE comandas SET status = 'Encerrada', pagamento = ?, encerrada_em = CURRENT_TIMESTAMP WHERE id = ?
    `, [pagamento, comandaId]);
    await conexao.execute(`
      INSERT INTO pagamentos
        (pedido_id, comanda_id, forma, status, valor_centavos, pago_em, confirmado_por, confirmado_em)
      VALUES (?, ?, ?, 'Pago', ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
    `, [pedidoId, comandaId, pagamento, total, administradorId]);
    await registrarAuditoria(conexao, administradorId, 'comanda.finalizada', 'pedido', pedidoId, {
      comandaId: Number(comandaId),
      forma: pagamento,
      valorCentavos: total
    });
  });
}

export async function listarDadosPublicos(banco) {
  const [catalogo, promocoes, configuracao] = await Promise.all([
    listarCatalogo(banco),
    listarPromocoes(banco, { somenteAtivas: true }),
    buscarConfiguracao(banco)
  ]);
  return { ...catalogo, promocoes, configuracao };
}

export async function listarDadosAdmin(banco) {
  const [catalogo, promocoes, funcionarios, mesas, comandas, pedidos, configuracao, administradores, auditoria] = await Promise.all([
    listarCatalogo(banco, { administrativo: true }),
    listarPromocoes(banco),
    listarFuncionarios(banco),
    listarMesas(banco),
    listarComandas(banco),
    listarPedidos(banco),
    buscarConfiguracao(banco),
    listarAdministradores(banco),
    listarAuditoriaAdmin(banco)
  ]);
  return { ...catalogo, promocoes, funcionarios, mesas, comandas, pedidos, configuracao, administradores, auditoria };
}

export async function listarDadosGarcom(banco, funcionarioId) {
  const [catalogo, mesas, comandas, configuracao] = await Promise.all([
    listarCatalogo(banco),
    listarMesas(banco),
    listarComandas(banco, { funcionarioId }),
    buscarConfiguracao(banco)
  ]);
  return { ...catalogo, mesas, comandas, configuracao };
}

export { erroDominio };
