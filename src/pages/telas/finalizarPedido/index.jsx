import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useApp } from '../../../context/appContext';
import styles from './index.module.css';

function FinalizarPedidos() {
  const navigate = useNavigate();

  const [rolouPagina, setRolouPagina] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [dadosCliente, setDadosCliente] = useState({
    nome: '',
    telefone: '',
    email: '',
    rua: '',
    numero: '',
    bairro: '',
    complemento: '',
    referencia: '',
    observacao: ''
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
              quantidade: item.quantidade + 1
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

  const taxaEntrega = Number(configuracao.taxaEntrega);

  const total = subtotal + taxaEntrega;

  function alterarCampo(campo, valor) {
    setDadosCliente((atuais) => ({ ...atuais, [campo]: valor }));
  }

  async function finalizarPedido() {
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

    if (obrigatorios.some((campo) => !campo.trim())) {
      setErro('Preencha os dados do cliente e o endereço de entrega.');
      return;
    }

    const nomesPagamento = {
      pix: 'Pix',
      cartao: 'Cartão na entrega',
      dinheiro: 'Dinheiro'
    };

    setErro('');
    try {
      await criarPedidoDelivery({
        ...dadosCliente,
        pagamento: nomesPagamento[formaPagamento]
      });
      navigate('/pedido-finalizado');
    } catch (falha) {
      setErro(falha.message);
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
            Logo
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

      <main className={styles.conteudoPagina}>

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
                  <label>Nome completo</label>

                  <input
                    type="text"
                    placeholder="Digite seu nome"
                    value={dadosCliente.nome}
                    onChange={(event) => alterarCampo('nome', event.target.value)}
                  />
                </div>

                <div className={styles.campo}>
                  <label>Telefone</label>

                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={dadosCliente.telefone}
                    onChange={(event) => alterarCampo('telefone', event.target.value)}
                  />
                </div>

                <div className={`${styles.campo} ${styles.campoCompleto}`}>
                  <label>E-mail</label>
                  <input
                    type="email"
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
                  <label>Rua</label>

                  <input
                    type="text"
                    placeholder="Digite o nome da rua"
                    value={dadosCliente.rua}
                    onChange={(event) => alterarCampo('rua', event.target.value)}
                  />
                </div>

                <div className={styles.campo}>
                  <label>Número</label>

                  <input
                    type="text"
                    placeholder="123"
                    value={dadosCliente.numero}
                    onChange={(event) => alterarCampo('numero', event.target.value)}
                  />
                </div>


                <div className={styles.campo}>
                  <label>Bairro</label>

                  <input
                    type="text"
                    placeholder="Digite seu bairro"
                    value={dadosCliente.bairro}
                    onChange={(event) => alterarCampo('bairro', event.target.value)}
                  />
                </div>


                <div className={styles.campo}>
                  <label>
                    Complemento
                    <span> (opcional)</span>
                  </label>

                  <input
                    type="text"
                    placeholder="Apto, bloco, casa..."
                    value={dadosCliente.complemento}
                    onChange={(event) => alterarCampo('complemento', event.target.value)}
                  />
                </div>


                <div
                  className={`${styles.campo} ${styles.campoCompleto}`}
                >
                  <label>
                    Referência
                    <span> (opcional)</span>
                  </label>

                  <input
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


              <div className={styles.formasPagamento}>

                {/* PIX */}

                <button
                  type="button"
                  onClick={() =>
                    setFormaPagamento('pix')
                  }
                  className={`${styles.opcaoPagamento} ${
                    formaPagamento === 'pix'
                      ? styles.pagamentoAtivo
                      : ''
                  }`}
                >

                  <div className={styles.radioPagamento} />
                

                  <div className={styles.iconePagamento}>
                    ◆
                  </div>

                  <div>
                    <strong>Pix</strong>

                    <span>
                      Aprovação rápida e prática
                    </span>
                  </div>

                </button>


                {/* CARTÃO */}

                <button
                  type="button"
                  onClick={() =>
                    setFormaPagamento('cartao')
                  }
                  className={`${styles.opcaoPagamento} ${
                    formaPagamento === 'cartao'
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

                </button>


                {/* DINHEIRO */}

                <button
                  type="button"
                  onClick={() =>
                    setFormaPagamento('dinheiro')
                  }
                  className={`${styles.opcaoPagamento} ${
                    formaPagamento === 'dinheiro'
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

                </button>

              </div>

            </section>


            {/* OBSERVAÇÃO */}

            <section className={styles.cardFormulario}>
              <div className={styles.tituloCard}>
                <div className={styles.iconeCard}>✎</div>
                <h2>Observações do pedido</h2>
              </div>
              <div className={`${styles.campo} ${styles.campoCompleto}`}>
                <label>Alguma instrução especial? <span>(opcional)</span></label>
                <textarea
                  value={dadosCliente.observacao}
                  onChange={(event) => alterarCampo('observacao', event.target.value)}
                  placeholder="Ex: retirar cebola, entregar na portaria..."
                />
              </div>
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
                  R$ {taxaEntrega
                    .toFixed(2)
                    .replace('.', ',')}
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
              disabled={itens.length === 0}
            >
              Finalizar pedido
            </button>

            {erro && <div className={styles.mensagemErro}>{erro}</div>}


            <div className={styles.seguranca}>
              <span>✓</span>

              Ambiente seguro para finalizar seu pedido.
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
                Pagamento seguro
              </strong>

              <p>
                Seus dados protegidos.
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
