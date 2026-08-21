import { useCallback, useEffect, useState } from 'react';

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
import {
  acompanharPedidoApi,
  alterarStatusAdicionalApi,
  alterarStatusProdutoApi,
  atualizarAdicionalApi,
  atualizarConfiguracaoApi,
  atualizarProdutoApi,
  atualizarStatusPedidoApi,
  buscarCatalogo,
  criarAdicionalApi,
  criarPedidoApi,
  criarProdutoApi,
  ErroApi,
  excluirAdicionalApi,
  excluirProdutoApi,
  listarPedidosAdminApi,
  loginAdmin,
  logoutAdmin,
  validarSessaoAdmin
} from '../services/api';
import { AppContext } from './appContext';

const CHAVES = {
  produtos: 'hamburgueria_produtos',
  adicionais: 'hamburgueria_adicionais',
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

function lerSessaoAdmin() {
  const sessao = lerSessao(CHAVES.admin);
  return sessao?.token ? sessao : null;
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

function normalizarProdutos(lista) {
  const idsPadrao = adicionaisIniciais.map((adicional) => adicional.id);

  return lista.map((produto) => {
    const produtoInicial = produtosIniciais.find((item) => item.id === produto.id);

    return {
      ...produto,
      imagem: produto.imagem || produtoInicial?.imagem || produtosIniciais[0].imagem,
      adicionaisIds: produto.adicionaisIds ?? produtoInicial?.adicionaisIds ?? idsPadrao
    };
  });
}

function normalizarPedidosDelivery(lista, produtos) {
  return lista.map((pedido) => ({
    ...pedido,
    itens: pedido.itens.map((item) => ({
      ...item,
      imagem: item.imagem
        || produtos.find((produto) => produto.id === item.produtoId)?.imagem
        || produtosIniciais[0].imagem
    }))
  }));
}

export function AppProvider({ children }) {
  const [produtos, setProdutos] = useState(() => normalizarProdutos(lerLocal(CHAVES.produtos, produtosIniciais)));
  const [adicionais, setAdicionais] = useState(() => lerLocal(CHAVES.adicionais, adicionaisIniciais));
  const [promocoes, setPromocoes] = useState(() => lerLocal(CHAVES.promocoes, promocoesIniciais));
  const [funcionarios, setFuncionarios] = useState(() => lerLocal(CHAVES.funcionarios, funcionariosIniciais));
  const [mesas, setMesas] = useState(() => lerLocal(CHAVES.mesas, mesasIniciais));
  const [pedidos, setPedidos] = useState(() => lerLocal(CHAVES.pedidos, pedidosIniciais));
  const [comandas, setComandas] = useState(() => lerLocal(CHAVES.comandas, comandasIniciais));
  const [configuracao, setConfiguracao] = useState(() => lerLocal(CHAVES.configuracao, configuracaoInicial));
  const [carrinho, setCarrinho] = useState(() => lerLocal(CHAVES.carrinho, []));
  const [pedidoAtual, setPedidoAtual] = useState(() => lerLocal(CHAVES.pedidoAtual, null));
  const [adminSessao, setAdminSessao] = useState(lerSessaoAdmin);
  const [garcomSessao, setGarcomSessao] = useState(() => lerSessao(CHAVES.garcom));
  const [catalogoCarregando, setCatalogoCarregando] = useState(true);
  const [sessaoAdminCarregando, setSessaoAdminCarregando] = useState(() => Boolean(lerSessaoAdmin()));
  const [erroApi, setErroApi] = useState('');

  useEffect(() => localStorage.setItem(CHAVES.promocoes, JSON.stringify(promocoes)), [promocoes]);
  useEffect(() => localStorage.setItem(CHAVES.funcionarios, JSON.stringify(funcionarios)), [funcionarios]);
  useEffect(() => localStorage.setItem(CHAVES.mesas, JSON.stringify(mesas)), [mesas]);
  useEffect(() => localStorage.setItem(CHAVES.pedidos, JSON.stringify(pedidos)), [pedidos]);
  useEffect(() => localStorage.setItem(CHAVES.comandas, JSON.stringify(comandas)), [comandas]);
  useEffect(() => localStorage.setItem(CHAVES.configuracao, JSON.stringify(configuracao)), [configuracao]);
  useEffect(() => localStorage.setItem(CHAVES.carrinho, JSON.stringify(carrinho)), [carrinho]);
  useEffect(() => localStorage.setItem(CHAVES.pedidoAtual, JSON.stringify(pedidoAtual)), [pedidoAtual]);

  useEffect(() => {
    let ativo = true;

    buscarCatalogo()
      .then((catalogo) => {
        if (!ativo) return;
        setProdutos(normalizarProdutos(catalogo.produtos));
        setAdicionais(catalogo.adicionais);
        setConfiguracao(catalogo.configuracao ?? configuracaoInicial);
        setErroApi('');
      })
      .catch((erro) => {
        if (ativo) setErroApi(erro.message);
      })
      .finally(() => {
        if (ativo) setCatalogoCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!adminSessao?.token) return;

    let ativo = true;
    const token = adminSessao.token;
    validarSessaoAdmin()
      .then(async ({ admin }) => {
        if (!ativo) return;
        const sessao = { ...admin, token };
        sessionStorage.setItem(CHAVES.admin, JSON.stringify(sessao));
        setAdminSessao(sessao);
        try {
          const resposta = await listarPedidosAdminApi();
          if (!ativo) return;
          const delivery = normalizarPedidosDelivery(resposta.pedidos, produtos);
          setPedidos((atuais) => [...delivery, ...atuais.filter((pedido) => pedido.origem !== 'Delivery')]);
        } catch (erro) {
          if (ativo) setErroApi(erro.message);
        }
      })
      .catch(() => {
        if (!ativo) return;
        sessionStorage.removeItem(CHAVES.admin);
        setAdminSessao(null);
      })
      .finally(() => {
        if (ativo) setSessaoAdminCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [adminSessao?.token, produtos]);

  async function recarregarCatalogo() {
    setCatalogoCarregando(true);
    try {
      const catalogo = await buscarCatalogo();
      setProdutos(normalizarProdutos(catalogo.produtos));
      setAdicionais(catalogo.adicionais);
      setConfiguracao(catalogo.configuracao ?? configuracaoInicial);
      setErroApi('');
    } catch (erro) {
      setErroApi(erro.message);
      throw erro;
    } finally {
      setCatalogoCarregando(false);
    }
  }

  async function entrarAdmin(usuario, senha) {
    try {
      const { admin, token } = await loginAdmin(usuario, senha);
      const sessao = { ...admin, token };
      sessionStorage.setItem(CHAVES.admin, JSON.stringify(sessao));
      setAdminSessao(sessao);
      try {
        const resposta = await listarPedidosAdminApi();
        const delivery = normalizarPedidosDelivery(resposta.pedidos, produtos);
        setPedidos((atuais) => [...delivery, ...atuais.filter((pedido) => pedido.origem !== 'Delivery')]);
      } catch (erro) {
        setErroApi(erro.message);
      }
      return true;
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 401) return false;
      throw erro;
    }
  }

  function sairAdmin() {
    logoutAdmin().catch(() => {});
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

  async function salvarProduto(dados) {
    if (dados.id) {
      const { produto } = await atualizarProdutoApi(dados.id, dados);
      const normalizado = normalizarProdutos([produto])[0];
      setProdutos((atuais) => atuais.map((item) => item.id === normalizado.id ? normalizado : item));
      return normalizado.id;
    }

    const { produto } = await criarProdutoApi(dados);
    const normalizado = normalizarProdutos([produto])[0];
    setProdutos((atuais) => [...atuais, normalizado]);
    return normalizado.id;
  }

  async function removerProduto(id) {
    await excluirProdutoApi(id);
    setProdutos((atuais) => atuais.filter((produto) => produto.id !== id));
  }

  async function alternarProduto(id) {
    const atual = produtos.find((produto) => produto.id === id);
    if (!atual) return;
    const { produto } = await alterarStatusProdutoApi(id, !atual.ativo);
    const normalizado = normalizarProdutos([produto])[0];
    setProdutos((atuais) => atuais.map((item) => item.id === id ? normalizado : item));
  }

  async function salvarAdicional(dados) {
    if (dados.id) {
      const { adicional } = await atualizarAdicionalApi(dados.id, dados);
      setAdicionais((atuais) => atuais.map((item) => item.id === adicional.id ? adicional : item));
      return adicional.id;
    }

    const { adicional } = await criarAdicionalApi(dados);
    setAdicionais((atuais) => [...atuais, adicional]);
    return adicional.id;
  }

  async function removerAdicional(id) {
    await excluirAdicionalApi(id);
    setAdicionais((atuais) => atuais.filter((adicional) => adicional.id !== id));
    setProdutos((atuais) => atuais.map((produto) => ({
      ...produto,
      adicionaisIds: (produto.adicionaisIds ?? []).filter((adicionalId) => adicionalId !== id)
    })));
  }

  async function alternarAdicional(id) {
    const atual = adicionais.find((adicional) => adicional.id === id);
    if (!atual) return;
    const { adicional } = await alterarStatusAdicionalApi(id, atual.ativo === false);
    setAdicionais((atuais) => atuais.map((item) => item.id === id ? adicional : item));
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

  async function atualizarStatusPedido(id, status) {
    const atual = pedidos.find((pedido) => pedido.id === id);
    if (atual?.origem !== 'Delivery') {
      setPedidos((lista) => lista.map((pedido) => pedido.id === id ? { ...pedido, status } : pedido));
      setPedidoAtual((pedido) => pedido?.id === id ? { ...pedido, status } : pedido);
      return atual ? { ...atual, status } : null;
    }

    const resposta = await atualizarStatusPedidoApi(id, status);
    const pedidoAtualizado = normalizarPedidosDelivery([resposta.pedido], produtos)[0];
    setPedidos((lista) => lista.map((pedido) => pedido.id === id ? pedidoAtualizado : pedido));
    setPedidoAtual((pedido) => pedido?.id === id
      ? { ...pedidoAtualizado, tokenAcompanhamento: pedido.tokenAcompanhamento }
      : pedido);
    return pedidoAtualizado;
  }

  async function criarPedidoDelivery(dados) {
    const resposta = await criarPedidoApi({
      ...dados,
      itens: carrinho.map((item) => ({
        produtoId: item.produtoId ?? item.id,
        quantidade: item.quantidade,
        adicionaisIds: (item.adicionais ?? []).map((adicional) => adicional.id),
        observacao: item.observacao ?? ''
      }))
    });
    const pedido = {
      ...normalizarPedidosDelivery([resposta.pedido], produtos)[0],
      tokenAcompanhamento: resposta.tokenAcompanhamento
    };
    setPedidos((atuais) => [pedido, ...atuais.filter((item) => item.id !== pedido.id)]);
    setPedidoAtual(pedido);
    setCarrinho([]);
    return pedido;
  }

  const acompanharPedido = useCallback(async (codigo, token) => {
    const resposta = await acompanharPedidoApi(codigo, token);
    const pedido = {
      ...normalizarPedidosDelivery([resposta.pedido], produtos)[0],
      tokenAcompanhamento: token
    };
    setPedidoAtual(pedido);
    setPedidos((atuais) => atuais.map((item) => item.id === pedido.id ? pedido : item));
    return pedido;
  }, [produtos]);

  async function salvarConfiguracao(dados) {
    const resposta = await atualizarConfiguracaoApi(dados);
    setConfiguracao(resposta.configuracao);
    return resposta.configuracao;
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
    setPromocoes(promocoesIniciais);
    setFuncionarios(funcionariosIniciais);
    setMesas(mesasIniciais);
    setPedidos(pedidosIniciais);
    setComandas(comandasIniciais);
    setCarrinho([]);
    setPedidoAtual(null);
  }

  const valor = {
    produtos,
    adicionais,
    promocoes,
    funcionarios,
    mesas,
    pedidos,
    comandas,
    configuracao,
    carrinho,
    pedidoAtual,
    adminSessao,
    garcomSessao,
    catalogoCarregando,
    sessaoAdminCarregando,
    erroApi,
    setCarrinho,
    salvarConfiguracao,
    entrarAdmin,
    sairAdmin,
    entrarGarcom,
    sairGarcom,
    salvarProduto,
    removerProduto,
    alternarProduto,
    salvarAdicional,
    removerAdicional,
    alternarAdicional,
    salvarPromocao,
    removerPromocao,
    salvarFuncionario,
    alternarFuncionario,
    atualizarStatusPedido,
    criarPedidoDelivery,
    acompanharPedido,
    abrirComanda,
    adicionarItemComanda,
    removerItemComanda,
    enviarComanda,
    solicitarConta,
    fecharComanda,
    restaurarDemonstracao,
    recarregarCatalogo,
    numeroPreco
  };

  if (catalogoCarregando) {
    return (
      <div className="carregamentoAplicacao" role="status">
        <span />
        <strong>Carregando cardápio...</strong>
      </div>
    );
  }

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}
