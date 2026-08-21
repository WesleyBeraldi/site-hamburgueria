import { executarTransacao } from './database.js';

function formatarPreco(centavos) {
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

function mapearProduto(banco, linha) {
  const adicionaisIds = banco.prepare(`
    SELECT adicional_id FROM produto_adicionais WHERE produto_id = ? ORDER BY adicional_id
  `).all(linha.id).map((item) => Number(item.adicional_id));

  return {
    id: Number(linha.id),
    nome: linha.nome,
    categoria: linha.categoria,
    descricao: linha.descricao,
    preco: formatarPreco(linha.preco_centavos),
    imagem: linha.imagem_url,
    adicionaisIds,
    destaque: linha.destaque ?? '',
    ativo: Boolean(linha.ativo)
  };
}

const SELECT_PRODUTOS = `
  SELECT p.*, c.nome AS categoria
  FROM produtos p
  INNER JOIN categorias c ON c.id = p.categoria_id
`;

export function listarCatalogo(banco) {
  const categorias = banco.prepare(`
    SELECT id, nome FROM categorias WHERE ativo = 1 ORDER BY ordem, nome
  `).all().map((categoria) => ({ id: Number(categoria.id), nome: categoria.nome }));
  const adicionais = banco.prepare('SELECT * FROM adicionais ORDER BY nome').all().map(mapearAdicional);
  const produtos = banco.prepare(`${SELECT_PRODUTOS} ORDER BY p.id`).all()
    .map((produto) => mapearProduto(banco, produto));

  return { categorias, adicionais, produtos };
}

export function buscarProduto(banco, id) {
  const linha = banco.prepare(`${SELECT_PRODUTOS} WHERE p.id = ?`).get(id);
  return linha ? mapearProduto(banco, linha) : null;
}

export function buscarAdicional(banco, id) {
  const linha = banco.prepare('SELECT * FROM adicionais WHERE id = ?').get(id);
  return linha ? mapearAdicional(linha) : null;
}

function obterCategoriaId(banco, nome) {
  const categoria = banco.prepare('SELECT id FROM categorias WHERE nome = ? COLLATE NOCASE AND ativo = 1').get(nome);
  return categoria ? Number(categoria.id) : null;
}

function validarProduto(banco, dados) {
  const nome = String(dados.nome ?? '').trim();
  const descricao = String(dados.descricao ?? '').trim();
  const categoriaId = obterCategoriaId(banco, String(dados.categoria ?? '').trim());
  const precoCentavos = precoParaCentavos(dados.preco);
  const adicionaisIds = [...new Set((dados.adicionaisIds ?? []).map(Number))]
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!nome || !descricao) throw new Error('Informe o nome e a descrição do produto.');
  if (!categoriaId) throw new Error('Selecione uma categoria válida.');
  if (!Number.isInteger(precoCentavos) || precoCentavos < 0) throw new Error('Informe um preço válido.');

  if (adicionaisIds.length > 0) {
    const marcadores = adicionaisIds.map(() => '?').join(', ');
    const encontrados = banco.prepare(`SELECT COUNT(*) AS total FROM adicionais WHERE id IN (${marcadores})`)
      .get(...adicionaisIds).total;
    if (Number(encontrados) !== adicionaisIds.length) throw new Error('Um ou mais adicionais não existem.');
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

function salvarVinculos(banco, produtoId, adicionaisIds) {
  banco.prepare('DELETE FROM produto_adicionais WHERE produto_id = ?').run(produtoId);
  const inserir = banco.prepare('INSERT INTO produto_adicionais (produto_id, adicional_id) VALUES (?, ?)');
  adicionaisIds.forEach((adicionalId) => inserir.run(produtoId, adicionalId));
}

export function criarProduto(banco, dados, imagemUrl) {
  const produto = validarProduto(banco, dados);
  const id = executarTransacao(banco, () => {
    const resultado = banco.prepare(`
      INSERT INTO produtos
        (categoria_id, nome, descricao, preco_centavos, imagem_url, destaque, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      produto.categoriaId,
      produto.nome,
      produto.descricao,
      produto.precoCentavos,
      imagemUrl,
      produto.destaque,
      produto.ativo
    );
    const novoId = Number(resultado.lastInsertRowid);
    salvarVinculos(banco, novoId, produto.adicionaisIds);
    return novoId;
  });
  return buscarProduto(banco, id);
}

export function atualizarProduto(banco, id, dados, imagemUrl) {
  if (!buscarProduto(banco, id)) return null;
  const produto = validarProduto(banco, dados);

  executarTransacao(banco, () => {
    banco.prepare(`
      UPDATE produtos
      SET categoria_id = ?, nome = ?, descricao = ?, preco_centavos = ?, imagem_url = ?,
          destaque = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      produto.categoriaId,
      produto.nome,
      produto.descricao,
      produto.precoCentavos,
      imagemUrl,
      produto.destaque,
      produto.ativo,
      id
    );
    salvarVinculos(banco, id, produto.adicionaisIds);
  });
  return buscarProduto(banco, id);
}

export function alternarStatusProduto(banco, id, ativo) {
  const resultado = banco.prepare(`
    UPDATE produtos SET ativo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(ativo ? 1 : 0, id);
  return resultado.changes ? buscarProduto(banco, id) : null;
}

export function excluirProduto(banco, id) {
  return banco.prepare('DELETE FROM produtos WHERE id = ?').run(id).changes > 0;
}

function validarAdicional(dados) {
  const nome = String(dados.nome ?? '').trim();
  const precoCentavos = precoParaCentavos(dados.preco);
  if (!nome) throw new Error('Informe o nome do adicional.');
  if (!Number.isInteger(precoCentavos) || precoCentavos < 0) throw new Error('Informe um preço válido.');
  return { nome, precoCentavos, ativo: dados.ativo === false ? 0 : 1 };
}

export function criarAdicional(banco, dados) {
  const adicional = validarAdicional(dados);
  const resultado = banco.prepare(`
    INSERT INTO adicionais (nome, preco_centavos, ativo) VALUES (?, ?, ?)
  `).run(adicional.nome, adicional.precoCentavos, adicional.ativo);
  return buscarAdicional(banco, Number(resultado.lastInsertRowid));
}

export function atualizarAdicional(banco, id, dados) {
  const adicional = validarAdicional(dados);
  const resultado = banco.prepare(`
    UPDATE adicionais
    SET nome = ?, preco_centavos = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(adicional.nome, adicional.precoCentavos, adicional.ativo, id);
  return resultado.changes ? buscarAdicional(banco, id) : null;
}

export function alternarStatusAdicional(banco, id, ativo) {
  const resultado = banco.prepare(`
    UPDATE adicionais SET ativo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?
  `).run(ativo ? 1 : 0, id);
  return resultado.changes ? buscarAdicional(banco, id) : null;
}

export function excluirAdicional(banco, id) {
  return banco.prepare('DELETE FROM adicionais WHERE id = ?').run(id).changes > 0;
}
