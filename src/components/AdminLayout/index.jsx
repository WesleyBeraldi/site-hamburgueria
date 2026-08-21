import { useState } from 'react';
import {
  BadgePercent,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ListPlus,
  Menu,
  Package,
  Settings,
  Users,
  UtensilsCrossed,
  X
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useApp } from '../../context/appContext';
import styles from './index.module.css';

const itensMenu = [
  { nome: 'Dashboard', rota: '/admin/dashboard', icone: LayoutDashboard },
  { nome: 'Pedidos', rota: '/admin/pedidos', icone: ClipboardList },
  { nome: 'Cardápio', rota: '/admin/cardapio', icone: Package },
  { nome: 'Adicionais', rota: '/admin/adicionais', icone: ListPlus },
  { nome: 'Promoções', rota: '/admin/promocoes', icone: BadgePercent },
  { nome: 'Mesas / Comandas', rota: '/admin/mesas', icone: UtensilsCrossed },
  { nome: 'Funcionários', rota: '/admin/funcionarios', icone: Users },
  { nome: 'Relatórios', rota: '/admin/relatorios', icone: BarChart3 },
  { nome: 'Configurações', rota: '/admin/configuracoes', icone: Settings }
];

function AdminLayout({ titulo, subtitulo, acao, children }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { adminSessao, sairAdmin } = useApp();
  const navigate = useNavigate();

  function sair() {
    sairAdmin();
    navigate('/admin/login');
  }

  return (
    <div className={styles.pagina}>
      <button
        type="button"
        className={styles.botaoMenu}
        aria-label="Abrir menu"
        onClick={() => setMenuAberto(true)}
      >
        <Menu size={22} />
      </button>

      {menuAberto && (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${menuAberto ? styles.sidebarAberta : ''}`}>
        <div className={styles.logoArea}>
          <div className={styles.marcaIcone}><UtensilsCrossed size={24} /></div>
          <div>
            <strong>Logo</strong>
            <span>ADMIN</span>
          </div>
          <button type="button" className={styles.fecharMenu} onClick={() => setMenuAberto(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className={styles.navegacao}>
          {itensMenu.map((item) => {
            const Icone = item.icone;
            return (
              <NavLink
                key={item.rota}
                to={item.rota}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) => `${styles.linkMenu} ${isActive ? styles.linkAtivo : ''}`}
              >
                <Icone size={20} />
                <span>{item.nome}</span>
              </NavLink>
            );
          })}
        </nav>

        <button type="button" className={styles.sair} onClick={sair}>
          <LogOut size={20} />
          Sair
        </button>
      </aside>

      <main className={styles.principal}>
        <header className={styles.cabecalho}>
          <div>
            <h1>{titulo}</h1>
            <p>{subtitulo}</p>
          </div>

          <div className={styles.cabecalhoDireita}>
            {acao}
            <div className={styles.perfil}>
              <span>{adminSessao?.nome?.charAt(0) ?? 'A'}</span>
              <div>
                <strong>{adminSessao?.nome ?? 'Admin'}</strong>
                <small>{adminSessao?.perfil ?? 'Administrador'}</small>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.conteudo}>{children}</div>
      </main>
    </div>
  );
}

export default AdminLayout;
