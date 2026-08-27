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

async function buscarVinculos(banco, produtosIds = []) {
  if (produtosIds.length === 0) return new Map();
  const marcadores = produtosIds.map(() => '?').join(', ');
  const [linhas] = await banco.execute(`
    SELECT produto_id, adicional_id
    FROM produto_adicionais
    WHERE produto_id IN (${marcadores})
    ORDER BY adicional_id
  `, produtosIds);
  const vinculos = new Map();
  for (const linha of linhas) {
    const produtoId = Number(linha.produto_id);
    if (!vinculos.has(produtoId)) vinculos.set(produtoId, []);
    vinculos.get(produtoId).push(Number(linha.adicional_id));
  }
  return vinculos;
}

const SELECT_PRODUTOS = `
  SELECT p.*, c.nome AS categoria
  FROM produtos p
  INNER JOIN categorias c ON c.id = p.categoria_id
`;

export async function listarCatalogo(banco, { administrativo = false } = {}) {
  const [[categorias], [adicionais], [produtos]] = await Promise.all([
    banco.query(`SELECT id, nome, ordem, ativo FROM categorias ${administrativo ? '' : 'WHERE ativo = 1'} ORDER BY ordem, nome`),
    banco.query(`SELECT * FROM adicionais ${administrativo ? '' : 'WHERE ativo = 1'} ORDER BY nome`),
    banco.query(`${SELECT_PRODUTOS} ${administrativo ? '' : 'WHERE p.ativo = 1 AND c.ativo = 1'} ORDER BY p.id`)
  ]);
  const vinculos = await buscarVinculos(banco, produtos.map((produto) => Number(produto.id)));
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

export async function criarCategoria(banco, dados) {
  const categoria = validarCategoria(dados);
  const [resultado] = await banco.execute(`
    INSERT INTO categorias (nome, ordem, ativo) VALUES (?, ?, ?)
  `, [categoria.nome, categoria.ordem, categoria.ativo]);
  const [linhas] = await banco.execute('SELECT id, nome, ordem, ativo FROM categorias WHERE id = ?', [resultado.insertId]);
  return {
    id: Number(linhas[0].id),
    nome: linhas[0].nome,
    ordem: Number(linhas[0].ordem),
    ativo: Boolean(linhas[0].ativo)
  };
}

export async function atualizarCategoria(banco, id, dados) {
  const categoria = validarCategoria(dados);
  const [resultado] = await banco.execute(`
    UPDATE categorias SET nome = ?, ordem = ?, ativo = ? WHERE id = ?
  `, [categoria.nome, categoria.ordem, categoria.ativo, id]);
  if (!resultado.affectedRows) return null;
  const [linhas] = await banco.execute('SELECT id, nome, ordem, ativo FROM categorias WHERE id = ?', [id]);
  return {
    id: Number(linhas[0].id),
    nome: linhas[0].nome,
    ordem: Number(linhas[0].ordem),
    ativo: Boolean(linhas[0].ativo)
  };
}

export async function alternarStatusCategoria(banco, id, ativo) {
  const [resultado] = await banco.execute('UPDATE categorias SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, id]);
  if (!resultado.affectedRows) return null;
  const [linhas] = await banco.execute('SELECT id, nome, ordem, ativo FROM categorias WHERE id = ?', [id]);
  return {
    id: Number(linhas[0].id),
    nome: linhas[0].nome,
    ordem: Number(linhas[0].ordem),
    ativo: Boolean(linhas[0].ativo)
  };
}

export async function buscarProduto(banco, id) {
  const [linhas] = await banco.execute(`${SELECT_PRODUTOS} WHERE p.id = ?`, [id]);
  if (!linhas[0]) return null;
  const vinculos = await buscarVinculos(banco, [Number(id)]);
  return mapearProduto(linhas[0], vinculos);
}

export async function buscarAdicional(banco, id) {
  const [linhas] = await banco.execute('SELECT * FROM adicionais WHERE id = ?', [id]);
  return linhas[0] ? mapearAdicional(linhas[0]) : null;
}

async function obterCategoriaId(banco, nome) {
  const [linhas] = await banco.execute('SELECT id FROM categorias WHERE nome = ? AND ativo = 1', [nome]);
  return linhas[0] ? Number(linhas[0].id) : null;
}

async function validarProduto(banco, dados) {
  const nome = String(dados.nome ?? '').trim();
  const descricao = String(dados.descricao ?? '').trim();
  const categoriaInformada = Number(dados.categoriaId);
  let categoriaId = Number.isInteger(categoriaInformada) && categoriaInformada > 0
    ? categoriaInformada
    : await obterCategoriaId(banco, String(dados.categoria ?? '').trim());
  if (categoriaId) {
    const [categorias] = await banco.execute('SELECT id FROM categorias WHERE id = ? AND ativo = 1', [categoriaId]);
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
      SELECT COUNT(*) AS total FROM adicionais WHERE id IN (${marcadores})
    `, adicionaisIds);
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

async function salvarVinculos(conexao, produtoId, adicionaisIds) {
  await conexao.execute('DELETE FROM produto_adicionais WHERE produto_id = ?', [produtoId]);
  for (const adicionalId of adicionaisIds) {
    await conexao.execute(`
      INSERT INTO produto_adicionais (produto_id, adicional_id) VALUES (?, ?)
    `, [produtoId, adicionalId]);
  }
}

export async function criarProduto(banco, dados, imagemUrl) {
  const produto = await validarProduto(banco, dados);
  const id = await executarTransacao(banco, async (conexao) => {
    const [resultado] = await conexao.execute(`
      INSERT INTO produtos
        (categoria_id, nome, descricao, preco_centavos, imagem_url, destaque, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      produto.categoriaId,
      produto.nome,
      produto.descricao,
      produto.precoCentavos,
      imagemUrl,
      produto.destaque,
      produto.ativo
    ]);
    await salvarVinculos(conexao, resultado.insertId, produto.adicionaisIds);
    return Number(resultado.insertId);
  });
  return buscarProduto(banco, id);
}

export async function atualizarProduto(banco, id, dados, imagemUrl) {
  if (!await buscarProduto(banco, id)) return null;
  const produto = await validarProduto(banco, dados);

  await executarTransacao(banco, async (conexao) => {
    await conexao.execute(`
      UPDATE produtos
      SET categoria_id = ?, nome = ?, descricao = ?, preco_centavos = ?, imagem_url = ?,
          destaque = ?, ativo = ?
      WHERE id = ?
    `, [
      produto.categoriaId,
      produto.nome,
      produto.descricao,
      produto.precoCentavos,
      imagemUrl,
      produto.destaque,
      produto.ativo,
      id
    ]);
    await salvarVinculos(conexao, id, produto.adicionaisIds);
  });
  return buscarProduto(banco, id);
}

export async function alternarStatusProduto(banco, id, ativo) {
  const [resultado] = await banco.execute('UPDATE produtos SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, id]);
  return resultado.affectedRows ? buscarProduto(banco, id) : null;
}

export async function excluirProduto(banco, id) {
  const [resultado] = await banco.execute('DELETE FROM produtos WHERE id = ?', [id]);
  return resultado.affectedRows > 0;
}

function validarAdicional(dados) {
  const nome = String(dados.nome ?? '').trim();
  const precoCentavos = precoParaCentavos(dados.preco);
  if (!nome) throw new Error('Informe o nome do adicional.');
  if (!Number.isInteger(precoCentavos) || precoCentavos < 0) throw new Error('Informe um preço válido.');
  return { nome, precoCentavos, ativo: dados.ativo === false ? 0 : 1 };
}

export async function criarAdicional(banco, dados) {
  const adicional = validarAdicional(dados);
  const [resultado] = await banco.execute(`
    INSERT INTO adicionais (nome, preco_centavos, ativo) VALUES (?, ?, ?)
  `, [adicional.nome, adicional.precoCentavos, adicional.ativo]);
  return buscarAdicional(banco, Number(resultado.insertId));
}

export async function atualizarAdicional(banco, id, dados) {
  const adicional = validarAdicional(dados);
  const [resultado] = await banco.execute(`
    UPDATE adicionais SET nome = ?, preco_centavos = ?, ativo = ? WHERE id = ?
  `, [adicional.nome, adicional.precoCentavos, adicional.ativo, id]);
  return resultado.affectedRows ? buscarAdicional(banco, id) : null;
}

export async function alternarStatusAdicional(banco, id, ativo) {
  const [resultado] = await banco.execute('UPDATE adicionais SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, id]);
  return resultado.affectedRows ? buscarAdicional(banco, id) : null;
}

export async function excluirAdicional(banco, id) {
  const [resultado] = await banco.execute('DELETE FROM adicionais WHERE id = ?', [id]);
  return resultado.affectedRows > 0;
}
