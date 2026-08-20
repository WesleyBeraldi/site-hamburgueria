const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAXIMO_ARQUIVO = 8 * 1024 * 1024;
const TAMANHO_MAXIMO_IMAGEM = 1200;
const TAMANHO_MAXIMO_DATA_URL = 850_000;

function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();

    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem selecionada.'));
    };
    imagem.src = url;
  });
}

export async function otimizarImagemProduto(arquivo) {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WebP.');
  }

  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    throw new Error('A imagem deve ter no máximo 8 MB.');
  }

  const imagem = await carregarImagem(arquivo);
  const escala = Math.min(1, TAMANHO_MAXIMO_IMAGEM / Math.max(imagem.naturalWidth, imagem.naturalHeight));
  const largura = Math.max(1, Math.round(imagem.naturalWidth * escala));
  const altura = Math.max(1, Math.round(imagem.naturalHeight * escala));
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext('2d');
  contexto.drawImage(imagem, 0, 0, largura, altura);

  let resultado = canvas.toDataURL('image/webp', 0.82);
  if (resultado.length > TAMANHO_MAXIMO_DATA_URL) {
    resultado = canvas.toDataURL('image/webp', 0.65);
  }

  if (resultado.length > TAMANHO_MAXIMO_DATA_URL) {
    throw new Error('A imagem ainda ficou muito grande. Escolha uma foto menor.');
  }

  return resultado;
}
