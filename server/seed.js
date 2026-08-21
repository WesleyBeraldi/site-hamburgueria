export const categoriasSeed = [
  { id: 1, nome: 'Hambúrgueres', ordem: 1 },
  { id: 2, nome: 'Combos', ordem: 2 },
  { id: 3, nome: 'Porções', ordem: 3 },
  { id: 4, nome: 'Bebidas', ordem: 4 }
];

export const adicionaisSeed = [
  { id: 1, nome: 'Bacon extra', precoCentavos: 500 },
  { id: 2, nome: 'Cheddar extra', precoCentavos: 400 },
  { id: 3, nome: 'Hambúrguer extra', precoCentavos: 1000 },
  { id: 4, nome: 'Ovo', precoCentavos: 300 },
  { id: 5, nome: 'Cebola caramelizada', precoCentavos: 400 },
  { id: 6, nome: 'Catupiry', precoCentavos: 600 }
];

export const produtosSeed = [
  {
    id: 1,
    nome: 'X-Bacon',
    categoriaId: 1,
    descricao: 'Pão brioche, hambúrguer artesanal, cheddar cremoso, bacon crocante, alface e tomate.',
    precoCentavos: 3490,
    destaque: 'Mais vendido',
    adicionaisIds: [1, 2, 3, 4, 5, 6]
  },
  {
    id: 2,
    nome: 'X-Salada',
    categoriaId: 1,
    descricao: 'Pão brioche, hambúrguer artesanal, queijo, alface, tomate e molho especial da casa.',
    precoCentavos: 2990,
    adicionaisIds: [1, 2, 3, 4, 5, 6]
  },
  {
    id: 3,
    nome: 'Duplo Bacon',
    categoriaId: 1,
    descricao: 'Dois hambúrgueres artesanais, cheddar duplo, bacon crocante e molho especial.',
    precoCentavos: 4290,
    destaque: 'Recomendado',
    adicionaisIds: [1, 2, 3, 4, 5, 6]
  },
  {
    id: 4,
    nome: 'X-Tudo',
    categoriaId: 1,
    descricao: 'Hambúrguer artesanal, queijo, bacon, ovo, presunto, alface, tomate e maionese.',
    precoCentavos: 3990,
    adicionaisIds: [1, 2, 3, 4, 5, 6]
  },
  {
    id: 5,
    nome: 'Combo X-Bacon',
    categoriaId: 2,
    descricao: 'X-Bacon acompanhado de batata frita e refrigerante.',
    precoCentavos: 4990,
    adicionaisIds: [1, 2, 3, 5, 6]
  },
  {
    id: 6,
    nome: 'Batata com Cheddar',
    categoriaId: 3,
    descricao: 'Batata frita crocante com cheddar cremoso e bacon.',
    precoCentavos: 2490,
    adicionaisIds: [1, 2, 6]
  },
  {
    id: 7,
    nome: 'Refrigerante',
    categoriaId: 4,
    descricao: 'Refrigerante gelado disponível em diversos sabores.',
    precoCentavos: 700,
    adicionaisIds: []
  }
];
