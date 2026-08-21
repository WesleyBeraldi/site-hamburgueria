import { ArrowRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import WaiterLayout from '../../components/WaiterLayout';
import { useApp } from '../../context/appContext';
import styles from './garcom.module.css';

function MesasGarcom() {
  const { mesas, comandas, abrirComanda, garcomSessao } = useApp();
  const navigate = useNavigate();

  async function acessar(mesa) {
    const comanda = comandas.find((item) => item.mesaId === mesa.id && item.status !== 'Encerrada');
    if (comanda && comanda.funcionarioId !== garcomSessao.id) return;
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
          const minha = !comanda || comanda.funcionarioId === garcomSessao.id;
          const ocupada = Boolean(comanda);
          return (
            <article className={styles.mesa} key={mesa.id}>
              <div className={styles.mesaTopo}><span className={styles.numeroMesa}>{mesa.numero}</span><span className={`${styles.status} ${ocupada ? styles.ocupada : styles.livre}`}>{ocupada ? 'Ocupada' : 'Livre'}</span></div>
              <h2>Mesa {mesa.numero}</h2>
              <p><Users size={13} /> {mesa.lugares} lugares</p>
              <div className={styles.mesaInfo}>
                {comanda ? <><span>Garçom: {comanda.garcom}</span><span>{comanda.status}</span></> : <span>Pronta para receber clientes.</span>}
              </div>
              <button type="button" className={!ocupada ? styles.botaoPrincipal : styles.botaoSecundario} disabled={!minha} onClick={() => acessar(mesa)}>{!ocupada ? 'Abrir comanda' : minha ? 'Continuar atendimento' : 'Em atendimento'} {minha && <ArrowRight size={16} />}</button>
            </article>
          );
        })}
      </section>
    </WaiterLayout>
  );
}

export default MesasGarcom;
