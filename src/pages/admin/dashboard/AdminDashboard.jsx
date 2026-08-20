import {
  Bike,
  ChefHat,
  DollarSign,
  Eye,
  ShoppingBag,
  Store
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import styles from '../shared.module.css';

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function classeStatus(status) {
  if (status === 'Recebido') return styles.statusRecebido;
  if (['Em preparo', 'Pronto'].includes(status)) return styles.statusPreparo;
  if (status === 'Saiu para entrega') return styles.statusEntrega;
  if (['Entregue', 'Entregue na mesa'].includes(status)) return styles.statusConcluido;
  if (status === 'Cancelado') return styles.statusCancelado;
  return '';
}

function AdminDashboard() {
  const { pedidos, produtos } = useApp();
  const navigate = useNavigate();

  const pedidosValidos = pedidos.filter((pedido) => pedido.status !== 'Cancelado');
  const faturamento = pedidosValidos.reduce((total, pedido) => total + pedido.total, 0);
  const emPreparo = pedidos.filter((pedido) => pedido.status === 'Em preparo').length;
  const pedidosSalao = pedidos.filter((pedido) => pedido.origem.startsWith('Mesa')).length;
  const pedidosDelivery = pedidos.filter((pedido) => pedido.origem === 'Delivery').length;

  const vendasPorProduto = pedidosValidos
    .flatMap((pedido) => pedido.itens)
    .reduce((resultado, item) => {
      const atual = resultado[item.nome] ?? { nome: item.nome, quantidade: 0, total: 0 };
      atual.quantidade += item.quantidade;
      atual.total += Number(item.preco) * item.quantidade;
      resultado[item.nome] = atual;
      return resultado;
    }, {});

  const ranking = Object.values(vendasPorProduto)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  return (
    <AdminLayout titulo="Dashboard ADM" subtitulo="Bem-vindo(a) de volta! Veja o que está acontecendo hoje.">
      <section className={styles.gradeMetricas}>
        <div className={styles.metrica}><div className={styles.metricaIcone}><ShoppingBag size={23} /></div><div><span>Pedidos hoje</span><strong>{pedidos.length}</strong><small>Pedidos registrados</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><DollarSign size={24} /></div><div><span>Faturamento</span><strong>{moeda(faturamento)}</strong><small>Sem pedidos cancelados</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><ChefHat size={23} /></div><div><span>Em preparo</span><strong>{emPreparo}</strong><small>Aguardando finalização</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><Store size={23} /></div><div><span>Pedidos do salão</span><strong>{pedidosSalao}</strong><small>Atendimento nas mesas</small></div></div>
      </section>

      <section className={styles.card}>
        <div className={styles.topoCard}><div><h2>Visão geral de hoje</h2><p>Resumo operacional da lanchonete</p></div></div>
        <div className={styles.gradeMetricas}>
          <div className={styles.metrica}><div className={styles.metricaIcone}><Bike size={22} /></div><div><span>Delivery</span><strong>{pedidosDelivery}</strong><small>Pedidos para entrega</small></div></div>
          <div className={styles.metrica}><div className={styles.metricaIcone}><Store size={22} /></div><div><span>Salão</span><strong>{pedidosSalao}</strong><small>Pedidos presenciais</small></div></div>
          <div className={styles.metrica}><div className={styles.metricaIcone}><ShoppingBag size={22} /></div><div><span>Produtos ativos</span><strong>{produtos.filter((produto) => produto.ativo).length}</strong><small>Disponíveis no cardápio</small></div></div>
          <div className={styles.metrica}><div className={styles.metricaIcone}><ChefHat size={22} /></div><div><span>Cancelados</span><strong>{pedidos.length - pedidosValidos.length}</strong><small>Requerem acompanhamento</small></div></div>
        </div>
      </section>

      <div className={styles.gradeDuasColunas}>
        <section className={styles.card}>
          <div className={styles.topoCard}>
            <div><h2>Pedidos recentes</h2><p>Últimas entradas no sistema</p></div>
            <button type="button" className={styles.botaoSecundario} onClick={() => navigate('/admin/pedidos')}>Ver todos</button>
          </div>
          <div className={styles.tabelaContainer}>
            <table className={styles.tabela}>
              <thead><tr><th>Pedido</th><th>Origem</th><th>Status</th><th>Total</th><th>Ação</th></tr></thead>
              <tbody>
                {pedidos.slice(0, 5).map((pedido) => (
                  <tr key={pedido.id}>
                    <td><strong>{pedido.id}</strong><span className={styles.textoSecundario}>{pedido.cliente}</span></td>
                    <td>{pedido.origem}</td>
                    <td><span className={`${styles.status} ${classeStatus(pedido.status)}`}>{pedido.status}</span></td>
                    <td><strong>{moeda(pedido.total)}</strong></td>
                    <td><button type="button" className={styles.botaoIcone} aria-label={`Ver ${pedido.id}`} onClick={() => navigate(`/admin/pedidos/${pedido.id.replace('#', '')}`)}><Eye size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.topoCard}><div><h2>Produtos mais vendidos</h2><p>Ranking por quantidade</p></div></div>
          <div className={styles.ranking}>
            {ranking.map((item, indice) => (
              <div className={styles.rankingItem} key={item.nome}>
                <span>{indice + 1}</span>
                <div><strong>{item.nome}</strong><small>{item.quantidade} vendas</small></div>
                <b>{moeda(item.total)}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
