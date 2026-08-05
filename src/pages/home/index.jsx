import { useEffect, useState } from 'react';

import banner from '../../assets/banner.png';
import styles from './index.module.css';

function Home() {
  const [rolouPagina, setRolouPagina] = useState(false);

  useEffect(() => {
    function verificarScroll() {
      setRolouPagina(window.scrollY > 50);
    }

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
        <h1>Minha Hamburgueria</h1>
      </header>

      <section
        className={styles.banner}
        style={{ backgroundImage: `url(${banner})` }}
      >
        <div className={styles.conteudoBanner}>
          <h1>O verdadeiro hambúrguer artesanal</h1>
        </div>
      </section>

      <section className={styles.cardapio}>
        <h2>Nosso cardápio</h2>
      </section>
    </div>
  );
}

export default Home;