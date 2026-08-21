import { randomUUID } from 'node:crypto';

import { formatarPreco, listarCatalogo, precoParaCentavos } from './catalog.js';
import { executarTransacao } from './database.js';
import { criarHashSenha, criarHashToken } from './security.js';

const PAGAMENTOS = new Set(['Pix', 'Cartão na entrega', 'Cartão', 'Dinheiro', 'A definir']);
const STATUS_DELIVERY = new Set(['Recebido', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Cancelado']);
const STATUS_MESA = new Set(['Recebido', 'Em preparo', 'Pronto', 'Entregue na mesa', 'Cancelado']);

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

function mapearConfiguracao(linha) {
  return {
    nomeLoja: linha.nome_loja,
    telefone: linha.telefone,
    email: linha.email,
    endereco: linha.endereco,
    taxaEntrega: Number(linha.taxa_entrega_centavos) / 100,
    tempoEntrega: linha.tempo_entrega,
    pedidoMinimo: Number(linha.pedido_minimo_centavos) / 100,
    lojaAberta: Boolean(linha.loja_aberta)
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
  const taxaEntregaCentavos = precoParaCentavos(dados.taxaEntrega);
  const pedidoMinimoCentavos = precoParaCentavos(dados.pedidoMinimo);

  if (!nomeLoja || !telefone || !email || !endereco || !tempoEntrega) {
    throw erroDominio('Preencha todos os dados da lanchonete.');
  }
  if (!Number.isInteger(taxaEntregaCentavos) || taxaEntregaCentavos < 0
      || !Number.isInteger(pedidoMinimoCentavos) || pedidoMinimoCentavos < 0) {
    throw erroDominio('Informe valores válidos para entrega e pedido mínimo.');
  }

  await banco.execute(`
    INSERT INTO configuracoes
      (id, nome_loja, telefone, email, endereco, taxa_entrega_centavos,
       tempo_entrega, pedido_minimo_centavos, loja_aberta)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nome_loja = VALUES(nome_loja), telefone = VALUES(telefone), email = VALUES(email),
      endereco = VALUES(endereco), taxa_entrega_centavos = VALUES(taxa_entrega_centavos),
      tempo_entrega = VALUES(tempo_entrega), pedido_minimo_centavos = VALUES(pedido_minimo_centavos),
      loja_aberta = VALUES(loja_aberta)
  `, [
    nomeLoja,
    telefone,
    email,
    endereco,
    taxaEntregaCentavos,
    tempoEntrega,
    pedidoMinimoCentavos,
    dados.lojaAberta === false ? 0 : 1
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
    ativo: Boolean(linha.ativo)
  };
}

export async function listarPromocoes(banco, { somenteAtivas = false } = {}) {
  const [linhas] = await banco.query(`
    SELECT pr.*, p.imagem_url AS imagem_produto
    FROM promocoes pr
    LEFT JOIN produtos p ON p.id = pr.produto_id
    ${somenteAtivas ? 'WHERE pr.ativo = 1' : ''}
    ORDER BY pr.id
  `);
  return linhas.map(mapearPromocao);
}

async function validarPromocao(banco, dados) {
  const nome = texto(dados.nome, 160);
  const categoria = texto(dados.categoria, 100);
  const descricao = texto(dados.descricao, 2000);
  const precoAnteriorCentavos = precoParaCentavos(dados.precoAntigo || 0);
  const precoCentavos = precoParaCentavos(dados.preco);
  if (!nome || !categoria || !descricao) throw erroDominio('Preencha nome, categoria e descrição da promoção.');
  if (!Number.isInteger(precoAnteriorCentavos) || precoAnteriorCentavos < 0
      || !Number.isInteger(precoCentavos) || precoCentavos < 0) {
    throw erroDominio('Informe preços válidos para a promoção.');
  }

  let produtoId = Number(dados.produtoId) || null;
  if (!produtoId) {
    const [produtos] = await banco.execute('SELECT id FROM produtos WHERE nome = ? LIMIT 1', [nome]);
    produtoId = produtos[0] ? Number(produtos[0].id) : null;
  }

  return {
    produtoId,
    nome,
    categoria,
    descricao,
    precoAnteriorCentavos,
    precoCentavos,
    imagem: texto(dados.imagem, 500) || null,
    destaque: texto(dados.destaque, 100) || null,
    tipo: texto(dados.tipo, 100) || null,
    ativo: dados.ativo === false ? 0 : 1
  };
}

export async function salvarPromocao(banco, dados, id = null) {
  const promocao = await validarPromocao(banco, dados);
  let promocaoId = Number(id) || null;
  if (promocaoId) {
    const [resultado] = await banco.execute(`
      UPDATE promocoes
      SET produto_id = ?, nome = ?, categoria = ?, descricao = ?, preco_anterior_centavos = ?,
          preco_centavos = ?, imagem_url = ?, destaque = ?, tipo = ?, ativo = ?
      WHERE id = ?
    `, [
      promocao.produtoId, promocao.nome, promocao.categoria, promocao.descricao,
      promocao.precoAnteriorCentavos, promocao.precoCentavos, promocao.imagem,
      promocao.destaque, promocao.tipo, promocao.ativo, promocaoId
    ]);
    if (!resultado.affectedRows) throw erroDominio('Promoção não encontrada.', 404);
  } else {
    const [resultado] = await banco.execute(`
      INSERT INTO promocoes
        (produto_id, nome, categoria, descricao, preco_anterior_centavos,
         preco_centavos, imagem_url, destaque, tipo, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      promocao.produtoId, promocao.nome, promocao.categoria, promocao.descricao,
      promocao.precoAnteriorCentavos, promocao.precoCentavos, promocao.imagem,
      promocao.destaque, promocao.tipo, promocao.ativo
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

export async function listarComandas(banco) {
  const [comandas] = await banco.query(`
    SELECT c.*, m.numero AS mesa_numero, f.nome AS garcom
    FROM comandas c
    INNER JOIN mesas m ON m.id = c.mesa_id
    INNER JOIN funcionarios f ON f.id = c.funcionario_id
    WHERE c.status <> 'Encerrada'
    ORDER BY c.aberta_em DESC
  `);
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
    SELECT p.*, m.numero AS mesa_numero, f.nome AS garcom
    FROM pedidos p
    LEFT JOIN mesas m ON m.id = p.mesa_id
    LEFT JOIN funcionarios f ON f.id = p.funcionario_id
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
    return {
      id: codigoPedido(pedido.id),
      cliente: pedido.cliente,
      telefone: pedido.telefone,
      email: pedido.email ?? '',
      origem: pedido.origem === 'delivery' ? 'Delivery' : `Mesa ${pedido.mesa_numero}`,
      status: pedido.status,
      pagamento: pedido.pagamento,
      horario: horaPtBr(pedido.criado_em),
      criadoEm: dataIso(pedido.criado_em),
      endereco,
      referencia: pedido.referencia ?? '',
      observacao: pedido.observacao ?? '',
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

async function buscarItensValidados(conexao, itensRecebidos) {
  if (!Array.isArray(itensRecebidos) || itensRecebidos.length === 0) {
    throw erroDominio('Adicione ao menos um produto ao pedido.');
  }

  const itens = [];
  for (const item of itensRecebidos) {
    const produtoId = Number(item.id ?? item.produtoId);
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(produtoId) || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 50) {
      throw erroDominio('Um item do pedido possui produto ou quantidade inválida.');
    }
    const [produtos] = await conexao.execute(`
      SELECT * FROM produtos WHERE id = ? AND ativo = 1
    `, [produtoId]);
    const produto = produtos[0];
    if (!produto) throw erroDominio('Um produto do pedido não está mais disponível.', 409);

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
      `, [produtoId, ...adicionaisIds]);
      if (linhas.length !== adicionaisIds.length) throw erroDominio('Um adicional não está disponível para o produto.', 409);
      adicionais = linhas.map((linha) => ({
        id: Number(linha.id),
        nome: linha.nome,
        precoCentavos: Number(linha.preco_centavos)
      }));
    }
    const precoCentavos = Number(produto.preco_centavos)
      + adicionais.reduce((total, adicional) => total + adicional.precoCentavos, 0);
    itens.push({
      produtoId,
      nome: produto.nome,
      descricao: produto.descricao,
      imagem: produto.imagem_url,
      precoCentavos,
      quantidade,
      observacao: texto(item.observacao, 1000) || null,
      adicionais
    });
  }
  return itens;
}

async function inserirItensPedido(conexao, pedidoId, itens) {
  for (const item of itens) {
    const [resultado] = await conexao.execute(`
      INSERT INTO pedido_itens
        (pedido_id, produto_id, nome_produto, descricao_produto, imagem_url,
         preco_unitario_centavos, quantidade, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pedidoId, item.produtoId, item.nome, item.descricao, item.imagem,
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

export async function criarPedidoDelivery(banco, dados) {
  const nome = texto(dados.nome, 160);
  const telefone = texto(dados.telefone, 40);
  const email = texto(dados.email, 160);
  const rua = texto(dados.rua, 180);
  const numero = texto(dados.numero, 30);
  const bairro = texto(dados.bairro, 120);
  const pagamento = texto(dados.pagamento, 40);
  if (!nome || !telefone || !email || !rua || !numero || !bairro) {
    throw erroDominio('Preencha os dados do cliente e o endereço de entrega.');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw erroDominio('Informe um e-mail válido.');
  if (!PAGAMENTOS.has(pagamento) || pagamento === 'A definir') throw erroDominio('Selecione uma forma de pagamento válida.');

  const tokenAcompanhamento = randomUUID();
  const pedidoId = await executarTransacao(banco, async (conexao) => {
    const [configuracoes] = await conexao.execute('SELECT * FROM configuracoes WHERE id = 1 FOR UPDATE');
    const configuracao = configuracoes[0];
    if (!configuracao?.loja_aberta) throw erroDominio('A loja está fechada no momento.', 409);

    const itens = await buscarItensValidados(conexao, dados.itens);
    const subtotal = itens.reduce((total, item) => total + item.precoCentavos * item.quantidade, 0);
    if (subtotal < Number(configuracao.pedido_minimo_centavos)) {
      throw erroDominio(`O pedido mínimo é R$ ${formatarPreco(configuracao.pedido_minimo_centavos)}.`, 409);
    }
    const taxaEntrega = Number(configuracao.taxa_entrega_centavos);
    const total = subtotal + taxaEntrega;
    const [resultado] = await conexao.execute(`
      INSERT INTO pedidos
        (token_acompanhamento_hash, origem, cliente, telefone, email, status, pagamento,
         rua, numero, bairro, complemento, referencia, observacao,
         taxa_entrega_centavos, total_centavos)
      VALUES (?, 'delivery', ?, ?, ?, 'Recebido', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      criarHashToken(tokenAcompanhamento), nome, telefone, email, pagamento,
      rua, numero, bairro, texto(dados.complemento, 160) || null,
      texto(dados.referencia, 255) || null, texto(dados.observacao, 2000) || null,
      taxaEntrega, total
    ]);
    await inserirItensPedido(conexao, resultado.insertId, itens);
    await conexao.execute(`
      INSERT INTO pagamentos (pedido_id, forma, status, valor_centavos)
      VALUES (?, ?, 'Pendente', ?)
    `, [resultado.insertId, pagamento, total]);
    return Number(resultado.insertId);
  });

  const [pedido] = await listarPedidos(banco, { id: pedidoId });
  return { ...pedido, tokenAcompanhamento };
}

export async function acompanharPedido(banco, codigo, token) {
  const id = idPedidoPeloCodigo(codigo);
  if (!id || !token) return null;
  const [linhas] = await banco.execute(`
    SELECT id FROM pedidos
    WHERE id = ? AND origem = 'delivery' AND token_acompanhamento_hash = ?
  `, [id, criarHashToken(token)]);
  if (!linhas[0]) return null;
  const [pedido] = await listarPedidos(banco, { id });
  return { ...pedido, tokenAcompanhamento: token };
}

export async function atualizarStatusPedido(banco, codigo, status) {
  const id = idPedidoPeloCodigo(codigo);
  const [linhas] = await banco.execute('SELECT origem FROM pedidos WHERE id = ?', [id]);
  if (!linhas[0]) return null;
  const permitidos = linhas[0].origem === 'delivery' ? STATUS_DELIVERY : STATUS_MESA;
  if (!permitidos.has(status)) throw erroDominio('Status inválido para a origem deste pedido.');
  await banco.execute('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
  const [pedido] = await listarPedidos(banco, { id });
  return pedido;
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
    const [resultado] = await conexao.execute(`
      DELETE FROM comanda_itens WHERE id = ? AND comanda_id = ?
    `, [itemId, comandaId]);
    if (!resultado.affectedRows) throw erroDominio('Item da comanda não encontrado.', 404);
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
  return itens.reduce((total, item) => total + Number(item.preco_unitario_centavos) * Number(item.quantidade), 0);
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
    await obterComandaDoGarcom(conexao, comandaId, funcionarioId, { bloquear: true });
    await conexao.execute("UPDATE comandas SET status = 'Conta solicitada' WHERE id = ?", [comandaId]);
  });
}

export async function fecharComanda(banco, comandaId, funcionarioId, pagamento) {
  if (!PAGAMENTOS.has(pagamento) || pagamento === 'A definir') throw erroDominio('Selecione uma forma de pagamento válida.');
  await executarTransacao(banco, async (conexao) => {
    await obterComandaDoGarcom(conexao, comandaId, funcionarioId, { bloquear: true });
    const [pedidos] = await conexao.execute('SELECT * FROM pedidos WHERE comanda_id = ? FOR UPDATE', [comandaId]);
    const pedido = pedidos[0];
    if (!pedido) throw erroDominio('Envie a comanda para a cozinha antes de fechá-la.', 409);
    await conexao.execute(`
      UPDATE comandas SET status = 'Encerrada', pagamento = ?, encerrada_em = CURRENT_TIMESTAMP WHERE id = ?
    `, [pagamento, comandaId]);
    await conexao.execute(`
      UPDATE pedidos SET status = 'Entregue na mesa', pagamento = ? WHERE id = ?
    `, [pagamento, pedido.id]);
    await conexao.execute('DELETE FROM pagamentos WHERE pedido_id = ?', [pedido.id]);
    await conexao.execute(`
      INSERT INTO pagamentos (pedido_id, comanda_id, forma, status, valor_centavos, pago_em)
      VALUES (?, ?, ?, 'Pago', ?, CURRENT_TIMESTAMP)
    `, [pedido.id, comandaId, pagamento, pedido.total_centavos]);
  });
}

export async function listarDadosPublicos(banco) {
  const [catalogo, promocoes, funcionarios, configuracao] = await Promise.all([
    listarCatalogo(banco),
    listarPromocoes(banco, { somenteAtivas: true }),
    listarFuncionarios(banco, { somenteAtivos: true }),
    buscarConfiguracao(banco)
  ]);
  return { ...catalogo, promocoes, funcionarios, configuracao };
}

export async function listarDadosAdmin(banco) {
  const [catalogo, promocoes, funcionarios, mesas, comandas, pedidos, configuracao] = await Promise.all([
    listarCatalogo(banco),
    listarPromocoes(banco),
    listarFuncionarios(banco),
    listarMesas(banco),
    listarComandas(banco),
    listarPedidos(banco),
    buscarConfiguracao(banco)
  ]);
  return { ...catalogo, promocoes, funcionarios, mesas, comandas, pedidos, configuracao };
}

export async function listarDadosGarcom(banco) {
  const [catalogo, mesas, comandas, configuracao] = await Promise.all([
    listarCatalogo(banco),
    listarMesas(banco),
    listarComandas(banco),
    buscarConfiguracao(banco)
  ]);
  return { ...catalogo, mesas, comandas, configuracao };
}

export { erroDominio };
