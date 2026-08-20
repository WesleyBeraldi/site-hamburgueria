import xBacon from '../assets/xbacon.png';

export const categoriasIniciais = [
  'Todos',
  'Hambúrgueres',
  'Combos',
  'Porções',
  'Bebidas'
];

export const produtosIniciais = [
  {
    id: 1,
    nome: 'X-Bacon',
    categoria: 'Hambúrgueres',
    descricao: 'Pão brioche, hambúrguer artesanal, cheddar cremoso, bacon crocante, alface e tomate.',
    preco: '34,90',
    imagem: xBacon,
    adicionaisIds: [1, 2, 3, 4, 5, 6],
    destaque: 'Mais vendido',
    ativo: true
  },
  {
    id: 2,
    nome: 'X-Salada',
    categoria: 'Hambúrgueres',
    descricao: 'Pão brioche, hambúrguer artesanal, queijo, alface, tomate e molho especial da casa.',
    preco: '29,90',
    imagem: xBacon,
    adicionaisIds: [1, 2, 3, 4, 5, 6],
    ativo: true
  },
  {
    id: 3,
    nome: 'Duplo Bacon',
    categoria: 'Hambúrgueres',
    descricao: 'Dois hambúrgueres artesanais, cheddar duplo, bacon crocante e molho especial.',
    preco: '42,90',
    imagem: xBacon,
    adicionaisIds: [1, 2, 3, 4, 5, 6],
    destaque: 'Recomendado',
    ativo: true
  },
  {
    id: 4,
    nome: 'X-Tudo',
    categoria: 'Hambúrgueres',
    descricao: 'Hambúrguer artesanal, queijo, bacon, ovo, presunto, alface, tomate e maionese.',
    preco: '39,90',
    imagem: xBacon,
    adicionaisIds: [1, 2, 3, 4, 5, 6],
    ativo: true
  },
  {
    id: 5,
    nome: 'Combo X-Bacon',
    categoria: 'Combos',
    descricao: 'X-Bacon acompanhado de batata frita e refrigerante.',
    preco: '49,90',
    imagem: xBacon,
    adicionaisIds: [1, 2, 3, 5, 6],
    ativo: true
  },
  {
    id: 6,
    nome: 'Batata com Cheddar',
    categoria: 'Porções',
    descricao: 'Batata frita crocante com cheddar cremoso e bacon.',
    preco: '24,90',
    imagem: xBacon,
    adicionaisIds: [1, 2, 6],
    ativo: true
  },
  {
    id: 7,
    nome: 'Refrigerante',
    categoria: 'Bebidas',
    descricao: 'Refrigerante gelado disponível em diversos sabores.',
    preco: '7,00',
    imagem: xBacon,
    adicionaisIds: [],
    ativo: true
  }
];

export const adicionaisIniciais = [
  { id: 1, nome: 'Bacon extra', preco: 5, ativo: true },
  { id: 2, nome: 'Cheddar extra', preco: 4, ativo: true },
  { id: 3, nome: 'Hambúrguer extra', preco: 10, ativo: true },
  { id: 4, nome: 'Ovo', preco: 3, ativo: true },
  { id: 5, nome: 'Cebola caramelizada', preco: 4, ativo: true },
  { id: 6, nome: 'Catupiry', preco: 6, ativo: true }
];

export const promocoesIniciais = [
  {
    id: 101,
    nome: 'Combo X-Bacon',
    categoria: 'Combos',
    descricao: 'X-Bacon artesanal + batata frita crocante + refrigerante.',
    precoAntigo: '49,90',
    preco: '42,40',
    imagem: xBacon,
    destaque: '15% OFF',
    tipo: 'COMBO ESPECIAL',
    ativo: true
  },
  {
    id: 102,
    nome: 'Combo Duplo',
    categoria: 'Combos',
    descricao: '2 X-Bacon artesanais + porção de fritas + 2 refrigerantes.',
    precoAntigo: '79,90',
    preco: '69,90',
    imagem: xBacon,
    destaque: 'MAIS PEDIDO',
    tipo: 'PARA COMPARTILHAR',
    ativo: true
  },
  {
    id: 103,
    nome: 'X-Bacon em Dobro',
    categoria: 'Combos',
    descricao: 'Dois X-Bacon artesanais com muito cheddar e bacon crocante.',
    precoAntigo: '74,90',
    preco: '59,90',
    imagem: xBacon,
    destaque: '20% OFF',
    tipo: 'OFERTA DO DIA',
    ativo: true
  },
  {
    id: 104,
    nome: 'Combo Família',
    categoria: 'Combos',
    descricao: '3 hambúrgueres artesanais + fritas grandes + refrigerante.',
    precoAntigo: '119,90',
    preco: '99,90',
    imagem: xBacon,
    destaque: 'ECONOMIZE',
    tipo: 'PARA A GALERA',
    ativo: true
  },
  {
    id: 105,
    nome: 'Duplo Cheddar',
    categoria: 'Hambúrgueres',
    descricao: 'Hambúrguer duplo, cheddar cremoso e bacon crocante.',
    precoAntigo: '46,90',
    preco: '39,90',
    imagem: xBacon,
    destaque: '15% OFF',
    tipo: 'OFERTA ESPECIAL',
    ativo: true
  }
];

export const funcionariosIniciais = [
  {
    id: 'func-1',
    nome: 'Carlos Silva',
    cargo: 'Garçom',
    pin: '1234',
    status: 'Ativo',
    token: 'carlos-7f3a9d2c',
    vendas: 18,
    comandas: 12
  },
  {
    id: 'func-2',
    nome: 'Ana Souza',
    cargo: 'Garçonete',
    pin: '5678',
    status: 'Ativo',
    token: 'ana-4b8e1c6f',
    vendas: 14,
    comandas: 9
  }
];

export const mesasIniciais = Array.from({ length: 12 }, (_, indice) => ({
  id: indice + 1,
  numero: String(indice + 1).padStart(2, '0'),
  lugares: indice % 3 === 0 ? 6 : 4,
  status: [3, 7].includes(indice + 1) ? 'Ocupada' : 'Livre'
}));

export const pedidosIniciais = [
  {
    id: '#PED1028',
    cliente: 'Rafael Oliveira',
    telefone: '(11) 98765-4321',
    email: 'rafael@email.com',
    origem: 'Delivery',
    status: 'Em preparo',
    pagamento: 'Cartão',
    horario: '19:32',
    criadoEm: '2026-08-18T19:32:00',
    endereco: 'Rua das Palmeiras, 123 - Centro',
    itens: [
      { id: 1, nome: 'X-Bacon', quantidade: 1, preco: 34.9, imagem: xBacon, adicionais: ['Bacon extra'] },
      { id: 6, nome: 'Batata com Cheddar', quantidade: 1, preco: 24.9, imagem: xBacon, adicionais: [] }
    ],
    taxaEntrega: 7.9,
    total: 67.7,
    observacao: 'Sem cebola.'
  },
  {
    id: '#PED1027',
    cliente: 'Juliana Santos',
    telefone: '(11) 99654-3210',
    origem: 'Mesa 07',
    mesaId: 7,
    garcom: 'Carlos Silva',
    status: 'Recebido',
    pagamento: 'Pix',
    horario: '19:28',
    criadoEm: '2026-08-18T19:28:00',
    itens: [
      { id: 5, nome: 'Combo X-Bacon', quantidade: 1, preco: 49.9, imagem: xBacon, adicionais: [] },
      { id: 7, nome: 'Refrigerante', quantidade: 1, preco: 7, imagem: xBacon, adicionais: [] }
    ],
    taxaEntrega: 0,
    total: 56.9,
    observacao: ''
  },
  {
    id: '#PED1026',
    cliente: 'Marcos Lima',
    telefone: '(11) 99543-2340',
    origem: 'Delivery',
    status: 'Saiu para entrega',
    pagamento: 'Dinheiro',
    horario: '18:42',
    criadoEm: '2026-08-18T18:42:00',
    endereco: 'Av. Central, 450 - Jardim América',
    itens: [
      { id: 2, nome: 'X-Salada', quantidade: 1, preco: 29.9, imagem: xBacon, adicionais: [] }
    ],
    taxaEntrega: 7.9,
    total: 37.8,
    observacao: ''
  },
  {
    id: '#PED1025',
    cliente: 'Beatriz Costa',
    telefone: '(11) 99452-1010',
    origem: 'Mesa 03',
    mesaId: 3,
    garcom: 'Ana Souza',
    status: 'Pronto',
    pagamento: 'Pix',
    horario: '18:58',
    criadoEm: '2026-08-18T18:58:00',
    itens: [
      { id: 3, nome: 'Duplo Bacon', quantidade: 1, preco: 42.9, imagem: xBacon, adicionais: [] }
    ],
    taxaEntrega: 0,
    total: 42.9,
    observacao: ''
  }
];

export const comandasIniciais = [
  {
    id: 'comanda-3',
    mesaId: 3,
    funcionarioId: 'func-2',
    garcom: 'Ana Souza',
    status: 'Na cozinha',
    abertaEm: '18:42',
    itens: [{ id: 3, nome: 'Duplo Bacon', quantidade: 1, preco: 42.9, imagem: xBacon, adicionais: [], observacao: '' }]
  },
  {
    id: 'comanda-7',
    mesaId: 7,
    funcionarioId: 'func-1',
    garcom: 'Carlos Silva',
    status: 'Aguardando',
    abertaEm: '19:10',
    itens: [{ id: 5, nome: 'Combo X-Bacon', quantidade: 1, preco: 49.9, imagem: xBacon, adicionais: [], observacao: '' }]
  }
];

export const configuracaoInicial = {
  nomeLoja: 'Hamburgueria',
  telefone: '(11) 99999-9999',
  email: 'contato@hamburgueria.com',
  endereco: 'Rua Principal, 100 - Centro',
  taxaEntrega: 7.9,
  tempoEntrega: '35–45 min',
  pedidoMinimo: 20,
  lojaAberta: true
};
