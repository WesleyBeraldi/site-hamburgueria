import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useApp } from '../../../context/appContext';
import styles from './index.module.css';

function criarChavePedido() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function FinalizarPedidos() {
  const navigate = useNavigate();

  const [rolouPagina, setRolouPagina] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('cartao');
  const [trocoOpcao, setTrocoOpcao] = useState('sem');
  const [trocoPara, setTrocoPara] = useState('');
  const [enviando, setEnviando] = useState(false);
  const chaveTentativa = useRef(null);
  if (chaveTentativa.current == null) chaveTentativa.current = criarChavePedido();
  const [dadosCliente, setDadosCliente] = useState({
    nome: '',
    telefone: '',
    email: '',
    rua: '',
    numero: '',
    bairro: '',
    complemento: '',
    referencia: ''
  });
  const [erro, setErro] = useState('');
  const {
    carrinho: itens,
    setCarrinho: setItens,
    criarPedidoDelivery,
    configuracao,
    numeroPreco
  } = useApp();

  function chaveItem(item) {
    return item.carrinhoId ?? item.id;
  }

  function precoItem(item) {
    return item.precoFinal ?? numeroPreco(item.preco);
  }

  function aumentarQuantidade(chave) {
    setItens(
      itens.map((item) =>
        chaveItem(item) === chave
          ? {
              ...item,
              quantidade: Math.min(50, item.quantidade + 1)
            }
          : item
      )
    );
  }

  function diminuirQuantidade(chave) {
    setItens(
      itens
        .map((item) =>
          chaveItem(item) === chave
            ? {
                ...item,
                quantidade: item.quantidade - 1
              }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }

  function removerProduto(chave) {
    setItens(
      itens.filter((item) => chaveItem(item) !== chave)
    );
  }

  const subtotal = itens.reduce(
    (total, item) =>
      total + precoItem(item) * item.quantidade,
    0
  );

  const areasEntrega = configuracao.areasEntrega ?? [];
  const areaSelecionada = areasEntrega.find((area) => area.bairro === dadosCliente.bairro);
  const taxaDefinida = areasEntrega.length === 0 || Boolean(areaSelecionada);
  const taxaEntrega = areasEntrega.length > 0
    ? Number(areaSelecionada?.taxa ?? 0)
    : Number(configuracao.taxaEntrega);

  const total = subtotal + taxaEntrega;
  const pedidoMinimo = Number(configuracao.pedidoMinimo);
  const minimoAtingido = subtotal >= pedidoMinimo;
  const lojaDisponivel = Boolean(configuracao.lojaAberta && configuracao.entregaAtiva);
  const formasDisponiveis = [
    configuracao.pixChave ? 'pix' : null,
    configuracao.aceitaCartao ? 'cartao' : null,
    configuracao.aceitaDinheiro ? 'dinheiro' : null
  ].filter(Boolean);
  const pagamentoSelecionado = formasDisponiveis.includes(formaPagamento)
    ? formaPagamento
    : (formasDisponiveis[0] ?? '');

  function alterarCampo(campo, valor) {
    setDadosCliente((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function formatarTelefone(valor) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }

  async function finalizarPedido() {
    if (enviando) return;
    const obrigatorios = [
      dadosCliente.nome,
      dadosCliente.telefone,
      dadosCliente.email,
      dadosCliente.rua,
      dadosCliente.numero,
      dadosCliente.bairro
    ];

    if (itens.length === 0) {
      setErro('Seu carrinho está vazio. Volte ao cardápio para adicionar produtos.');
      return;
    }

    if (!lojaDisponivel) {
      setErro(configuracao.lojaAberta ? 'A entrega está indisponível no momento.' : 'A loja está fechada no momento.');
      return;
    }

    if (!minimoAtingido) {
      setErro(`Faltam R$ ${(pedidoMinimo - subtotal).toFixed(2).replace('.', ',')} para atingir o pedido mínimo.`);
      return;
    }

    if (obrigatorios.some((campo) => !campo.trim())) {
      setErro('Preencha os dados do cliente e o endereço de entrega.');
      return;
    }

    if (!/^\d{10,11}$/.test(dadosCliente.telefone.replace(/\D/g, ''))) {
      setErro('Informe um telefone válido com DDD.');
      return;
    }

    if (!formasDisponiveis.includes(pagamentoSelecionado)) {
      setErro('Selecione uma forma de pagamento disponível.');
      return;
    }

    if (pagamentoSelecionado === 'dinheiro' && trocoOpcao === 'valor' && Number(trocoPara) < total) {
      setErro('O valor entregue em dinheiro não pode ser menor que o total do pedido.');
      return;
    }

    const nomesPagamento = {
      pix: 'Pix',
      cartao: 'Cartão na entrega',
      dinheiro: 'Dinheiro'
    };

    setErro('');
    setEnviando(true);
    try {
      await criarPedidoDelivery({
        ...dadosCliente,
        modalidade: 'delivery',
        chaveIdempotencia: chaveTentativa.current,
        pagamento: nomesPagamento[pagamentoSelecionado],
        ...(pagamentoSelecionado === 'dinheiro'
          ? trocoOpcao === 'sem'
            ? { semTroco: true }
            : { trocoPara: Number(trocoPara) }
          : {})
      });
      navigate('/pedido-finalizado');
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  useEffect(() => {
    function verificarScroll() {
      setRolouPagina(window.scrollY > 50);
    }

    verificarScroll();

    window.addEventListener('scroll', verificarScroll);

    return () => {
      window.removeEventListener(
        'scroll',
        verificarScroll
      );
    };
  }, []);

  return (
    <div className={styles.pagina}>

      {/* =========================
          HEADER
      ========================= */}

      <header
        className={`${styles.barraPrincipal} ${
          rolouPagina ? styles.barraRolada : ''
        }`}
      >
        <div className={styles.conteudoHeader}>

          <Link
            to="/"
            className={styles.logo}
          >
            {configuracao.logo
              ? <img src={configuracao.logo} alt={configuracao.nomeLoja || 'Logo da loja'} decoding="async" />
              : (configuracao.nomeLoja || 'Cardápio online')}
          </Link>

          

          <button
            type="button"
            className={styles.botaoVoltar}
            onClick={() => navigate(-1)}
          >
            ← Voltar
          </button>

        </div>
      </header>


      {/* =========================
          CONTEÚDO
      ========================= */}

      <main id="conteudo-principal" className={styles.conteudoPagina}>

        {/* TÍTULO */}

        <div className={styles.cabecalhoPagina}>
          <div className={styles.iconeTitulo}>
            <svg viewBox="0 0 24 24">
              <path
                d="M7 3h10v3h2v15H5V6h2V3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />

              <path
                d="M9 3h6v5H9V3ZM8 12h8M8 16h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <h1>
              Finalizar
              <span> pedido</span>
            </h1>

            <p>
              Revise seu pedido e escolha a forma de pagamento.
            </p>
          </div>
        </div>

        {!lojaDisponivel && (
          <div className={styles.avisoOperacao} role="status">
            <strong>{configuracao.lojaAberta ? 'Entrega indisponível' : 'Loja fechada'}</strong>
            <span>Você pode revisar o cardápio, mas não é possível concluir um pedido agora.</span>
          </div>
        )}


        <div className={styles.layoutPagamento}>

          {/* =========================
              LADO ESQUERDO
          ========================= */}

          <div className={styles.colunaFormulario}>

            {/* INFORMAÇÕES CLIENTE */}

            <section className={styles.cardFormulario}>

              <div className={styles.tituloCard}>
                <div className={styles.iconeCard}>
                  <svg viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="8"
                      r="4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                    <path
                      d="M5 21c0-4 3-7 7-7s7 3 7 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <h2>Informações do cliente</h2>
              </div>

              <div className={styles.gridCliente}>

                <div className={styles.campo}>
                  <label htmlFor="nomeCliente">Nome completo</label>

                  <input
                    id="nomeCliente"
                    type="text"
                    autoComplete="name"
                    placeholder="Digite seu nome"
                    value={dadosCliente.nome}
                    onChange={(event) => alterarCampo('nome', event.target.value)}
                  />
                </div>

                <div className={styles.campo}>
                  <label htmlFor="telefoneCliente">Telefone</label>

                  <input
                    id="telefoneCliente"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                    maxLength={15}
                    value={dadosCliente.telefone}
                    onChange={(event) => alterarCampo('telefone', formatarTelefone(event.target.value))}
                  />
                </div>

                <div className={`${styles.campo} ${styles.campoCompleto}`}>
                  <label htmlFor="emailCliente">E-mail</label>
                  <input
                    id="emailCliente"
                    type="email"
                    autoComplete="email"
                    placeholder="seuemail@exemplo.com"
                    value={dadosCliente.email}
                    onChange={(event) => alterarCampo('email', event.target.value)}
                  />
                </div>

              </div>

            </section>


            {/* ENDEREÇO */}

            <section className={styles.cardFormulario}>

              <div className={styles.tituloCard}>
                <div className={styles.iconeCard}>
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 21s7-6 7-12A7 7 0 1 0 5 9c0 6 7 12 7 12Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                    <circle
                      cx="12"
                      cy="9"
                      r="2.3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </div>

                <h2>Endereço de entrega</h2>
              </div>


              <div className={styles.gridEndereco}>

                <div
                  className={`${styles.campo} ${styles.campoRua}`}
                >
                  <label htmlFor="ruaCliente">Rua</label>

                  <input
                    id="ruaCliente"
                    type="text"
                    autoComplete="address-line1"
                    placeholder="Digite o nome da rua"
                    value={dadosCliente.rua}
                    onChange={(event) => alterarCampo('rua', event.target.value)}
                  />
                </div>

                <div className={styles.campo}>
                  <label htmlFor="numeroCliente">Número</label>

                  <input
                    id="numeroCliente"
                    type="text"
                    autoComplete="address-line2"
                    placeholder="123"
                    value={dadosCliente.numero}
                    onChange={(event) => alterarCampo('numero', event.target.value)}
                  />
                </div>


                <div className={styles.campo}>
                  <label htmlFor="bairroCliente">Bairro</label>

                  {areasEntrega.length > 0 ? (
                    <select id="bairroCliente" autoComplete="address-level3" value={dadosCliente.bairro} onChange={(event) => alterarCampo('bairro', event.target.value)}>
                      <option value="">Selecione o bairro</option>
                      {areasEntrega.map((area) => <option value={area.bairro} key={area.bairro}>{area.bairro} — R$ {Number(area.taxa).toFixed(2).replace('.', ',')}</option>)}
                    </select>
                  ) : (
                    <input
                      id="bairroCliente"
                      type="text"
                      autoComplete="address-level3"
                      placeholder="Digite seu bairro"
                      value={dadosCliente.bairro}
                      onChange={(event) => alterarCampo('bairro', event.target.value)}
                    />
                  )}
                </div>


                <div className={styles.campo}>
                  <label htmlFor="complementoCliente">
                    Complemento
                    <span> (opcional)</span>
                  </label>

                  <input
                    id="complementoCliente"
                    type="text"
                    autoComplete="address-line3"
                    placeholder="Apto, bloco, casa..."
                    value={dadosCliente.complemento}
                    onChange={(event) => alterarCampo('complemento', event.target.value)}
                  />
                </div>


                <div
                  className={`${styles.campo} ${styles.campoCompleto}`}
                >
                  <label htmlFor="referenciaCliente">
                    Referência
                    <span> (opcional)</span>
                  </label>

                  <input
                    id="referenciaCliente"
                    type="text"
                    placeholder="Ex: próximo ao mercado, padaria..."
                    value={dadosCliente.referencia}
                    onChange={(event) => alterarCampo('referencia', event.target.value)}
                  />
                </div>

              </div>

            </section>


            {/* FORMA DE PAGAMENTO */}

            <section className={styles.cardFormulario}>

              <div className={styles.tituloCard}>
                <div className={styles.iconeCard}>
                  <svg viewBox="0 0 24 24">
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />

                    <path
                      d="M3 10h18M7 15h4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </div>

                <h2>Forma de pagamento</h2>
              </div>


              <div className={styles.formasPagamento} role="group" aria-label="Formas de pagamento disponíveis">

                {/* PIX */}

                {configuracao.pixChave && <button
                  type="button"
                  onClick={() => setFormaPagamento('pix')}
                  aria-pressed={pagamentoSelecionado === 'pix'}
                  className={`${styles.opcaoPagamento} ${pagamentoSelecionado === 'pix' ? styles.pagamentoAtivo : ''}`}
                >

                  <div className={styles.radioPagamento} />
                

                  <div className={styles.iconePagamento}>
                    ◆
                  </div>

                  <div>
                    <strong>Pix</strong>

                    <span>
                      Aguarda confirmação do pagamento
                    </span>
                  </div>

                </button>}


                {/* CARTÃO */}

                {configuracao.aceitaCartao && <button
                  type="button"
                  onClick={() =>
                    setFormaPagamento('cartao')
                  }
                  aria-pressed={pagamentoSelecionado === 'cartao'}
                  className={`${styles.opcaoPagamento} ${
                    pagamentoSelecionado === 'cartao'
                      ? styles.pagamentoAtivo
                      : ''
                  }`}
                >

                  <div className={styles.radioPagamento} />

                  <div className={styles.iconePagamento}>
                    ▭
                  </div>

                  <div>
                    <strong>
                      Cartão na entrega
                    </strong>

                    <span>
                      Pague com cartão na entrega
                    </span>
                  </div>

                </button>}


                {/* DINHEIRO */}

                {configuracao.aceitaDinheiro && <button
                  type="button"
                  onClick={() =>
                    setFormaPagamento('dinheiro')
                  }
                  aria-pressed={pagamentoSelecionado === 'dinheiro'}
                  className={`${styles.opcaoPagamento} ${
                    pagamentoSelecionado === 'dinheiro'
                      ? styles.pagamentoAtivo
                      : ''
                  }`}
                >

                  <div className={styles.radioPagamento} />

                  <div className={styles.iconePagamento}>
                    $
                  </div>

                  <div>
                    <strong>
                      Dinheiro
                    </strong>

                    <span>
                      Pague em dinheiro na entrega
                    </span>
                  </div>

                </button>}

              </div>

              {pagamentoSelecionado === 'pix' && configuracao.pixChave && (
                <div className={styles.dadosPix}>
                  <strong>Dados para pagamento por Pix</strong>
                  <span>Beneficiário: {configuracao.pixBeneficiario}</span>
                  <code>{configuracao.pixChave}</code>
                  <small>O pedido ficará aguardando pagamento até a confirmação.</small>
                </div>
              )}

              {pagamentoSelecionado === 'dinheiro' && configuracao.aceitaDinheiro && (
                <div className={styles.dadosTroco}>
                  <strong>Você precisa de troco?</strong>
                  <label><input type="radio" name="troco" checked={trocoOpcao === 'sem'} onChange={() => setTrocoOpcao('sem')} /> Não preciso de troco</label>
                  <label><input type="radio" name="troco" checked={trocoOpcao === 'valor'} onChange={() => setTrocoOpcao('valor')} /> Troco para</label>
                  {trocoOpcao === 'valor' && <input type="number" min={total} step="0.01" value={trocoPara} onChange={(event) => setTrocoPara(event.target.value)} placeholder={`Mínimo R$ ${total.toFixed(2).replace('.', ',')}`} />}
                </div>
              )}

            </section>

          </div>


          {/* =========================
              RESUMO DO PEDIDO
          ========================= */}

          <aside className={styles.resumoPedido}>

            <div className={styles.tituloResumo}>
              <div className={styles.iconeSacola}>
                <svg viewBox="0 0 24 24">
                  <path
                    d="M5 8h14l-1 13H6L5 8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />

                  <path
                    d="M9 9V6a3 3 0 0 1 6 0v3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>

              <h2>Seu pedido</h2>
            </div>


            {/* ITENS */}

            <div className={styles.listaResumo}>

              {itens.length === 0 && (
                <div className={styles.resumoVazio}>
                  Seu carrinho está vazio.
                  <button type="button" onClick={() => navigate('/')}>Voltar ao cardápio</button>
                </div>
              )}

              {itens.map((item) => (

                <div
                  className={styles.itemResumo}
                  key={chaveItem(item)}
                >

                  <img
                    src={item.imagem}
                    alt={item.nome}
                    loading="lazy"
                    decoding="async"
                  />

                  <div className={styles.infoResumoItem}>

                    <h3>
                      {item.nome}
                    </h3>

                    <p>
                      {item.descricao}
                    </p>

                    <div className={styles.quantidadeResumo}>

                      <button
                        type="button"
                        aria-label={`Diminuir quantidade de ${item.nome}`}
                        onClick={() =>
                          diminuirQuantidade(chaveItem(item))
                        }
                      >
                        −
                      </button>

                      <span>
                        {item.quantidade}
                      </span>

                      <button
                        type="button"
                        aria-label={`Aumentar quantidade de ${item.nome}`}
                        disabled={item.quantidade >= 50}
                        onClick={() =>
                          aumentarQuantidade(chaveItem(item))
                        }
                      >
                        +
                      </button>

                    </div>

                  </div>


                  <div className={styles.ladoDireitoItem}>

                    <strong>
                      R${' '}
                      {(precoItem(item) * item.quantidade)
                        .toFixed(2)
                        .replace('.', ',')}
                    </strong>

                    <button
                      type="button"
                      className={styles.removerItem}
                      onClick={() => removerProduto(chaveItem(item))}
                      aria-label={`Remover ${item.nome}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 6L18 18M18 6L6 18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>

                  </div>

                </div>

              ))}

            </div>


            {/* VALORES */}

            <div className={styles.valoresPedido}>

              <div>
                <span>Subtotal</span>

                <strong>
                  R$ {subtotal
                    .toFixed(2)
                    .replace('.', ',')}
                </strong>
              </div>

              <div>
                <span>Taxa de entrega</span>

                <strong>
                  {taxaDefinida
                    ? `R$ ${taxaEntrega.toFixed(2).replace('.', ',')}`
                    : 'Selecione o bairro'}
                </strong>
              </div>

              <div>
                <span>Pedido mínimo</span>
                <strong className={minimoAtingido ? styles.valorValido : styles.valorPendente}>
                  {minimoAtingido ? 'Atingido' : `Faltam R$ ${(pedidoMinimo - subtotal).toFixed(2).replace('.', ',')}`}
                </strong>
              </div>

            </div>


            {/* TOTAL */}

            <div className={styles.totalPedido}>
              <span>Total</span>

              <strong>
                R$ {total
                  .toFixed(2)
                  .replace('.', ',')}
              </strong>
            </div>


            {/* ENTREGA */}

            <div className={styles.entregaEstimada}>

              <div className={styles.iconeEntrega}>
                🛵
              </div>

              <div>
                <span>Entrega estimada</span>

                <strong>
                  {configuracao.tempoEntrega}
                </strong>
              </div>

              <p>
                Seu pedido será preparado
                com muito carinho.
              </p>

            </div>


            {/* FINALIZAR */}

            <button
              type="button"
              className={styles.botaoFinalizar}
              onClick={finalizarPedido}
              disabled={enviando || itens.length === 0 || !lojaDisponivel || !minimoAtingido || formasDisponiveis.length === 0}
            >
              {enviando ? 'Enviando pedido…' : 'Finalizar pedido'}
            </button>

            {erro && <div className={styles.mensagemErro}>{erro}</div>}


            <div className={styles.seguranca}>
              <span>✓</span>

              Valores e disponibilidade serão validados pelo servidor.
            </div>

          </aside>

        </div>


        {/* =========================
            BENEFÍCIOS
        ========================= */}

        <section className={styles.beneficios}>

          <div>
            <span className={styles.iconeBeneficio}>
              ✓
            </span>

            <div>
              <strong>
                Formas de pagamento
              </strong>

              <p>
                Escolha entre as opções habilitadas pela loja.
              </p>
            </div>
          </div>


          <div>
            <span className={styles.iconeBeneficio}>
              ◷
            </span>

            <div>
              <strong>
                Entrega rápida
              </strong>

              <p>
                Do pedido direto à sua porta.
              </p>
            </div>
          </div>


          <div>
            <span className={styles.iconeBeneficio}>
              ☰
            </span>

            <div>
              <strong>
                Feito na hora
              </strong>

              <p>
                Ingredientes frescos e selecionados.
              </p>
            </div>
          </div>

        </section>

      </main>

    </div>
  );
}

export default FinalizarPedidos;
