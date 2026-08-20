import { Bike, DollarSign, ReceiptText, Store } from 'lucide-react';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import styles from '../shared.module.css';

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function RelatoriosAdmin() {
  const { pedidos, funcionarios } = useApp();
  const validos = pedidos.filter((pedido) => pedido.status !== 'Cancelado');
  const faturamento = validos.reduce((total, pedido) => total + pedido.total, 0);
  const ticketMedio = validos.length ? faturamento / validos.length : 0;
  const delivery = validos.filter((pedido) => pedido.origem === 'Delivery');
  const salao = validos.filter((pedido) => pedido.origem.startsWith('Mesa'));
  const valoresGrafico = [38, 54, 48, 75, 92, 83, 68];
  const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const ranking = validos.flatMap((pedido) => pedido.itens).reduce((resultado, item) => {
    resultado[item.nome] = (resultado[item.nome] ?? 0) + item.quantidade;
    return resultado;
  }, {});

  return (
    <AdminLayout titulo="Relatórios" subtitulo="Indicadores de vendas, canais e desempenho da equipe.">
      <section className={styles.gradeMetricas}>
        <div className={styles.metrica}><div className={styles.metricaIcone}><DollarSign size={23} /></div><div><span>Faturamento</span><strong>{moeda(faturamento)}</strong><small>Pedidos concluídos e em andamento</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><ReceiptText size={23} /></div><div><span>Ticket médio</span><strong>{moeda(ticketMedio)}</strong><small>Valor médio por pedido</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><Bike size={23} /></div><div><span>Delivery</span><strong>{delivery.length}</strong><small>{moeda(delivery.reduce((soma, pedido) => soma + pedido.total, 0))}</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><Store size={23} /></div><div><span>Salão</span><strong>{salao.length}</strong><small>{moeda(salao.reduce((soma, pedido) => soma + pedido.total, 0))}</small></div></div>
      </section>

      <div className={styles.gradeDuasColunas}>
        <section className={styles.card}>
          <div className={styles.topoCard}><div><h2>Vendas da semana</h2><p>Visual demonstrativo para futura integração com o banco.</p></div></div>
          <div className={styles.grafico}>{valoresGrafico.map((valor, indice) => <div className={styles.barraGrupo} key={dias[indice]}><div className={styles.barra} style={{ height: `${valor}%` }} /><span>{dias[indice]}</span></div>)}</div>
        </section>
        <section className={styles.card}>
          <div className={styles.topoCard}><div><h2>Mais vendidos</h2><p>Produtos por volume</p></div></div>
          <div className={styles.ranking}>{Object.entries(ranking).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, quantidade], indice) => <div className={styles.rankingItem} key={nome}><span>{indice + 1}</span><div><strong>{nome}</strong><small>Quantidade vendida</small></div><b>{quantidade}</b></div>)}</div>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.topoCard}><div><h2>Desempenho dos garçons</h2><p>Comandas e vendas atribuídas a cada funcionário.</p></div></div>
        <div className={styles.tabelaContainer}><table className={styles.tabela}><thead><tr><th>Funcionário</th><th>Cargo</th><th>Comandas fechadas</th><th>Vendas</th><th>Status</th></tr></thead><tbody>{funcionarios.map((funcionario) => <tr key={funcionario.id}><td><strong>{funcionario.nome}</strong></td><td>{funcionario.cargo}</td><td>{funcionario.comandas}</td><td>{funcionario.vendas}</td><td><span className={`${styles.status} ${funcionario.status === 'Ativo' ? styles.statusAtivo : styles.statusInativo}`}>{funcionario.status}</span></td></tr>)}</tbody></table></div>
      </section>
    </AdminLayout>
  );
}

export default RelatoriosAdmin;
