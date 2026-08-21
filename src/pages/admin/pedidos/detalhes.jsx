import { ArrowLeft, MapPin, Phone, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import styles from '../shared.module.css';

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function DetalhesPedido() {
  const { id } = useParams();
  const { pedidos, atualizarStatusPedido } = useApp();
  const navigate = useNavigate();
  const [erro, setErro] = useState('');
  const pedido = pedidos.find((item) => item.id.replace('#', '') === id);

  if (!pedido) {
    return (
      <AdminLayout titulo="Pedido não encontrado" subtitulo="O pedido solicitado não existe ou foi removido.">
        <button type="button" className={styles.botaoSecundario} onClick={() => navigate('/admin/pedidos')}><ArrowLeft size={17} /> Voltar aos pedidos</button>
      </AdminLayout>
    );
  }

  const fluxo = pedido.origem === 'Delivery'
    ? ['Recebido', 'Em preparo', 'Saiu para entrega', 'Entregue']
    : ['Recebido', 'Em preparo', 'Pronto', 'Entregue na mesa'];
  const indiceAtual = fluxo.indexOf(pedido.status);
  const subtotal = pedido.itens.reduce((total, item) => total + Number(item.preco) * item.quantidade, 0);

  const acao = (
    <button type="button" className={styles.botaoSecundario} onClick={() => navigate('/admin/pedidos')}>
      <ArrowLeft size={17} /> Voltar
    </button>
  );

  async function mudarStatus(status) {
    setErro('');
    try {
      await atualizarStatusPedido(pedido.id, status);
    } catch (falha) {
      setErro(falha.message);
    }
  }

  return (
    <AdminLayout titulo={`Detalhes do pedido ${pedido.id}`} subtitulo={`${pedido.origem} • recebido às ${pedido.horario}`} acao={acao}>
      <section className={styles.card}>
        <div className={styles.topoCard}>
          <div><h2>Acompanhamento</h2><p>Atualize o status conforme o andamento do pedido.</p></div>
          <select className={styles.seletor} value={pedido.status} onChange={(event) => mudarStatus(event.target.value)} aria-label="Status do pedido">
            {fluxo.map((status) => <option key={status} value={status}>{status}</option>)}
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
        {erro && <div className={styles.erro}>{erro}</div>}
        <div className={styles.linhaStatus}>
          {fluxo.map((status, indice) => (
            <div key={status} className={`${styles.etapa} ${pedido.status !== 'Cancelado' && indice <= indiceAtual ? styles.etapaAtiva : ''}`}>{status}</div>
          ))}
        </div>
      </section>

      <div className={styles.detalheGrid}>
        <div>
          <section className={styles.card}>
            <div className={styles.topoCard}><div><h2>Itens do pedido</h2><p>{pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'} registrados</p></div></div>
            {pedido.itens.map((item, indice) => (
              <div className={styles.itemPedido} key={`${item.id}-${indice}`}>
                <img src={item.imagem} alt={item.nome} />
                <div>
                  <h4>{item.quantidade}x {item.nome}</h4>
                  {item.adicionais?.length > 0 && <p>Adicionais: {item.adicionais.map((adicional) => adicional.nome ?? adicional).join(', ')}</p>}
                  {item.observacao && <p>Observação: {item.observacao}</p>}
                </div>
                <strong>{moeda(Number(item.preco) * item.quantidade)}</strong>
              </div>
            ))}
            <div className={styles.totalGrande}><span>Total do pedido</span><strong>{moeda(pedido.total)}</strong></div>
          </section>

          {pedido.observacao && (
            <section className={styles.card}>
              <div className={styles.topoCard}><div><h2>Observações</h2><p>Informações enviadas com o pedido</p></div></div>
              <div className={styles.aviso}>{pedido.observacao}</div>
            </section>
          )}
        </div>

        <aside>
          <section className={styles.card}>
            <div className={styles.topoCard}><div><h2>Cliente e entrega</h2><p>Dados para atendimento</p></div></div>
            <div className={styles.listaInfo}>
              <div className={styles.linhaInfo}><span><UserRound size={14} /> Cliente</span><strong>{pedido.cliente}</strong></div>
              <div className={styles.linhaInfo}><span><Phone size={14} /> Telefone</span><strong>{pedido.telefone}</strong></div>
              <div className={styles.linhaInfo}><span><MapPin size={14} /> Origem</span><strong>{pedido.origem}</strong></div>
              {pedido.endereco && <div className={styles.linhaInfo}><span>Endereço</span><strong>{pedido.endereco}</strong></div>}
              {pedido.garcom && <div className={styles.linhaInfo}><span>Garçom</span><strong>{pedido.garcom}</strong></div>}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.topoCard}><div><h2>Pagamento</h2><p>Resumo financeiro</p></div></div>
            <div className={styles.listaInfo}>
              <div className={styles.linhaInfo}><span>Forma de pagamento</span><strong>{pedido.pagamento}</strong></div>
              <div className={styles.linhaInfo}><span>Subtotal</span><strong>{moeda(subtotal)}</strong></div>
              <div className={styles.linhaInfo}><span>Taxa de entrega</span><strong>{moeda(pedido.taxaEntrega ?? 0)}</strong></div>
            </div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  );
}

export default DetalhesPedido;
