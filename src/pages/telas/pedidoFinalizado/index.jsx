import { Link } from 'react-router-dom';

import xBacon from '../../../assets/xbacon.png';

import styles from './index.module.css';

function PedidoFinalizado() {

  const pedido = {
    numero: '#PED25678',

    data: '14/08/2026',
    horario: '19:42',

    previsao: '35–45 min',

    pagamento: 'Pix',

    endereco:
      'Rua das Palmeiras, 123 - Centro',

    itens: [
      {
        id: 1,
        nome: 'Combo X-Bacon',
        descricao:
          'X-Bacon artesanal, batata frita crocante e refrigerante.',
        quantidade: 1,
        preco: 42.40,
        imagem: xBacon
      },

      {
        id: 2,
        nome: 'Batata com Cheddar',
        descricao:
          'Batata frita crocante com cheddar cremoso e bacon.',
        quantidade: 1,
        preco: 24.90,
        imagem: xBacon
      }
    ],

    taxaEntrega: 7.90
  };


  const subtotal = pedido.itens.reduce(
    (total, item) =>
      total + item.preco * item.quantidade,
    0
  );


  const total =
    subtotal + pedido.taxaEntrega;


  return (
    <div className={styles.pagina}>

      {/* =========================
          HEADER
      ========================= */}

      <header className={styles.barraPrincipal}>

        <div className={styles.conteudoHeader}>

          <Link
            to="/"
            className={styles.logo}
          >
            Logo
          </Link>


          <nav className={styles.menu}>

            <Link to="/">
              Início
            </Link>

            <Link to="/">
              Cardápio
            </Link>

            <Link to="/">
              Promoções
            </Link>

            <Link to="/">
              Sobre
            </Link>

            <Link to="/">
              Contato
            </Link>

          </nav>

        </div>

      </header>


      {/* =========================
          CONTEÚDO
      ========================= */}

      <main className={styles.conteudoPagina}>


        {/* =========================
            CONFIRMAÇÃO
        ========================= */}

        <section className={styles.confirmacao}>

          <div className={styles.iconeConfirmacao}>

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M5 12.5L9.5 17L19 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

          </div>


          <div className={styles.textoConfirmacao}>

            <span>
              PEDIDO REALIZADO COM SUCESSO
            </span>

            <h1>
              Pedido
              <strong> confirmado!</strong>
            </h1>

            <p>
              Obrigado pela preferência! Seu pedido
              foi recebido e já estamos preparando tudo
              com muito carinho.
            </p>

          </div>

        </section>


        {/* =========================
            INFORMAÇÕES DO PEDIDO
        ========================= */}

        <section className={styles.informacoesPedido}>

          {/* NÚMERO */}

          <div className={styles.infoPedido}>

            <div className={styles.iconeInfo}>

              <svg viewBox="0 0 24 24">
                <path
                  d="M7 3h10v18l-2-1.5L12 21l-3-1.5L7 21V3Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />

                <path
                  d="M10 8h4M10 12h4M10 16h3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>

            </div>


            <div>
              <span>
                Número do pedido
              </span>

              <strong>
                {pedido.numero}
              </strong>

              <p>
                {pedido.data} às {pedido.horario}
              </p>
            </div>

          </div>


          {/* PREVISÃO */}

          <div className={styles.infoPedido}>

            <div className={styles.iconeInfo}>

              <svg viewBox="0 0 24 24">

                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />

                <path
                  d="M12 7v5l3 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

              </svg>

            </div>


            <div>
              <span>
                Previsão de entrega
              </span>

              <strong>
                {pedido.previsao}
              </strong>

              <p>
                Tempo estimado
              </p>
            </div>

          </div>


          {/* PAGAMENTO */}

          <div className={styles.infoPedido}>

            <div className={styles.iconeInfo}>

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
                  d="M3 10h18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />

              </svg>

            </div>


            <div>
              <span>
                Forma de pagamento
              </span>

              <strong>
                {pedido.pagamento}
              </strong>

              <p>
                Pagamento selecionado
              </p>
            </div>

          </div>


          {/* ENDEREÇO */}

          <div className={styles.infoPedido}>

            <div className={styles.iconeInfo}>

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
                  r="2.2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />

              </svg>

            </div>


            <div>
              <span>
                Endereço de entrega
              </span>

              <strong className={styles.endereco}>
                {pedido.endereco}
              </strong>

              <p>
                Entrega no endereço informado
              </p>
            </div>

          </div>

        </section>


        {/* =========================
            STATUS
        ========================= */}

        <section className={styles.statusPedido}>

          <div className={styles.linhaStatus} />


          {/* RECEBIDO */}

          <div
            className={`${styles.etapaStatus} ${styles.etapaConcluida}`}
          >

            <div className={styles.circuloStatus}>
              ✓
            </div>

            <strong>
              Pedido recebido
            </strong>

            <span>
              {pedido.horario}
            </span>

          </div>


          {/* PREPARO */}

          <div
            className={`${styles.etapaStatus} ${styles.etapaAtual}`}
          >

            <div className={styles.circuloStatus}>
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 15h16M6 15a6 6 0 0 1 12 0M12 7V5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <strong>
              Em preparo
            </strong>

            <span>
              Preparando agora
            </span>

          </div>


          {/* SAIU */}

          <div className={styles.etapaStatus}>

            <div className={styles.circuloStatus}>

              <svg viewBox="0 0 24 24">

                <path
                  d="M4 16h11l2-6h3l1 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <circle
                  cx="7"
                  cy="18"
                  r="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />

                <circle
                  cx="18"
                  cy="18"
                  r="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />

              </svg>

            </div>

            <strong>
              Saiu para entrega
            </strong>

            <span>
              Aguarde
            </span>

          </div>


          {/* ENTREGUE */}

          <div className={styles.etapaStatus}>

            <div className={styles.circuloStatus}>

              <svg viewBox="0 0 24 24">

                <path
                  d="M4 11L12 4L20 11V20H5V11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />

              </svg>

            </div>

            <strong>
              Entregue
            </strong>

            <span>
              Aguarde
            </span>

          </div>

        </section>


        {/* =========================
            PARTE INFERIOR
        ========================= */}

        <div className={styles.areaResumo}>


          {/* ITENS */}

          <section className={styles.cardItens}>

            <h2>
              Itens do pedido
            </h2>


            <div className={styles.listaItens}>

              {pedido.itens.map((item) => (

                <article
                  key={item.id}
                  className={styles.itemPedido}
                >

                  <img
                    src={item.imagem}
                    alt={item.nome}
                  />


                  <div className={styles.quantidadeItem}>
                    {item.quantidade}x
                  </div>


                  <div className={styles.infoItem}>

                    <h3>
                      {item.nome}
                    </h3>

                    <p>
                      {item.descricao}
                    </p>

                  </div>


                  <strong className={styles.precoItem}>
                    R${' '}
                    {(item.preco * item.quantidade)
                      .toFixed(2)
                      .replace('.', ',')}
                  </strong>

                </article>

              ))}

            </div>

          </section>


          {/* RESUMO */}

          <section className={styles.cardResumo}>

            <h2>
              Resumo do pedido
            </h2>


            <div className={styles.linhaResumo}>

              <span>
                Subtotal
              </span>

              <strong>
                R$ {subtotal
                  .toFixed(2)
                  .replace('.', ',')}
              </strong>

            </div>


            <div className={styles.linhaResumo}>

              <span>
                Taxa de entrega
              </span>

              <strong>
                R$ {pedido.taxaEntrega
                  .toFixed(2)
                  .replace('.', ',')}
              </strong>

            </div>


            <div className={styles.totalResumo}>

              <span>
                Total pago
              </span>

              <strong>
                R$ {total
                  .toFixed(2)
                  .replace('.', ',')}
              </strong>

            </div>

          </section>

        </div>


        {/* =========================
            BENEFÍCIOS
        ========================= */}

        <section className={styles.beneficios}>

          <div>

            <div className={styles.iconeBeneficio}>
              ✓
            </div>

            <div>
              <strong>
                Pagamento seguro
              </strong>

              <p>
                Seus dados protegidos durante todo o pedido.
              </p>
            </div>

          </div>


          <div>

            <div className={styles.iconeBeneficio}>
              ◷
            </div>

            <div>
              <strong>
                Entrega rápida
              </strong>

              <p>
                Seu pedido preparado e entregue com agilidade.
              </p>
            </div>

          </div>


          <div>

            <div className={styles.iconeBeneficio}>
              ♨
            </div>

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

export default PedidoFinalizado;