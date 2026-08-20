import { Eye, ReceiptText, Store, Users } from 'lucide-react';
import { useState } from 'react';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import styles from '../shared.module.css';

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function MesasAdmin() {
  const { mesas, comandas } = useApp();
  const [selecionada, setSelecionada] = useState(null);
  const comandasAbertas = comandas.filter((comanda) => comanda.status !== 'Encerrada');
  const ocupadas = new Set(comandasAbertas.map((comanda) => comanda.mesaId)).size;
  const comandaSelecionada = selecionada ? comandasAbertas.find((comanda) => comanda.mesaId === selecionada.id) : null;

  return (
    <AdminLayout titulo="Mesas / Comandas" subtitulo="Acompanhe ocupação, responsáveis e consumo do salão.">
      <section className={styles.gradeMetricas}>
        <div className={styles.metrica}><div className={styles.metricaIcone}><Store size={23} /></div><div><span>Total de mesas</span><strong>{mesas.length}</strong><small>Mesas cadastradas</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><Users size={23} /></div><div><span>Ocupadas</span><strong>{ocupadas}</strong><small>Em atendimento</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><Store size={23} /></div><div><span>Livres</span><strong>{mesas.length - ocupadas}</strong><small>Disponíveis agora</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><ReceiptText size={23} /></div><div><span>Comandas abertas</span><strong>{comandasAbertas.length}</strong><small>Consumo em andamento</small></div></div>
      </section>

      <section className={styles.gradeMesas}>
        {mesas.map((mesa) => {
          const comanda = comandasAbertas.find((item) => item.mesaId === mesa.id);
          const ocupada = Boolean(comanda);
          const total = comanda?.itens.reduce((soma, item) => soma + Number(item.preco) * item.quantidade, 0) ?? 0;
          return (
            <article className={styles.mesaCard} key={mesa.id}>
              <div className={styles.mesaTopo}>
                <div className={styles.mesaNumero}>{mesa.numero}</div>
                <span className={`${styles.status} ${ocupada ? styles.statusOcupada : styles.statusLivre}`}>{ocupada ? 'Ocupada' : 'Livre'}</span>
              </div>
              <h3>Mesa {mesa.numero}</h3>
              <p>{mesa.lugares} lugares</p>
              <div className={styles.mesaDetalhes}>
                {comanda ? <><span>Garçom: {comanda.garcom}</span><span>Status: {comanda.status}</span><strong>Total: {moeda(total)}</strong><button type="button" className={styles.botaoSecundario} onClick={() => setSelecionada(mesa)}><Eye size={16} /> Ver comanda</button></> : <span>Nenhuma comanda aberta.</span>}
              </div>
            </article>
          );
        })}
      </section>

      {selecionada && comandaSelecionada && (
        <section className={styles.card}>
          <div className={styles.topoCard}><div><h2>Comanda da mesa {selecionada.numero}</h2><p>Atendida por {comandaSelecionada.garcom}</p></div><button type="button" className={styles.botaoSecundario} onClick={() => setSelecionada(null)}>Fechar detalhes</button></div>
          {comandaSelecionada.itens.map((item, indice) => <div className={styles.itemPedido} key={`${item.id}-${indice}`}><img src={item.imagem} alt="" /><div><h4>{item.quantidade}x {item.nome}</h4><p>{item.observacao || 'Sem observações'}</p></div><strong>{moeda(Number(item.preco) * item.quantidade)}</strong></div>)}
        </section>
      )}
    </AdminLayout>
  );
}

export default MesasAdmin;
