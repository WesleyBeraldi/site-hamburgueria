import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import xBacon from '../../../assets/xbacon.png';

import styles from './index.module.css';

function FinalizarPedidos() {
  const navigate = useNavigate();

  const [rolouPagina, setRolouPagina] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('pix');

  const [itens, setItens] = useState([
    {
      id: 1,
      nome: 'X-Bacon',
      descricao: 'Pão brioche, hambúrguer artesanal, cheddar e bacon.',
      preco: 34.90,
      quantidade: 1,
      imagem: xBacon
    },
    {
      id: 2,
      nome: 'Batata com Cheddar',
      descricao: 'Batata frita crocante com cheddar cremoso.',
      preco: 24.90,
      quantidade: 1,
      imagem: xBacon
    }
  ]);

  function aumentarQuantidade(id) {
    setItens(
      itens.map((item) =>
        item.id === id
          ? {
              ...item,
              quantidade: item.quantidade + 1
            }
          : item
      )
    );
  }

  function diminuirQuantidade(id) {
    setItens(
      itens
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantidade: item.quantidade - 1
              }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }

  function removerProduto(id) {
    setItens(
      itens.filter((item) => item.id !== id)
    );
  }

  const subtotal = itens.reduce(
    (total, item) =>
      total + item.preco * item.quantidade,
    0
  );

  const taxaEntrega = 7.90;

  const total = subtotal + taxaEntrega;

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
              <span> pagamento</span>
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
                  />
                </div>

                <div className={styles.campo}>
                  <label>Telefone</label>

                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
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
                  />
                </div>

                <div className={styles.campo}>
                  <label>Número</label>

                  <input
                    type="text"
                    placeholder="123"
                  />
                </div>


                <div className={styles.campo}>
                  <label>Bairro</label>

                  <input
                    type="text"
                    placeholder="Digite seu bairro"
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

              {itens.map((item) => (

                <div
                  className={styles.itemResumo}
                  key={item.id}
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
                          diminuirQuantidade(item.id)
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
                          aumentarQuantidade(item.id)
                        }
                      >
                        +
                      </button>

                    </div>

                  </div>


                  <div className={styles.ladoDireitoItem}>

                    <strong>
                      R${' '}
                      {(item.preco * item.quantidade)
                        .toFixed(2)
                        .replace('.', ',')}
                    </strong>

                    <button
                      type="button"
                      className={styles.removerItem}
                      onClick={() => removerProduto(item.id)}
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
                  35–45 min
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
            >
              Finalizar pedido
            </button>


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