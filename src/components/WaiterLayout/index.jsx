import { LogOut, ReceiptText, Store, UtensilsCrossed } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useApp } from '../../context/appContext';
import styles from './index.module.css';

function WaiterLayout({ titulo, subtitulo, children }) {
  const { garcomSessao, sairGarcom } = useApp();
  const navigate = useNavigate();

  function sair() {
    sairGarcom();
    navigate('/garcom/acesso');
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.header}>
        <button type="button" className={styles.logo} onClick={() => navigate('/garcom/mesas')}>
          <span><UtensilsCrossed size={22} /></span>
          <div><strong>Logo</strong><small>GARÇOM</small></div>
        </button>
        <nav>
          <NavLink to="/garcom/mesas"><Store size={17} /> Mesas</NavLink>
          <span><ReceiptText size={17} /> Comandas</span>
        </nav>
        <div className={styles.perfil}>
          <span>{garcomSessao?.nome?.charAt(0)}</span>
          <div><strong>{garcomSessao?.nome}</strong><small>{garcomSessao?.cargo}</small></div>
          <button type="button" aria-label="Sair" onClick={sair}><LogOut size={19} /></button>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.titulo}><h1>{titulo}</h1><p>{subtitulo}</p></div>
        {children}
      </main>
    </div>
  );
}

export default WaiterLayout;
