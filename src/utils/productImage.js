export const imagemProdutoPadrao = '/produto-placeholder.svg';

export function usarPlaceholderProduto(evento) {
  const imagem = evento.currentTarget;
  if (imagem.dataset.placeholderAplicado === 'true') return;
  imagem.dataset.placeholderAplicado = 'true';
  imagem.src = imagemProdutoPadrao;
}
