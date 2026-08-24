import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import WaiterLayout from '../../components/WaiterLayout';
import { useApp } from '../../context/appContext';
import styles from './garcom.module.css';

function MesasGarcom() {
  const { mesas, comandas, abrirComanda, garcomSessao } = useApp();
  const navigate = useNavigate();

  async function acessar(mesa) {
    const comanda = comandas.find((item) => item.mesaId === mesa.id && item.status !== 'Encerrada');
    if (mesa.status === 'Ocupada' && !comanda) return;
    try {
      await abrirComanda(mesa.id);
      navigate(`/garcom/comanda/${mesa.id}`);
    } catch {
      // A atualização automática manterá a mesa ocupada e impedirá um segundo atendimento.
    }
  }

  return (
    <WaiterLayout titulo="Mesas do salão" subtitulo="Selecione uma mesa livre para abrir a comanda ou continue seu atendimento.">
      <section className={styles.gradeMesas}>
        {mesas.map((mesa) => {
          const comanda = comandas.find((item) => item.mesaId === mesa.id && item.status !== 'Encerrada');
          const ocupada = mesa.status === 'Ocupada';
          const minha = Boolean(comanda && comanda.funcionarioId === garcomSessao.id);
          const disponivel = !ocupada || minha;
          return (
            <article className={styles.mesa} key={mesa.id}>
              <div className={styles.mesaTopo}><span className={styles.numeroMesa}>{mesa.numero}</span><span className={`${styles.status} ${ocupada ? styles.ocupada : styles.livre}`}>{ocupada ? 'Ocupada' : 'Livre'}</span></div>
              <h2>Mesa {mesa.numero}</h2>
              <div className={styles.mesaInfo}>
                {minha ? <><span>Seu atendimento</span><span>{comanda.status}</span></> : ocupada ? <span>Comanda aberta por outro funcionário.</span> : <span>Pronta para receber clientes.</span>}
              </div>
              <button type="button" className={!ocupada ? styles.botaoPrincipal : styles.botaoSecundario} disabled={!disponivel} onClick={() => acessar(mesa)}>{!ocupada ? 'Abrir comanda' : 'Continuar atendimento'} {disponivel && <ArrowRight size={16} />}</button>
            </article>
          );
        })}
      </section>
      {mesas.length === 0 && <div className={`${styles.painel} ${styles.vazio}`} role="status">Nenhuma mesa foi cadastrada para atendimento.</div>}
    </WaiterLayout>
  );
}

export default MesasGarcom;
