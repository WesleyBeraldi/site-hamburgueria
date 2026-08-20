import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import banner from '../../assets/banner.png';
import xBacon from '../../assets/xbacon.png';
import { useApp } from '../../context/appContext';
import styles from './index.module.css';

function Home() {
  const [rolouPagina, setRolouPagina] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [secaoAtiva, setSecaoAtiva] = useState('inicio');

  const [indicePromocao, setIndicePromocao] = useState(0);

  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [modalProdutoAberto, setModalProdutoAberto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const [observacao, setObservacao] = useState('');
  const [quantidadeModal, setQuantidadeModal] = useState(1);

  const navigate = useNavigate();
  const {
    produtos: produtosSalvos,
    promocoes: promocoesSalvas,
    adicionais: adicionaisSalvos,
    carrinho,
    setCarrinho
  } = useApp();

  const [adicionaisSelecionados, setAdicionaisSelecionados] =
    useState([]);

  const categorias = [
    'Todos',
    'Hambúrgueres',
    'Combos',
    'Porções',
    'Bebidas'
  ];

  const produtosPadrao = [
    {
      id: 1,
      nome: 'X-Bacon',
      categoria: 'Hambúrgueres',
      descricao:
        'Pão brioche, hambúrguer artesanal, cheddar cremoso, bacon crocante, alface e tomate.',
      preco: '34,90',
      imagem: xBacon,
      destaque: 'Mais vendido'
    },
    {
      id: 2,
      nome: 'X-Salada',
      categoria: 'Hambúrgueres',
      descricao:
        'Pão brioche, hambúrguer artesanal, queijo, alface, tomate e molho especial da casa.',
      preco: '29,90',
      imagem: xBacon
    },
    {
      id: 3,
      nome: 'Duplo Bacon',
      categoria: 'Hambúrgueres',
      descricao:
        'Dois hambúrgueres artesanais, cheddar duplo, bacon crocante e molho especial.',
      preco: '42,90',
      imagem: xBacon,
      destaque: 'Recomendado'
    },
    {
      id: 4,
      nome: 'X-Tudo',
      categoria: 'Hambúrgueres',
      descricao:
        'Hambúrguer artesanal, queijo, bacon, ovo, presunto, alface, tomate e maionese.',
      preco: '39,90',
      imagem: xBacon
    },
    {
      id: 5,
      nome: 'Combo X-Bacon',
      categoria: 'Combos',
      descricao:
        'X-Bacon acompanhado de batata frita e refrigerante.',
      preco: '49,90',
      imagem: xBacon
    },
    {
      id: 6,
      nome: 'Batata com Cheddar',
      categoria: 'Porções',
      descricao:
        'Batata frita crocante com cheddar cremoso e bacon.',
      preco: '24,90',
      imagem: xBacon
    },
    {
      id: 7,
      nome: 'Refrigerante',
      categoria: 'Bebidas',
      descricao:
        'Refrigerante gelado disponível em diversos sabores.',
      preco: '7,00',
      imagem: xBacon
    }
  ];

  const produtos = (produtosSalvos.length > 0
    ? produtosSalvos
    : produtosPadrao
  ).filter((produto) => produto.ativo !== false);

  const promocoesPadrao = [
    {
      id: 101,
      nome: 'Combo X-Bacon',
      categoria: 'Combos',

      descricao:
        'X-Bacon artesanal + batata frita crocante + refrigerante.',

      precoAntigo: '49,90',
      preco: '42,40',

      imagem: xBacon,

      destaque: '15% OFF',
      tipo: 'COMBO ESPECIAL'
    },

    {
      id: 102,
      nome: 'Combo Duplo',
      categoria: 'Combos',

      descricao:
        '2 X-Bacon artesanais + porção de fritas + 2 refrigerantes.',

      precoAntigo: '79,90',
      preco: '69,90',

      imagem: xBacon,

      destaque: 'MAIS PEDIDO',
      tipo: 'PARA COMPARTILHAR'
    },

    {
      id: 103,
      nome: 'X-Bacon em Dobro',
      categoria: 'Combos',

      descricao:
        'Dois X-Bacon artesanais com muito cheddar e bacon crocante.',

      precoAntigo: '74,90',
      preco: '59,90',

      imagem: xBacon,

      destaque: '20% OFF',
      tipo: 'OFERTA DO DIA'
    },

    {
      id: 104,
      nome: 'Combo Família',
      categoria: 'Combos',

      descricao:
        '3 hambúrgueres artesanais + fritas grandes + refrigerante.',

      precoAntigo: '119,90',
      preco: '99,90',

      imagem: xBacon,

      destaque: 'ECONOMIZE',
      tipo: 'PARA A GALERA'
    },

    {
      id: 105,
      nome: 'Duplo Cheddar',
      categoria: 'Hambúrgueres',

      descricao:
        'Hambúrguer duplo, cheddar cremoso e bacon crocante.',

      precoAntigo: '46,90',
      preco: '39,90',

      imagem: xBacon,

      destaque: '15% OFF',
      tipo: 'OFERTA ESPECIAL'
    }
  ];

  const promocoes = (promocoesSalvas.length > 0
    ? promocoesSalvas
    : promocoesPadrao
  ).filter((promocao) => promocao.ativo !== false);

  const quantidadePromocoesVisiveis = 2;

    const maxIndicePromocao =
      Math.max(
        0,
        promocoes.length - quantidadePromocoesVisiveis
      );


    function proximaPromocao() {
      setIndicePromocao((indiceAtual) => {
        if (indiceAtual >= maxIndicePromocao) {
          return 0;
        }

        return indiceAtual + 1;
      });
    }


    function promocaoAnterior() {
      setIndicePromocao((indiceAtual) => {
        if (indiceAtual <= 0) {
          return maxIndicePromocao;
        }

        return indiceAtual - 1;
      });
    }


    const promocoesVisiveis =
      promocoes.slice(
        indicePromocao,
        indicePromocao + quantidadePromocoesVisiveis
      );

  const adicionaisPadrao = [
    {
      id: 1,
      nome: 'Bacon extra',
      preco: 5
    },
    {
      id: 2,
      nome: 'Cheddar extra',
      preco: 4
    },
    {
      id: 3,
      nome: 'Hambúrguer extra',
      preco: 10
    },
    {
      id: 4,
      nome: 'Ovo',
      preco: 3
    },
    {
      id: 5,
      nome: 'Cebola caramelizada',
      preco: 4
    },
    {
      id: 6,
      nome: 'Catupiry',
      preco: 6
    }
  ];

  const adicionais = adicionaisSalvos.length > 0
    ? adicionaisSalvos
    : adicionaisPadrao;

  const produtosFiltrados =
    categoriaAtiva === 'Todos'
      ? produtos
      : produtos.filter(
          (produto) => produto.categoria === categoriaAtiva
        );

  function abrirCarrinho() {
    setCarrinhoAberto(true);
  }

  function fecharCarrinho() {
    setCarrinhoAberto(false);
  }

  function abrirModalProduto(produto) {
    setProdutoSelecionado(produto);

    setObservacao('');
    setQuantidadeModal(1);
    setAdicionaisSelecionados([]);

    setModalProdutoAberto(true);
  }

  function fecharModalProduto() {
    setModalProdutoAberto(false);
    setProdutoSelecionado(null);

    setObservacao('');
    setQuantidadeModal(1);
    setAdicionaisSelecionados([]);
  }

  function selecionarAdicional(adicional) {
    const jaSelecionado = adicionaisSelecionados.some(
      (item) => item.id === adicional.id
    );

    if (jaSelecionado) {
      setAdicionaisSelecionados(
        adicionaisSelecionados.filter(
          (item) => item.id !== adicional.id
        )
      );
    } else {
      setAdicionaisSelecionados([
        ...adicionaisSelecionados,
        adicional
      ]);
    }
  }

  function aumentarQuantidade(chave) {
    setCarrinho(
      carrinho.map((item) =>
        (item.carrinhoId ?? item.id) === chave
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      )
    );
  }

  function diminuirQuantidade(chave) {
    setCarrinho(
      carrinho
        .map((item) =>
          (item.carrinhoId ?? item.id) === chave
            ? { ...item, quantidade: item.quantidade - 1 }
            : item
        )
        .filter((item) => item.quantidade > 0)
    );
  }

  function removerProduto(chave) {
    setCarrinho(
      carrinho.filter((item) => (item.carrinhoId ?? item.id) !== chave)
    );
  }

  const totalCarrinho = carrinho.reduce((total, item) => {

    const preco =
      item.precoFinal ??
      Number(item.preco.replace(',', '.'));

    return total + preco * item.quantidade;

  }, 0);

  const quantidadeCarrinho = carrinho.reduce(
    (total, item) => total + item.quantidade,
    0
  );
  
  function irParaSecao(id) {
  const secao = document.getElementById(id);

  if (secao) {
    secao.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

  useEffect(() => {
    function verificarScroll() {
      setRolouPagina(window.scrollY > 50);
    }

    verificarScroll();

    window.addEventListener('scroll', verificarScroll);

    return () => {
      window.removeEventListener('scroll', verificarScroll);
    };
  }, []);

  useEffect(() => {
    function verificarSecaoAtual() {
      const cardapio = document.getElementById('cardapio');
      const promocoes = document.getElementById('promocoes');
      const sobre = document.getElementById('sobre');

      const linhaMenu = 200;

      const elementoScroll =
        document.scrollingElement || document.documentElement;

      const scrollAtual = elementoScroll.scrollTop;
      const alturaPagina = elementoScroll.scrollHeight;
      const alturaTela = window.innerHeight;

      const chegouNoFinal =
        scrollAtual + alturaTela >= alturaPagina - 20;

      /*
        SOBRE
        Ativa quando:
        1. chegou no final da página
        OU
        2. o Sobre já entrou bastante na tela
      */
      if (sobre) {
        const posicaoSobre =
          sobre.getBoundingClientRect();

        if (
          chegouNoFinal ||
          (
            posicaoSobre.top <= alturaTela * 0.75 &&
            posicaoSobre.bottom > linhaMenu
          )
        ) {
          setSecaoAtiva('sobre');
          return;
        }
      }

      /*
        PROMOÇÕES
      */
      if (promocoes) {
        const posicaoPromocoes =
          promocoes.getBoundingClientRect();

        if (
          posicaoPromocoes.top <= linhaMenu &&
          posicaoPromocoes.bottom > linhaMenu
        ) {
          setSecaoAtiva('promocoes');
          return;
        }
      }

      /*
        CARDÁPIO
      */
      if (cardapio) {
        const posicaoCardapio =
          cardapio.getBoundingClientRect();

        if (
          posicaoCardapio.top <= linhaMenu &&
          posicaoCardapio.bottom > linhaMenu
        ) {
          setSecaoAtiva('cardapio');
          return;
        }
      }

      /*
        INÍCIO
      */
      setSecaoAtiva('inicio');
    }


    // Scroll normal da página
    window.addEventListener(
      'scroll',
      verificarSecaoAtual,
      { passive: true }
    );

    /*
      Também detecta scroll caso algum elemento
      esteja sendo responsável pela rolagem.
    */
    document.addEventListener(
      'scroll',
      verificarSecaoAtual,
      true
    );

    window.addEventListener(
      'resize',
      verificarSecaoAtual
    );


    // Verifica assim que a página carregar
    verificarSecaoAtual();


    return () => {
      window.removeEventListener(
        'scroll',
        verificarSecaoAtual
      );

      document.removeEventListener(
        'scroll',
        verificarSecaoAtual,
        true
      );

      window.removeEventListener(
        'resize',
        verificarSecaoAtual
      );
    };
  }, []);

  const precoProdutoSelecionado = produtoSelecionado
    ? Number(produtoSelecionado.preco.replace(',', '.'))
    : 0;

  const totalAdicionais = adicionaisSelecionados.reduce(
    (total, adicional) => total + adicional.preco,
    0
  );

  const totalModal =
    (precoProdutoSelecionado + totalAdicionais) *
    quantidadeModal;

  function confirmarProduto() {
    if (!produtoSelecionado) {
      return;
    }

    const precoFinal =
      precoProdutoSelecionado + totalAdicionais;

    const novoItem = {
      ...produtoSelecionado,

      carrinhoId: `${produtoSelecionado.id}-${Date.now()}`,

      quantidade: quantidadeModal,

      observacao: observacao.trim(),

      adicionais: adicionaisSelecionados,

      precoFinal
    };

    setCarrinho((carrinhoAtual) => [
      ...carrinhoAtual,
      novoItem
    ]);

    fecharModalProduto();

    setCarrinhoAberto(true);
  }

  return (
    <div className={styles.pagina}>
      <header
        className={`${styles.barraPrincipal} ${
          rolouPagina ? styles.barraRolada : ''
        }`}
      >
        <div className={styles.conteudoHeader}>
          <Link to="/" className={styles.logo}>
            Logo
          </Link>

          <nav className={styles.menu}>

            <a
              href="#inicio"
              className={
                secaoAtiva === 'inicio'
                  ? styles.linkAtivo
                  : ''
              }
              onClick={(e) => {
                e.preventDefault();
                irParaSecao('inicio');
              }}
            >
              Início
            </a>

            <a
              href="#cardapio"
              className={
                secaoAtiva === 'cardapio'
                  ? styles.linkAtivo
                  : ''
              }
              onClick={(e) => {
                e.preventDefault();
                irParaSecao('cardapio');
              }}
            >
              Cardápio
            </a>

            <a
              href="#promocoes"
              className={
                secaoAtiva === 'promocoes'
                  ? styles.linkAtivo
                  : ''
              }
              onClick={(e) => {
                e.preventDefault();
                irParaSecao('promocoes');
              }}
            >
              Promoções
            </a>

           <a
              href="#sobre"
              className={
                secaoAtiva === 'sobre'
                  ? styles.linkAtivo
                  : ''
              }
              onClick={(e) => {
                e.preventDefault();
                irParaSecao('sobre');
              }}
            >
              Sobre
            </a>

            <a
              href="#sobre"
              className={
                secaoAtiva === 'sobre'
                  ? styles.linkAtivo
                  : ''
              }
              onClick={(e) => {
                e.preventDefault();
                irParaSecao('sobre');
              }}
            >
              Contato
            </a>

          </nav>

          <button
            type="button"
            className={styles.botaoCarrinho}
            onClick={abrirCarrinho}
          >
            <svg
              className={styles.iconeCarrinho}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 3h2l2.4 10.1a2 2 0 0 0 2 1.5h7.7a2 2 0 0 0 1.9-1.4L21 6H6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle cx="10" cy="20" r="1" fill="currentColor" />
              <circle cx="18" cy="20" r="1" fill="currentColor" />
            </svg>

            Ver Carrinho

            {quantidadeCarrinho > 0 && (
              <span className={styles.numeroCarrinho}>
                {quantidadeCarrinho}
              </span>
            )}
          </button>

        </div>
      </header>

      <section
        id="inicio"
        className={styles.banner}
        style={{ backgroundImage: `url(${banner})` }}
      >
        <div className={styles.conteudoBanner}>
          <span className={styles.textoPequeno}>
            🔥 FEITO NA HORA
          </span>

          <h1>
            <span className={styles.tituloBranco}>
              O Verdadeiro
            </span>

            <span className={styles.tituloAmarelo}>
              Hambúrguer Artesanal
            </span>
          </h1>

          <p className={styles.descricaoBanner}>
            Carne grelhada na hora, cheddar cremoso,
            <br className={styles.quebraDesktop} />
            bacon crocante e ingredientes sempre frescos
            <br className={styles.quebraDesktop} />
            para uma experiência irresistível.
          </p>

          <div className={styles.botoesBanner}>
            <button
              type="button"
              className={styles.botaoPrincipal}
              onClick={abrirCarrinho}
            >
              Peça agora
            </button>

            <button
              type="button"
              className={styles.botaoSecundario}
              onClick={() => irParaSecao('cardapio')}
            >
              Ver Cardápio
            </button>

          </div>
        </div>
      </section>

      <section
        id="cardapio"
        className={styles.cardapio}
      >

        <h2>Nosso cardápio</h2>

        <p>Escolha o seu hambúrguer favorito.</p>

        {/* PROMOÇÕES */}
        <div
          id="promocoes"
          className={styles.areaPromocoes}
        >

          <div className={styles.topoPromocoes}>

            <div>
              <span>
                🔥 OFERTAS ESPECIAIS
              </span>

              <h3>
                Promoções do dia
              </h3>
            </div>


            <div className={styles.controlesPromocao}>

              <button
                type="button"
                className={styles.setaPromocao}
                onClick={promocaoAnterior}
                aria-label="Promoção anterior"
              >
                <svg viewBox="0 0 24 24">
                  <path
                    d="M15 5L8 12L15 19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>


              <button
                type="button"
                className={styles.setaPromocao}
                onClick={proximaPromocao}
                aria-label="Próxima promoção"
              >
                <svg viewBox="0 0 24 24">
                  <path
                    d="M9 5L16 12L9 19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

            </div>

          </div>


          <div className={styles.carrosselPromocoes}>

            <div
              key={indicePromocao}
              className={styles.listaPromocoes}
            >

              {promocoesVisiveis.map((promocao) => (

                <article
                  key={promocao.id}
                  className={styles.cardPromocao}
                >

                  <div className={styles.imagemPromocao}>

                    <img
                      src={promocao.imagem}
                      alt={promocao.nome}
                    />


                    <span className={styles.seloPromocao}>
                      {promocao.destaque}
                    </span>

                  </div>


                  <div className={styles.conteudoPromocao}>

                    <span className={styles.tipoPromocao}>
                      {promocao.tipo}
                    </span>


                    <h4>
                      {promocao.nome}
                    </h4>


                    <p>
                      {promocao.descricao}
                    </p>


                    <div className={styles.precoPromocao}>

                      <span>
                        De R$ {promocao.precoAntigo}
                      </span>

                      <strong>
                        R$ {promocao.preco}
                      </strong>

                    </div>


                    <button
                      type="button"
                      onClick={() =>
                        abrirModalProduto(promocao)
                      }
                    >
                      Aproveitar oferta
                    </button>

                  </div>

                </article>

              ))}

            </div>

          </div>


          {/* INDICADOR */}

          <div className={styles.indicadoresPromocao}>

            {Array.from({
              length: maxIndicePromocao + 1
            }).map((_, indice) => (

              <button
                key={indice}
                type="button"
                aria-label={`Ir para promoção ${indice + 1}`}
                onClick={() =>
                  setIndicePromocao(indice)
                }
                className={
                  indicePromocao === indice
                    ? styles.indicadorAtivo
                    : ''
                }
              />

            ))}

          </div>

        </div>

        <div className={styles.categorias}>
          {categorias.map((categoria) => (
            <button
              key={categoria}
              type="button"
              onClick={() => setCategoriaAtiva(categoria)}
              className={`${styles.botaoCategoria} ${
                categoriaAtiva === categoria
                  ? styles.categoriaAtiva
                  : ''
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>

        <div className={styles.listaProdutos}>
          {produtosFiltrados.map((produto) => (
            <article
              className={styles.cardProduto}
              key={produto.id}
            >
              <div className={styles.areaImagemProduto}>
                <img
                  src={produto.imagem}
                  alt={produto.nome}
                  className={styles.imagemProduto}
                />

                {produto.destaque && (
                  <span className={styles.seloProduto}>
                    🔥 {produto.destaque}
                  </span>
                )}
              </div>

              <div className={styles.informacoesProduto}>
                <div>
                  <h3 className={styles.informacoesProdutoTitulo}>{produto.nome}</h3>
                  <p className={styles.informacoesProdutoDescrição}>{produto.descricao}</p>
                </div>

                <div className={styles.rodapeProduto}>
                  <div className={styles.precoProduto}>
                    <span>A partir de</span>
                    <strong>R$ {produto.preco}</strong>
                  </div>

                  <button
                    type="button"
                    className={styles.botaoAdicionar}
                    onClick={() => abrirModalProduto(produto)}
                  >
                    Adicionar
                  </button>

                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* =========================
          SOBRE A LOJA
      ========================= */}

      <section
        id="sobre"
        className={styles.sobreLoja}
      >
        <div className={styles.conteudoSobre}>

          {/* PARTE PRINCIPAL */}

          <div className={styles.apresentacaoLoja}>
            <Link
              to="/"
              className={styles.logoRodape}
            >
              Logo
            </Link>

            <h2>
              Hambúrguer de verdade,
              <span> feito do nosso jeito.</span>
            </h2>

            <p>
              Trabalhamos com ingredientes selecionados,
              hambúrguer artesanal preparado na hora e muito
              sabor em cada pedido.
            </p>

            <div className={styles.redesSociais}>
              <span>Siga a gente</span>

              <div className={styles.iconesSociais}>

                <a
                  href="#"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24">
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />

                    <circle
                      cx="17.5"
                      cy="6.5"
                      r="1"
                      fill="currentColor"
                    />
                  </svg>
                </a>

                <a
                  href="#"
                  aria-label="Facebook"
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>

                <a
                  href="#"
                  aria-label="WhatsApp"
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M20 11.5A8 8 0 0 1 8.2 18.6L4 20l1.4-4.1A8 8 0 1 1 20 11.5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>

              </div>
            </div>
          </div>


          {/* NAVEGAÇÃO */}

          <div className={styles.colunaSobre}>
            <h3>Navegação</h3>

            <button
              type="button"
              onClick={() => irParaSecao('inicio')}
            >
              Início
            </button>

            <button
              type="button"
              onClick={() => irParaSecao('cardapio')}
            >
              Cardápio
            </button>

            <button
              type="button"
              onClick={() => irParaSecao('promocoes')}
            >
              Promoções
            </button>

            <button
              type="button"
              onClick={() => irParaSecao('sobre')}
            >
              Sobre nós
            </button>
          </div>


          {/* FUNCIONAMENTO */}

          <div className={styles.colunaSobre}>
            <h3>Funcionamento</h3>

            <div className={styles.horario}>
              <span>Segunda a Quinta</span>
              <strong>18:00 — 23:00</strong>
            </div>

            <div className={styles.horario}>
              <span>Sexta e Sábado</span>
              <strong>18:00 — 00:00</strong>
            </div>

            <div className={styles.horario}>
              <span>Domingo</span>
              <strong>18:00 — 23:30</strong>
            </div>
          </div>


          {/* CONTATO */}

          <div className={styles.colunaSobre}>
            <h3>Fale com a gente</h3>

            <div className={styles.contatoSobre}>
              <span>Telefone</span>
              <strong>
                (00) 00000-0000
              </strong>
            </div>

            <div className={styles.contatoSobre}>
              <span>E-mail</span>
              <strong>
                contato@hamburgueria.com
              </strong>
            </div>

            <button
              type="button"
              className={styles.botaoWhatsapp}
            >
              Pedir pelo WhatsApp
            </button>
          </div>

        </div>


        {/* PARTE INFERIOR */}

        <div className={styles.rodapeFinal}>
          <p>
            © 2026 Hamburgueria. Todos os direitos reservados.
          </p>

          <div>
            <a href="#">
              Política de Privacidade
            </a>

            <span>•</span>

            <a href="#">
              Termos de Uso
            </a>
          </div>
        </div>

      </section>

      {modalProdutoAberto && produtoSelecionado && (
        <div
          className={styles.overlayModalProduto}
          onClick={fecharModalProduto}
        >

          <div
            className={styles.modalProduto}
            onClick={(evento) => evento.stopPropagation()}
          >

            {/* CABEÇALHO */}

            <div className={styles.topoModalProduto}>

              <div className={styles.resumoProdutoModal}>

                <img
                  src={produtoSelecionado.imagem}
                  alt={produtoSelecionado.nome}
                />

                <div>
                  <span>PERSONALIZE SEU PEDIDO</span>

                  <h2>
                    {produtoSelecionado.nome}
                  </h2>

                  <p>
                    {produtoSelecionado.descricao}
                  </p>

                  <strong>
                    R$ {produtoSelecionado.preco}
                  </strong>
                </div>

              </div>


              <button
                type="button"
                className={styles.fecharModalProduto}
                onClick={fecharModalProduto}
                aria-label="Fechar"
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


            {/* ADICIONAIS */}

            <div className={styles.secaoModal}>

              <div className={styles.tituloSecaoModal}>
                <div>
                  <span>OPCIONAL</span>
                  <h3>Quer deixar ainda melhor?</h3>
                </div>

                <span>
                  Escolha seus adicionais
                </span>
              </div>


              <div className={styles.listaAdicionais}>

                {adicionais.map((adicional) => {

                  const selecionado =
                    adicionaisSelecionados.some(
                      (item) => item.id === adicional.id
                    );

                  return (
                    <button
                      type="button"
                      key={adicional.id}
                      className={`${styles.cardAdicional} ${
                        selecionado
                          ? styles.adicionalSelecionado
                          : ''
                      }`}
                      onClick={() =>
                        selecionarAdicional(adicional)
                      }
                    >

                      <div
                        className={styles.checkboxAdicional}
                      >
                        {selecionado && '✓'}
                      </div>

                      <div>
                        <strong>
                          {adicional.nome}
                        </strong>

                        <span>
                          + R$ {adicional.preco
                            .toFixed(2)
                            .replace('.', ',')}
                        </span>
                      </div>

                    </button>
                  );
                })}

              </div>

            </div>


            {/* OBSERVAÇÃO */}

            <div className={styles.secaoObservacao}>

              <div className={styles.tituloObservacao}>
                <div>
                  <span>OBSERVAÇÕES</span>

                  <h3>
                    Algum pedido especial?
                  </h3>
                </div>

                <span>
                  {observacao.length}/180
                </span>
              </div>

              <textarea
                value={observacao}
                maxLength={180}
                onChange={(evento) =>
                  setObservacao(evento.target.value)
                }
                placeholder="Ex: sem cebola, tirar tomate, molho separado..."
              />

            </div>


            {/* RODAPÉ */}

            <div className={styles.rodapeModalProduto}>

              <div className={styles.quantidadeModal}>

                <button
                  type="button"
                  onClick={() =>
                    setQuantidadeModal(
                      Math.max(1, quantidadeModal - 1)
                    )
                  }
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M6 12H18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                <span>
                  {quantidadeModal}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantidadeModal(
                      quantidadeModal + 1
                    )
                  }
                >
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 6V18M6 12H18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

              </div>


              <div className={styles.totalModal}>

                <span>Total</span>

                <strong>
                  R$ {totalModal
                    .toFixed(2)
                    .replace('.', ',')}
                </strong>

              </div>


              <button
                type="button"
                className={styles.confirmarProduto}
                onClick={confirmarProduto}
              >
                Adicionar ao carrinho
              </button>

            </div>

          </div>

        </div>
      )}

      <div
        className={`${styles.overlayCarrinho} ${
          carrinhoAberto ? styles.overlayVisivel : ''
        }`}
        onClick={fecharCarrinho}
      />

      <aside
        className={`${styles.carrinhoLateral} ${
          carrinhoAberto ? styles.carrinhoAberto : ''
        }`}
      >
        <div className={styles.topoCarrinho}>
          <div>
            <span className={styles.subtituloCarrinho}>
              SEU PEDIDO
            </span>

            <h2>Meu Carrinho</h2>
          </div>

          <button
            type="button"
            className={styles.fecharCarrinho}
            onClick={fecharCarrinho}
          >
            ×
          </button>
        </div>

        <div className={styles.linhaCarrinho} />

        <div className={styles.produtosCarrinho}>
          {carrinho.length === 0 ? (
            <div className={styles.carrinhoVazio}>
              <div className={styles.iconeCarrinhoVazio}>
                🛒
              </div>

              <h3>Seu carrinho está vazio</h3>

              <p>
                Adicione seus hambúrgueres favoritos para
                começar o pedido.
              </p>

              <button
                type="button"
                onClick={() => {
                  fecharCarrinho();

                  setTimeout(() => {
                    irParaSecao('cardapio');
                  }, 300);
                }}
              >
                Ver cardápio
              </button>

            </div>
          ) : (
            carrinho.map((item) => (
              <div
                className={styles.itemCarrinho}
                key={item.carrinhoId ?? item.id}
              >
                <img
                  src={item.imagem}
                  alt={item.nome}
                />

               <div className={styles.infoItemCarrinho}>

                <div className={styles.nomeRemover}>
                  <h3>{item.nome}</h3>

                  <button
                    type="button"
                    className={styles.botaoRemover}
                    onClick={() => removerProduto(item.carrinhoId ?? item.id)}
                    aria-label="Remover produto"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 6L18 18M18 6L6 18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>


                {/* DESCRIÇÃO DO PRODUTO */}

                <p className={styles.descricaoItemCarrinho}>
                  {item.descricao}
                </p>


                {/* ADICIONAIS */}

                {item.adicionais?.length > 0 && (
                  <div className={styles.adicionaisCarrinho}>

                    {item.adicionais.map((adicional) => (
                      <span key={adicional.id}>
                        + {adicional.nome}
                        <strong>
                          + R$ {adicional.preco
                            .toFixed(2)
                            .replace('.', ',')}
                        </strong>
                      </span>
                    ))}

                  </div>
                )}


                {/* PREÇO */}

                <strong className={styles.precoItemCarrinho}>
                  R$ {(item.precoFinal ??
                    Number(item.preco.replace(',', '.')))
                    .toFixed(2)
                    .replace('.', ',')}
                </strong>


                {/* QUANTIDADE */}

                <div className={styles.controleQuantidade}>

                  <button
                    type="button"
                    onClick={() => diminuirQuantidade(item.carrinhoId ?? item.id)}
                    aria-label="Diminuir quantidade"
                  >
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M6 12H18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>

                  <span>{item.quantidade}</span>

                  <button
                    type="button"
                    onClick={() => aumentarQuantidade(item.carrinhoId ?? item.id)}
                    aria-label="Aumentar quantidade"
                  >
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M12 6V18M6 12H18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>

                </div>

              </div>
              </div>
            ))
          )}
        </div>

        {carrinho.length > 0 && (
          <div className={styles.rodapeCarrinho}>
            <div className={styles.totalCarrinho}>
              <span>Total</span>

              <strong>
                R$ {totalCarrinho.toFixed(2).replace('.', ',')}
              </strong>
            </div>

            <button
              type="button"
              className={styles.finalizarPedido}
              onClick={() => navigate('/finalizar-pedido')}
            >
              Finalizar Pedido
            </button>

            <button
              type="button"
              className={styles.continuarComprando}
              onClick={fecharCarrinho}
            >
              Continuar comprando
            </button>
          </div>
        )}
      </aside>

      
    </div>
  );
}

export default Home;
