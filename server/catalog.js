import { executarTransacao } from './database.js';

export function formatarPreco(centavos) {
  return (Number(centavos) / 100).toFixed(2).replace('.', ',');
}

export function precoParaCentavos(valor) {
  if (typeof valor === 'number') return Math.round(valor * 100);

  const texto = String(valor ?? '').trim().replace(/\s/g, '');
  if (!texto) return Number.NaN;

  const normalizado = texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  return Math.round(Number(normalizado) * 100);
}

function mapearAdicional(linha) {
  return {
    id: Number(linha.id),
    nome: linha.nome,
    preco: Number(linha.preco_centavos) / 100,
    ativo: Boolean(linha.ativo)
  };
}

function mapearProduto(linha, vinculos) {
  return {
    id: Number(linha.id),
    categoriaId: Number(linha.categoria_id),
    nome: linha.nome,
    categoria: linha.categoria,
    descricao: linha.descricao,
    preco: formatarPreco(linha.preco_centavos),
    imagem: linha.imagem_url,
    adicionaisIds: vinculos.get(Number(linha.id)) ?? [],
    destaque: linha.destaque ?? '',
    ativo: Boolean(linha.ativo)
  };
}

async function buscarVinculos(banco, idEstabelecimento, produtosIds = []) {
  if (produtosIds.length === 0) return new Map();
  const marcadores = produtosIds.map(() => '?').join(', ');
  const [linhas] = await banco.execute(`
    SELECT produto_id, adicional_id
    FROM produto_adicionais
    WHERE id_estabelecimento = ? AND produto_id IN (${marcadores})
    ORDER BY adicional_id
  `, [idEstabelecimento, ...produtosIds]);
  const vinculos = new Map();
  for (const linha of linhas) {
    const produtoId = Number(linha.produto_id);
    if (!vinculos.has(produtoId)) vinculos.set(produtoId, []);
    vinculos.get(produtoId).push(Number(linha.adicional_id));
  }
  return vinculos;
}

const SELECT_PRODUTOS = `
  SELECT p.id, p.categoria_id, p.nome, p.descricao, p.preco_centavos,
         p.imagem_url, p.destaque, p.ativo, c.nome AS categoria
  FROM produtos p
  INNER JOIN categorias c
    ON c.id = p.categoria_id AND c.id_estabelecimento = p.id_estabelecimento
`;

export async function listarCatalogo(banco, idEstabelecimento, { administrativo = false } = {}) {
  const [[categorias], [adicionais], [produtos]] = await Promise.all([
    banco.execute(`
      SELECT id, nome, ordem, ativo
      FROM categorias
      WHERE id_estabelecimento = ? ${administrativo ? '' : 'AND ativo = 1'}
      ORDER BY ordem, nome
    `, [idEstabelecimento]),
    banco.execute(`
      SELECT id, nome, preco_centavos, ativo
      FROM adicionais
      WHERE id_estabelecimento = ? ${administrativo ? '' : 'AND ativo = 1'}
      ORDER BY nome
    `, [idEstabelecimento]),
    banco.execute(`${SELECT_PRODUTOS}
      WHERE p.id_estabelecimento = ? ${administrativo ? '' : 'AND p.ativo = 1 AND c.ativo = 1'}
      ORDER BY p.id
    `, [idEstabelecimento])
  ]);
  const vinculos = await buscarVinculos(banco, idEstabelecimento, produtos.map((produto) => Number(produto.id)));
  return {
    categorias: categorias.map((categoria) => ({
      id: Number(categoria.id),
      nome: categoria.nome,
      ordem: Number(categoria.ordem),
      ativo: Boolean(categoria.ativo)
    })),
    adicionais: adicionais.map(mapearAdicional),
    produtos: produtos.map((produto) => mapearProduto(produto, vinculos))
  };
}

function validarCategoria(dados) {
  const nome = String(dados?.nome ?? '').trim().slice(0, 100);
  const ordem = Number(dados?.ordem ?? 0);
  if (!nome) throw new Error('Informe o nome da categoria.');
  if (!Number.isInteger(ordem) || ordem < 0 || ordem > 9999) {
    throw new Error('Informe uma ordem entre 0 e 9999.');
  }
  return { nome, ordem, ativo: dados?.ativo === false ? 0 : 1 };
}

export async function criarCategoria(banco, idEstabelecimento, dados) {
  const categoria = validarCategoria(dados);
  const [resultado] = await banco.execute(`
    INSERT INTO categorias (id_estabelecimento, nome, ordem, ativo) VALUES (?, ?, ?, ?)
  `, [idEstabelecimento, categoria.nome, categoria.ordem, categoria.ativo]);
  const [linhas] = await banco.execute(`
    SELECT id, nome, ordem, ativo
    FROM categorias
    WHERE id = ? AND id_estabelecimento = ?
  `, [resultado.insertId, idEstabelecimento]);
  return {
    id: Number(linhas[0].id),
    nome: linhas[0].nome,
    ordem: Number(linhas[0].ordem),
    ativo: Boolean(linhas[0].ativo)
  };
}

export async function atualizarCategoria(banco, idEstabelecimento, id, dados) {
  const categoria = validarCategoria(dados);
  const [resultado] = await banco.execute(`
    UPDATE categorias SET nome = ?, ordem = ?, ativo = ?
    WHERE id = ? AND id_estabelecimento = ?
  `, [categoria.nome, categoria.ordem, categoria.ativo, id, idEstabelecimento]);
  if (!resultado.affectedRows) return null;
  const [linhas] = await banco.execute(`
    SELECT id, nome, ordem, ativo
    FROM categorias
    WHERE id = ? AND id_estabelecimento = ?
  `, [id, idEstabelecimento]);
  return {
    id: Number(linhas[0].id),
    nome: linhas[0].nome,
    ordem: Number(linhas[0].ordem),
    ativo: Boolean(linhas[0].ativo)
  };
}

export async function alternarStatusCategoria(banco, idEstabelecimento, id, ativo) {
  const [resultado] = await banco.execute(`
    UPDATE categorias SET ativo = ? WHERE id = ? AND id_estabelecimento = ?
  `, [ativo ? 1 : 0, id, idEstabelecimento]);
  if (!resultado.affectedRows) return null;
  const [linhas] = await banco.execute(`
    SELECT id, nome, ordem, ativo
    FROM categorias
    WHERE id = ? AND id_estabelecimento = ?
  `, [id, idEstabelecimento]);
  return {
    id: Number(linhas[0].id),
    nome: linhas[0].nome,
    ordem: Number(linhas[0].ordem),
    ativo: Boolean(linhas[0].ativo)
  };
}

export async function buscarProduto(banco, idEstabelecimento, id) {
  const [linhas] = await banco.execute(`
    ${SELECT_PRODUTOS}
    WHERE p.id = ? AND p.id_estabelecimento = ?
  `, [id, idEstabelecimento]);
  if (!linhas[0]) return null;
  const vinculos = await buscarVinculos(banco, idEstabelecimento, [Number(id)]);
  return mapearProduto(linhas[0], vinculos);
}

export async function buscarAdicional(banco, idEstabelecimento, id) {
  const [linhas] = await banco.execute(`
    SELECT id, nome, preco_centavos, ativo
    FROM adicionais
    WHERE id = ? AND id_estabelecimento = ?
  `, [id, idEstabelecimento]);
  return linhas[0] ? mapearAdicional(linhas[0]) : null;
}

async function obterCategoriaId(banco, idEstabelecimento, nome) {
  const [linhas] = await banco.execute(`
    SELECT id FROM categorias
    WHERE nome = ? AND ativo = 1 AND id_estabelecimento = ?
  `, [nome, idEstabelecimento]);
  return linhas[0] ? Number(linhas[0].id) : null;
}

async function validarProduto(banco, idEstabelecimento, dados) {
  const nome = String(dados.nome ?? '').trim();
  const descricao = String(dados.descricao ?? '').trim();
  const categoriaInformada = Number(dados.categoriaId);
  let categoriaId = Number.isInteger(categoriaInformada) && categoriaInformada > 0
    ? categoriaInformada
    : await obterCategoriaId(banco, idEstabelecimento, String(dados.categoria ?? '').trim());
  if (categoriaId) {
    const [categorias] = await banco.execute(`
      SELECT id FROM categorias
      WHERE id = ? AND ativo = 1 AND id_estabelecimento = ?
    `, [categoriaId, idEstabelecimento]);
    categoriaId = categorias[0] ? Number(categorias[0].id) : null;
  }
  const precoCentavos = precoParaCentavos(dados.preco);
  const adicionaisIds = [...new Set((dados.adicionaisIds ?? []).map(Number))]
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!nome || !descricao) throw new Error('Informe o nome e a descrição do produto.');
  if (!categoriaId) throw new Error('Selecione uma categoria válida.');
  if (!Number.isInteger(precoCentavos) || precoCentavos < 0) throw new Error('Informe um preço válido.');

  if (adicionaisIds.length > 0) {
    const marcadores = adicionaisIds.map(() => '?').join(', ');
    const [linhas] = await banco.execute(`
      SELECT COUNT(*) AS total FROM adicionais
      WHERE id_estabelecimento = ? AND id IN (${marcadores})
    `, [idEstabelecimento, ...adicionaisIds]);
    if (Number(linhas[0].total) !== adicionaisIds.length) throw new Error('Um ou mais adicionais não existem.');
  }

  return {
    nome,
    descricao,
    categoriaId,
    precoCentavos,
    adicionaisIds,
    destaque: String(dados.destaque ?? '').trim() || null,
    ativo: dados.ativo === false ? 0 : 1
  };
}

async function salvarVinculos(conexao, idEstabelecimento, produtoId, adicionaisIds) {
  await conexao.execute(`
    DELETE FROM produto_adicionais
    WHERE produto_id = ? AND id_estabelecimento = ?
  `, [produtoId, idEstabelecimento]);
  for (const adicionalId of adicionaisIds) {
    await conexao.execute(`
      INSERT INTO produto_adicionais (id_estabelecimento, produto_id, adicional_id)
      VALUES (?, ?, ?)
    `, [idEstabelecimento, produtoId, adicionalId]);
  }
}

export async function criarProduto(banco, idEstabelecimento, dados, imagemUrl) {
  const produto = await validarProduto(banco, idEstabelecimento, dados);
  const id = await executarTransacao(banco, async (conexao) => {
    const [resultado] = await conexao.execute(`
      INSERT INTO produtos
        (id_estabelecimento, categoria_id, nome, descricao, preco_centavos, imagem_url, destaque, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      idEstabelecimento,
      produto.categoriaId,
      produto.nome,
      produto.descricao,
      produto.precoCentavos,
      imagemUrl,
      produto.destaque,
      produto.ativo
    ]);
    await salvarVinculos(conexao, idEstabelecimento, resultado.insertId, produto.adicionaisIds);
    return Number(resultado.insertId);
  });
  return buscarProduto(banco, idEstabelecimento, id);
}

export async function atualizarProduto(banco, idEstabelecimento, id, dados, imagemUrl) {
  if (!await buscarProduto(banco, idEstabelecimento, id)) return null;
  const produto = await validarProduto(banco, idEstabelecimento, dados);

  await executarTransacao(banco, async (conexao) => {
    await conexao.execute(`
      UPDATE produtos
      SET categoria_id = ?, nome = ?, descricao = ?, preco_centavos = ?, imagem_url = ?,
          destaque = ?, ativo = ?
      WHERE id = ? AND id_estabelecimento = ?
    `, [
      produto.categoriaId,
      produto.nome,
      produto.descricao,
      produto.precoCentavos,
      imagemUrl,
      produto.destaque,
      produto.ativo,
      id,
      idEstabelecimento
    ]);
    await salvarVinculos(conexao, idEstabelecimento, id, produto.adicionaisIds);
  });
  return buscarProduto(banco, idEstabelecimento, id);
}

export async function alternarStatusProduto(banco, idEstabelecimento, id, ativo) {
  const [resultado] = await banco.execute(`
    UPDATE produtos SET ativo = ? WHERE id = ? AND id_estabelecimento = ?
  `, [ativo ? 1 : 0, id, idEstabelecimento]);
  return resultado.affectedRows ? buscarProduto(banco, idEstabelecimento, id) : null;
}

export async function excluirProduto(banco, idEstabelecimento, id) {
  const [resultado] = await banco.execute(`
    DELETE FROM produtos WHERE id = ? AND id_estabelecimento = ?
  `, [id, idEstabelecimento]);
  return resultado.affectedRows > 0;
}

function validarAdicional(dados) {
  const nome = String(dados.nome ?? '').trim();
  const precoCentavos = precoParaCentavos(dados.preco);
  if (!nome) throw new Error('Informe o nome do adicional.');
  if (!Number.isInteger(precoCentavos) || precoCentavos < 0) throw new Error('Informe um preço válido.');
  return { nome, precoCentavos, ativo: dados.ativo === false ? 0 : 1 };
}

export async function criarAdicional(banco, idEstabelecimento, dados) {
  const adicional = validarAdicional(dados);
  const [resultado] = await banco.execute(`
    INSERT INTO adicionais (id_estabelecimento, nome, preco_centavos, ativo)
    VALUES (?, ?, ?, ?)
  `, [idEstabelecimento, adicional.nome, adicional.precoCentavos, adicional.ativo]);
  return buscarAdicional(banco, idEstabelecimento, Number(resultado.insertId));
}

export async function atualizarAdicional(banco, idEstabelecimento, id, dados) {
  const adicional = validarAdicional(dados);
  const [resultado] = await banco.execute(`
    UPDATE adicionais SET nome = ?, preco_centavos = ?, ativo = ?
    WHERE id = ? AND id_estabelecimento = ?
  `, [adicional.nome, adicional.precoCentavos, adicional.ativo, id, idEstabelecimento]);
  return resultado.affectedRows ? buscarAdicional(banco, idEstabelecimento, id) : null;
}

export async function alternarStatusAdicional(banco, idEstabelecimento, id, ativo) {
  const [resultado] = await banco.execute(`
    UPDATE adicionais SET ativo = ? WHERE id = ? AND id_estabelecimento = ?
  `, [ativo ? 1 : 0, id, idEstabelecimento]);
  return resultado.affectedRows ? buscarAdicional(banco, idEstabelecimento, id) : null;
}

export async function excluirAdicional(banco, idEstabelecimento, id) {
  const [resultado] = await banco.execute(`
    DELETE FROM adicionais WHERE id = ? AND id_estabelecimento = ?
  `, [id, idEstabelecimento]);
  return resultado.affectedRows > 0;
}
