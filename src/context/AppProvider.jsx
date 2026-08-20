import { useEffect, useState } from 'react';

import {
  adicionaisIniciais,
  comandasIniciais,
  configuracaoInicial,
  funcionariosIniciais,
  mesasIniciais,
  pedidosIniciais,
  produtosIniciais,
  promocoesIniciais
} from '../data/initialData';
import { AppContext } from './appContext';

const CHAVES = {
  produtos: 'hamburgueria_produtos',
  promocoes: 'hamburgueria_promocoes',
  funcionarios: 'hamburgueria_funcionarios',
  mesas: 'hamburgueria_mesas',
  pedidos: 'hamburgueria_pedidos',
  comandas: 'hamburgueria_comandas',
  configuracao: 'hamburgueria_configuracao',
  carrinho: 'hamburgueria_carrinho',
  pedidoAtual: 'hamburgueria_pedido_atual',
  admin: 'hamburgueria_admin_sessao',
  garcom: 'hamburgueria_garcom_sessao'
};

function lerLocal(chave, valorInicial) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : valorInicial;
  } catch {
    return valorInicial;
  }
}

function lerSessao(chave) {
  try {
    const valor = sessionStorage.getItem(chave);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

function numeroPreco(valor) {
  if (typeof valor === 'number') return valor;
  return Number(String(valor).replace(',', '.')) || 0;
}

function criarToken(nome) {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function agoraFormatado() {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());
}

export function AppProvider({ children }) {
  const [produtos, setProdutos] = useState(() => lerLocal(CHAVES.produtos, produtosIniciais));
  const [promocoes, setPromocoes] = useState(() => lerLocal(CHAVES.promocoes, promocoesIniciais));
  const [funcionarios, setFuncionarios] = useState(() => lerLocal(CHAVES.funcionarios, funcionariosIniciais));
  const [mesas, setMesas] = useState(() => lerLocal(CHAVES.mesas, mesasIniciais));
  const [pedidos, setPedidos] = useState(() => lerLocal(CHAVES.pedidos, pedidosIniciais));
  const [comandas, setComandas] = useState(() => lerLocal(CHAVES.comandas, comandasIniciais));
  const [configuracao, setConfiguracao] = useState(() => lerLocal(CHAVES.configuracao, configuracaoInicial));
  const [carrinho, setCarrinho] = useState(() => lerLocal(CHAVES.carrinho, []));
  const [pedidoAtual, setPedidoAtual] = useState(() => lerLocal(CHAVES.pedidoAtual, null));
  const [adminSessao, setAdminSessao] = useState(() => lerSessao(CHAVES.admin));
  const [garcomSessao, setGarcomSessao] = useState(() => lerSessao(CHAVES.garcom));

  useEffect(() => localStorage.setItem(CHAVES.produtos, JSON.stringify(produtos)), [produtos]);
  useEffect(() => localStorage.setItem(CHAVES.promocoes, JSON.stringify(promocoes)), [promocoes]);
  useEffect(() => localStorage.setItem(CHAVES.funcionarios, JSON.stringify(funcionarios)), [funcionarios]);
  useEffect(() => localStorage.setItem(CHAVES.mesas, JSON.stringify(mesas)), [mesas]);
  useEffect(() => localStorage.setItem(CHAVES.pedidos, JSON.stringify(pedidos)), [pedidos]);
  useEffect(() => localStorage.setItem(CHAVES.comandas, JSON.stringify(comandas)), [comandas]);
  useEffect(() => localStorage.setItem(CHAVES.configuracao, JSON.stringify(configuracao)), [configuracao]);
  useEffect(() => localStorage.setItem(CHAVES.carrinho, JSON.stringify(carrinho)), [carrinho]);
  useEffect(() => localStorage.setItem(CHAVES.pedidoAtual, JSON.stringify(pedidoAtual)), [pedidoAtual]);

  function entrarAdmin(usuario, senha) {
    const usuarioValido = ['admin', 'admin@hamburgueria.com'].includes(usuario.trim().toLowerCase());

    if (!usuarioValido || senha !== 'admin123') {
      return false;
    }

    const sessao = { nome: 'Admin', perfil: 'Administrador' };
    sessionStorage.setItem(CHAVES.admin, JSON.stringify(sessao));
    setAdminSessao(sessao);
    return true;
  }

  function sairAdmin() {
    sessionStorage.removeItem(CHAVES.admin);
    setAdminSessao(null);
  }

  function entrarGarcom(token, pin) {
    const funcionario = funcionarios.find(
      (item) => item.token === token && item.pin === pin && item.status === 'Ativo'
    );

    if (!funcionario) return false;

    const sessao = {
      id: funcionario.id,
      nome: funcionario.nome,
      cargo: funcionario.cargo,
      token: funcionario.token
    };

    sessionStorage.setItem(CHAVES.garcom, JSON.stringify(sessao));
    setGarcomSessao(sessao);
    return true;
  }

  function sairGarcom() {
    sessionStorage.removeItem(CHAVES.garcom);
    setGarcomSessao(null);
  }

  function salvarProduto(dados) {
    if (dados.id) {
      setProdutos((atuais) => atuais.map((produto) => produto.id === dados.id ? { ...produto, ...dados } : produto));
      return dados.id;
    }

    const novo = {
      ...dados,
      id: Date.now(),
      ativo: true,
      imagem: produtosIniciais[0].imagem
    };
    setProdutos((atuais) => [...atuais, novo]);
    return novo.id;
  }

  function removerProduto(id) {
    setProdutos((atuais) => atuais.filter((produto) => produto.id !== id));
  }

  function alternarProduto(id) {
    setProdutos((atuais) => atuais.map((produto) => produto.id === id ? { ...produto, ativo: !produto.ativo } : produto));
  }

  function salvarPromocao(dados) {
    if (dados.id) {
      setPromocoes((atuais) => atuais.map((promocao) => promocao.id === dados.id ? { ...promocao, ...dados } : promocao));
      return;
    }

    setPromocoes((atuais) => [...atuais, {
      ...dados,
      id: Date.now(),
      ativo: true,
      imagem: produtosIniciais[0].imagem
    }]);
  }

  function removerPromocao(id) {
    setPromocoes((atuais) => atuais.filter((promocao) => promocao.id !== id));
  }

  function salvarFuncionario(dados) {
    if (dados.id) {
      setFuncionarios((atuais) => atuais.map((funcionario) => funcionario.id === dados.id ? { ...funcionario, ...dados } : funcionario));
      return dados.id;
    }

    const id = `func-${Date.now()}`;
    setFuncionarios((atuais) => [...atuais, {
      ...dados,
      id,
      token: criarToken(dados.nome),
      status: 'Ativo',
      vendas: 0,
      comandas: 0
    }]);
    return id;
  }

  function alternarFuncionario(id) {
    setFuncionarios((atuais) => atuais.map((funcionario) => funcionario.id === id
      ? { ...funcionario, status: funcionario.status === 'Ativo' ? 'Inativo' : 'Ativo' }
      : funcionario));
  }

  function atualizarStatusPedido(id, status) {
    setPedidos((atuais) => atuais.map((pedido) => pedido.id === id ? { ...pedido, status } : pedido));
    setPedidoAtual((atual) => atual?.id === id ? { ...atual, status } : atual);
  }

  function criarPedidoDelivery(dados) {
    const subtotal = carrinho.reduce((total, item) => {
      const preco = item.precoFinal ?? numeroPreco(item.preco);
      return total + preco * item.quantidade;
    }, 0);
    const sequencia = 1100 + pedidos.length + 1;
    const agora = new Date();
    const pedido = {
      id: `#PED${sequencia}`,
      cliente: dados.nome,
      telefone: dados.telefone,
      email: dados.email,
      origem: 'Delivery',
      status: 'Recebido',
      pagamento: dados.pagamento,
      horario: agoraFormatado(),
      criadoEm: agora.toISOString(),
      endereco: `${dados.rua}, ${dados.numero} - ${dados.bairro}${dados.complemento ? `, ${dados.complemento}` : ''}`,
      referencia: dados.referencia,
      observacao: dados.observacao,
      itens: carrinho.map((item) => ({
        ...item,
        preco: item.precoFinal ?? numeroPreco(item.preco),
        adicionais: item.adicionais ?? []
      })),
      taxaEntrega: Number(configuracao.taxaEntrega),
      total: subtotal + Number(configuracao.taxaEntrega)
    };

    setPedidos((atuais) => [pedido, ...atuais]);
    setPedidoAtual(pedido);
    setCarrinho([]);
    return pedido;
  }

  function abrirComanda(mesaId) {
    const existente = comandas.find((comanda) => comanda.mesaId === mesaId && comanda.status !== 'Encerrada');
    if (existente) return existente;

    const nova = {
      id: `comanda-${Date.now()}`,
      mesaId,
      funcionarioId: garcomSessao.id,
      garcom: garcomSessao.nome,
      status: 'Aberta',
      abertaEm: agoraFormatado(),
      itens: []
    };

    setComandas((atuais) => [...atuais, nova]);
    setMesas((atuais) => atuais.map((mesa) => mesa.id === mesaId ? { ...mesa, status: 'Ocupada' } : mesa));
    return nova;
  }

  function adicionarItemComanda(comandaId, produto, quantidade, adicionais, observacao) {
    const preco = numeroPreco(produto.preco) + adicionais.reduce((total, adicional) => total + adicional.preco, 0);
    const item = {
      ...produto,
      linhaId: `${produto.id}-${Date.now()}`,
      preco,
      quantidade,
      adicionais,
      observacao
    };

    setComandas((atuais) => atuais.map((comanda) => comanda.id === comandaId
      ? { ...comanda, itens: [...comanda.itens, item] }
      : comanda));
  }

  function removerItemComanda(comandaId, linhaId) {
    setComandas((atuais) => atuais.map((comanda) => comanda.id === comandaId
      ? { ...comanda, itens: comanda.itens.filter((item) => (item.linhaId ?? item.id) !== linhaId) }
      : comanda));
  }

  function enviarComanda(comandaId) {
    const comanda = comandas.find((item) => item.id === comandaId);
    if (!comanda || comanda.itens.length === 0) return false;

    const total = comanda.itens.reduce((soma, item) => soma + numeroPreco(item.preco) * item.quantidade, 0);
    const existente = pedidos.find((pedido) => pedido.comandaId === comandaId);
    const mesa = mesas.find((item) => item.id === comanda.mesaId);

    setComandas((atuais) => atuais.map((item) => item.id === comandaId ? { ...item, status: 'Na cozinha' } : item));

    if (existente) {
      setPedidos((atuais) => atuais.map((pedido) => pedido.comandaId === comandaId
        ? { ...pedido, itens: comanda.itens, total, status: 'Em preparo' }
        : pedido));
    } else {
      setPedidos((atuais) => [{
        id: `#PED${1100 + atuais.length + 1}`,
        comandaId,
        cliente: `Mesa ${mesa.numero}`,
        telefone: 'Atendimento presencial',
        origem: `Mesa ${mesa.numero}`,
        mesaId: mesa.id,
        garcom: comanda.garcom,
        status: 'Recebido',
        pagamento: 'A definir',
        horario: agoraFormatado(),
        criadoEm: new Date().toISOString(),
        itens: comanda.itens,
        taxaEntrega: 0,
        total,
        observacao: ''
      }, ...atuais]);
    }

    return true;
  }

  function solicitarConta(comandaId) {
    setComandas((atuais) => atuais.map((item) => item.id === comandaId ? { ...item, status: 'Conta solicitada' } : item));
  }

  function fecharComanda(comandaId, pagamento) {
    const comanda = comandas.find((item) => item.id === comandaId);
    if (!comanda) return;

    setComandas((atuais) => atuais.map((item) => item.id === comandaId ? { ...item, status: 'Encerrada', pagamento } : item));
    setMesas((atuais) => atuais.map((mesa) => mesa.id === comanda.mesaId ? { ...mesa, status: 'Livre' } : mesa));
    setPedidos((atuais) => atuais.map((pedido) => pedido.comandaId === comandaId
      ? { ...pedido, status: 'Entregue na mesa', pagamento }
      : pedido));
    setFuncionarios((atuais) => atuais.map((funcionario) => funcionario.id === comanda.funcionarioId
      ? { ...funcionario, comandas: funcionario.comandas + 1, vendas: funcionario.vendas + 1 }
      : funcionario));
  }

  function restaurarDemonstracao() {
    setProdutos(produtosIniciais);
    setPromocoes(promocoesIniciais);
    setFuncionarios(funcionariosIniciais);
    setMesas(mesasIniciais);
    setPedidos(pedidosIniciais);
    setComandas(comandasIniciais);
    setConfiguracao(configuracaoInicial);
    setCarrinho([]);
    setPedidoAtual(null);
  }

  const valor = {
    produtos,
    promocoes,
    adicionais: adicionaisIniciais,
    funcionarios,
    mesas,
    pedidos,
    comandas,
    configuracao,
    carrinho,
    pedidoAtual,
    adminSessao,
    garcomSessao,
    setCarrinho,
    setConfiguracao,
    entrarAdmin,
    sairAdmin,
    entrarGarcom,
    sairGarcom,
    salvarProduto,
    removerProduto,
    alternarProduto,
    salvarPromocao,
    removerPromocao,
    salvarFuncionario,
    alternarFuncionario,
    atualizarStatusPedido,
    criarPedidoDelivery,
    abrirComanda,
    adicionarItemComanda,
    removerItemComanda,
    enviarComanda,
    solicitarConta,
    fecharComanda,
    restaurarDemonstracao,
    numeroPreco
  };

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}
