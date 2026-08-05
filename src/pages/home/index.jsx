import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import banner from '../../assets/banner.png';
import xBacon from '../../assets/xbacon.png';
import styles from './index.module.css';

function Home() {
  const [rolouPagina, setRolouPagina] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');

  const categorias = [
    'Todos',
    'Hambúrgueres',
    'Combos',
    'Porções',
    'Bebidas'
  ];

  const produtos = [
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

  const produtosFiltrados =
    categoriaAtiva === 'Todos'
      ? produtos
      : produtos.filter(
          (produto) => produto.categoria === categoriaAtiva
        );

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
            <Link to="/" className={styles.linkAtivo}>
              Início
            </Link>

            <Link to="/cardapio">Cardápio</Link>
            <Link to="/promocoes">Promoções</Link>
            <Link to="/sobre">Sobre</Link>
            <Link to="/contato">Contato</Link>
          </nav>

          <Link to="/carrinho" className={styles.botaoCarrinho}>
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

              <circle
                cx="10"
                cy="20"
                r="1"
                fill="currentColor"
              />

              <circle
                cx="18"
                cy="20"
                r="1"
                fill="currentColor"
              />
            </svg>

            Ver Carrinho
          </Link>
        </div>
      </header>

      <section
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
            <Link to="/cardapio" className={styles.botaoPrincipal}>
              Peça agora
            </Link>

            <Link to="/cardapio" className={styles.botaoSecundario}>
              Ver Cardápio
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.cardapio}>

        <h2>Nosso cardápio</h2>

        <p>Escolha o seu hambúrguer favorito.</p>

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
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;