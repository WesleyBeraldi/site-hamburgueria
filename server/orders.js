import { precoParaCentavos } from './catalog.js';
import { executarTransacao } from './database.js';
import { criarHashToken, criarTokenSessao } from './security.js';

const STATUS_DELIVERY = ['Recebido', 'Em preparo', 'Saiu para entrega', 'Entregue', 'Cancelado'];
const FORMAS_PAGAMENTO = ['Pix', 'Cartão na entrega', 'Dinheiro'];

function texto(valor, nome, { obrigatorio = true, maximo = 200 } = {}) {
  const resultado = String(valor ?? '').trim();
  if (obrigatorio && !resultado) throw new Error(`Informe ${nome}.`);
  if (resultado.length > maximo) throw new Error(`${nome} ultrapassa o limite de ${maximo} caracteres.`);
  return resultado;
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

export function obterConfiguracao(banco) {
  return mapearConfiguracao(banco.prepare('SELECT * FROM configuracoes WHERE id = 1').get());
}

export function atualizarConfiguracao(banco, dados) {
  const taxaEntregaCentavos = precoParaCentavos(dados.taxaEntrega);
  const pedidoMinimoCentavos = precoParaCentavos(dados.pedidoMinimo);
  if (!Number.isInteger(taxaEntregaCentavos) || taxaEntregaCentavos < 0) {
    throw new Error('Informe uma taxa de entrega válida.');
  }
  if (!Number.isInteger(pedidoMinimoCentavos) || pedidoMinimoCentavos < 0) {
    throw new Error('Informe um pedido mínimo válido.');
  }

  banco.prepare(`
    UPDATE configuracoes
    SET nome_loja = ?, telefone = ?, email = ?, endereco = ?, taxa_entrega_centavos = ?,
        tempo_entrega = ?, pedido_minimo_centavos = ?, loja_aberta = ?, atualizado_em = ?
    WHERE id = 1
  `).run(
    texto(dados.nomeLoja, 'o nome da loja'),
    texto(dados.telefone, 'o telefone'),
    texto(dados.email, 'o e-mail'),
    texto(dados.endereco, 'o endereço'),
    taxaEntregaCentavos,
    texto(dados.tempoEntrega, 'o tempo estimado', { maximo: 80 }),
    pedidoMinimoCentavos,
    dados.lojaAberta === false ? 0 : 1,
    new Date().toISOString()
  );
  return obterConfiguracao(banco);
}

function mapearPedido(banco, linha) {
  const itens = banco.prepare(`
    SELECT * FROM pedido_itens WHERE pedido_id = ? ORDER BY id
  `).all(linha.id).map((item) => {
    const adicionais = banco.prepare(`
      SELECT adicional_id, nome_snapshot, preco_centavos
      FROM pedido_item_adicionais WHERE pedido_item_id = ? ORDER BY id
    `).all(item.id).map((adicional) => ({
      id: adicional.adicional_id === null ? null : Number(adicional.adicional_id),
      nome: adicional.nome_snapshot,
      preco: Number(adicional.preco_centavos) / 100
    }));

    return {
      id: Number(item.id),
      produtoId: item.produto_id === null ? null : Number(item.produto_id),
      nome: item.nome_snapshot,
      descricao: item.descricao_snapshot,
      preco: Number(item.preco_unitario_centavos) / 100,
      imagem: item.imagem_url_snapshot,
      quantidade: Number(item.quantidade),
      observacao: item.observacao ?? '',
      adicionais
    };
  });

  const criadoEm = linha.criado_em;
  return {
    id: linha.codigo,
    cliente: linha.cliente,
    telefone: linha.telefone,
    email: linha.email,
    origem: linha.origem,
    status: linha.status,
    pagamento: linha.pagamento,
    horario: new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).format(new Date(criadoEm)),
    criadoEm,
    endereco: `${linha.rua}, ${linha.numero} - ${linha.bairro}${linha.complemento ? `, ${linha.complemento}` : ''}`,
    referencia: linha.referencia ?? '',
    observacao: linha.observacao ?? '',
    itens,
    subtotal: Number(linha.subtotal_centavos) / 100,
    taxaEntrega: Number(linha.taxa_entrega_centavos) / 100,
    total: Number(linha.total_centavos) / 100,
    previsao: linha.previsao
  };
}

function buscarLinhaPedido(banco, codigo) {
  return banco.prepare('SELECT * FROM pedidos WHERE codigo = ?').get(String(codigo));
}

export function listarPedidosAdmin(banco) {
  return banco.prepare('SELECT * FROM pedidos ORDER BY criado_em DESC, id DESC').all()
    .map((linha) => mapearPedido(banco, linha));
}

export function buscarPedidoAdmin(banco, codigo) {
  const linha = buscarLinhaPedido(banco, codigo);
  return linha ? mapearPedido(banco, linha) : null;
}

function validarDadosPedido(dados) {
  const email = texto(dados.email, 'o e-mail', { maximo: 160 });
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (!FORMAS_PAGAMENTO.includes(dados.pagamento)) throw new Error('Selecione uma forma de pagamento válida.');
  if (!Array.isArray(dados.itens) || dados.itens.length === 0) throw new Error('Adicione pelo menos um produto ao pedido.');
  if (dados.itens.length > 50) throw new Error('O pedido possui itens demais.');

  return {
    cliente: texto(dados.nome, 'o nome do cliente', { maximo: 120 }),
    telefone: texto(dados.telefone, 'o telefone', { maximo: 30 }),
    email,
    rua: texto(dados.rua, 'a rua', { maximo: 180 }),
    numero: texto(dados.numero, 'o número', { maximo: 30 }),
    bairro: texto(dados.bairro, 'o bairro', { maximo: 120 }),
    complemento: texto(dados.complemento, 'o complemento', { obrigatorio: false, maximo: 120 }),
    referencia: texto(dados.referencia, 'a referência', { obrigatorio: false, maximo: 180 }),
    observacao: texto(dados.observacao, 'a observação', { obrigatorio: false, maximo: 500 }),
    pagamento: dados.pagamento,
    itens: dados.itens
  };
}

function montarItens(banco, itensEnviados) {
  return itensEnviados.map((item) => {
    const produtoId = Number(item.produtoId);
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(produtoId) || produtoId <= 0) throw new Error('Um produto do pedido é inválido.');
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 20) {
      throw new Error('A quantidade de cada produto deve estar entre 1 e 20.');
    }

    const produto = banco.prepare(`
      SELECT id, nome, descricao, preco_centavos, imagem_url
      FROM produtos WHERE id = ? AND ativo = 1
    `).get(produtoId);
    if (!produto) throw new Error('Um produto selecionado não está mais disponível.');

    const adicionaisIds = [...new Set((Array.isArray(item.adicionaisIds) ? item.adicionaisIds : []).map(Number))];
    if (adicionaisIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new Error('Um adicional do pedido é inválido.');
    }

    let adicionais = [];
    if (adicionaisIds.length) {
      const marcadores = adicionaisIds.map(() => '?').join(', ');
      adicionais = banco.prepare(`
        SELECT a.id, a.nome, a.preco_centavos
        FROM adicionais a
        INNER JOIN produto_adicionais pa ON pa.adicional_id = a.id
        WHERE pa.produto_id = ? AND a.ativo = 1 AND a.id IN (${marcadores})
        ORDER BY a.id
      `).all(produtoId, ...adicionaisIds);
      if (adicionais.length !== adicionaisIds.length) {
        throw new Error('Um adicional não está disponível para o produto escolhido.');
      }
    }

    const precoUnitarioCentavos = Number(produto.preco_centavos)
      + adicionais.reduce((total, adicional) => total + Number(adicional.preco_centavos), 0);
    return {
      produto,
      quantidade,
      adicionais,
      observacao: texto(item.observacao, 'a observação do item', { obrigatorio: false, maximo: 300 }),
      precoUnitarioCentavos,
      totalCentavos: precoUnitarioCentavos * quantidade
    };
  });
}

export function criarPedidoDelivery(banco, dados) {
  const pedidoValidado = validarDadosPedido(dados);
  const configuracao = banco.prepare('SELECT * FROM configuracoes WHERE id = 1').get();
  if (!configuracao.loja_aberta) throw new Error('A loja está fechada no momento.');

  const itens = montarItens(banco, pedidoValidado.itens);
  const subtotalCentavos = itens.reduce((total, item) => total + item.totalCentavos, 0);
  if (subtotalCentavos < Number(configuracao.pedido_minimo_centavos)) {
    const minimo = (Number(configuracao.pedido_minimo_centavos) / 100).toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL'
    });
    throw new Error(`O pedido mínimo é ${minimo}.`);
  }

  const tokenAcompanhamento = criarTokenSessao();
  const agora = new Date().toISOString();
  const taxaEntregaCentavos = Number(configuracao.taxa_entrega_centavos);
  const totalCentavos = subtotalCentavos + taxaEntregaCentavos;

  const codigo = executarTransacao(banco, () => {
    const resultado = banco.prepare(`
      INSERT INTO pedidos (
        token_acompanhamento_hash, cliente, telefone, email, rua, numero, bairro,
        complemento, referencia, observacao, pagamento, subtotal_centavos,
        taxa_entrega_centavos, total_centavos, previsao, criado_em, atualizado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      criarHashToken(tokenAcompanhamento), pedidoValidado.cliente, pedidoValidado.telefone,
      pedidoValidado.email, pedidoValidado.rua, pedidoValidado.numero, pedidoValidado.bairro,
      pedidoValidado.complemento || null, pedidoValidado.referencia || null,
      pedidoValidado.observacao || null, pedidoValidado.pagamento, subtotalCentavos,
      taxaEntregaCentavos, totalCentavos, configuracao.tempo_entrega, agora, agora
    );
    const pedidoId = Number(resultado.lastInsertRowid);
    const novoCodigo = `#PED${String(1000 + pedidoId)}`;
    banco.prepare('UPDATE pedidos SET codigo = ? WHERE id = ?').run(novoCodigo, pedidoId);

    const inserirItem = banco.prepare(`
      INSERT INTO pedido_itens (
        pedido_id, produto_id, nome_snapshot, descricao_snapshot, preco_unitario_centavos,
        imagem_url_snapshot, quantidade, observacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const inserirAdicional = banco.prepare(`
      INSERT INTO pedido_item_adicionais (pedido_item_id, adicional_id, nome_snapshot, preco_centavos)
      VALUES (?, ?, ?, ?)
    `);
    itens.forEach((item) => {
      const resultadoItem = inserirItem.run(
        pedidoId, item.produto.id, item.produto.nome, item.produto.descricao,
        item.precoUnitarioCentavos, item.produto.imagem_url, item.quantidade,
        item.observacao || null
      );
      const pedidoItemId = Number(resultadoItem.lastInsertRowid);
      item.adicionais.forEach((adicional) => inserirAdicional.run(
        pedidoItemId, adicional.id, adicional.nome, adicional.preco_centavos
      ));
    });
    return novoCodigo;
  });

  return { pedido: buscarPedidoAdmin(banco, codigo), tokenAcompanhamento };
}

export function buscarPedidoAcompanhamento(banco, codigo, token) {
  if (!token) return null;
  const linha = banco.prepare(`
    SELECT * FROM pedidos WHERE codigo = ? AND token_acompanhamento_hash = ?
  `).get(String(codigo), criarHashToken(String(token)));
  return linha ? mapearPedido(banco, linha) : null;
}

export function atualizarStatusPedido(banco, codigo, status) {
  if (!STATUS_DELIVERY.includes(status)) throw new Error('Selecione um status válido.');
  const resultado = banco.prepare(`
    UPDATE pedidos SET status = ?, atualizado_em = ? WHERE codigo = ?
  `).run(status, new Date().toISOString(), String(codigo));
  return resultado.changes ? buscarPedidoAdmin(banco, codigo) : null;
}
