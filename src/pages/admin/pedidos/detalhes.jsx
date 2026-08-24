import { ArrowLeft, CheckCircle2, MapPin, Phone, RotateCcw, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import { usarPlaceholderProduto } from '../../../utils/productImage';
import styles from '../shared.module.css';

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function DetalhesPedido() {
  const { id } = useParams();
  const { pedidos, atualizarStatusPedido, confirmarPagamentoPedido, estornarPagamentoPedido } = useApp();
  const navigate = useNavigate();
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);
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
    : pedido.origem === 'Retirada no balcão'
      ? ['Recebido', 'Em preparo', 'Pronto', 'Retirado']
    : ['Recebido', 'Em preparo', 'Pronto', 'Entregue na mesa'];
  const indiceAtual = fluxo.indexOf(pedido.status);
  const subtotal = pedido.itens.reduce((total, item) => total + Number(item.preco) * item.quantidade, 0);

  const acao = (
    <button type="button" className={styles.botaoSecundario} onClick={() => navigate('/admin/pedidos')}>
      <ArrowLeft size={17} /> Voltar
    </button>
  );

  async function mudarStatus(status) {
    if (processando || status === pedido.status) return;
    if (status === 'Cancelado') {
      const complemento = pedido.pagamentoStatus === 'Pago'
        ? ' O pagamento confirmado será marcado como estornado e deixará de compor o faturamento.'
        : ' O pagamento pendente será marcado como cancelado.';
      if (!window.confirm(`Cancelar ${pedido.id}?${complemento}`)) return;
    }
    setErro('');
    setProcessando(true);
    try {
      await atualizarStatusPedido(pedido.id, status);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarPagamento() {
    if (processando || !window.confirm(`Confirmar o recebimento de ${moeda(pedido.total)} no pedido ${pedido.id}?`)) return;
    setErro('');
    setProcessando(true);
    try {
      await confirmarPagamentoPedido(pedido.id);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setProcessando(false);
    }
  }

  async function estornarPagamento() {
    if (processando || !window.confirm(`Registrar o estorno do pagamento do pedido ${pedido.id}?`)) return;
    setErro('');
    setProcessando(true);
    try {
      await estornarPagamentoPedido(pedido.id);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setProcessando(false);
    }
  }

  function dataHora(valor) {
    return valor
      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor))
      : '';
  }

  return (
    <AdminLayout titulo={`Detalhes do pedido ${pedido.id}`} subtitulo={`${pedido.origem} • recebido às ${pedido.horario}`} acao={acao}>
      <section className={styles.card}>
        <div className={styles.topoCard}>
          <div><h2>Acompanhamento</h2><p>Atualize o status conforme o andamento do pedido.</p></div>
          <select disabled={processando || ['Entregue', 'Entregue na mesa', 'Retirado', 'Cancelado'].includes(pedido.status)} className={styles.seletor} value={pedido.status} onChange={(event) => mudarStatus(event.target.value)} aria-label="Status do pedido">
            {fluxo.map((status) => <option key={status} value={status}>{status}</option>)}
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
        {erro && <div className={styles.erro} role="alert">{erro}</div>}
        <div className={styles.linhaStatus}>
          {fluxo.map((status, indice) => (
            <div key={status} className={`${styles.etapa} ${pedido.status !== 'Cancelado' && indice <= indiceAtual ? styles.etapaAtiva : ''}`}>{status}</div>
          ))}
        </div>
      </section>

      <div className={`${styles.detalheGrid} ${styles.secaoSeparada}`}>
        <div>
          <section className={styles.card}>
            <div className={styles.topoCard}><div><h2>Itens do pedido</h2><p>{pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'} registrados</p></div></div>
            {pedido.itens.map((item, indice) => (
              <div className={styles.itemPedido} key={`${item.id}-${indice}`}>
                <img src={item.imagem} alt={item.nome} loading="lazy" decoding="async" onError={usarPlaceholderProduto} />
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
              <div className={styles.linhaInfo}><span>Status do pagamento</span><strong>{pedido.pagamentoStatus}</strong></div>
              {pedido.pagamentoConfirmadoEm && <div className={styles.linhaInfo}><span>Confirmado em</span><strong>{dataHora(pedido.pagamentoConfirmadoEm)}</strong></div>}
              {pedido.pagamentoConfirmadoPor && <div className={styles.linhaInfo}><span>Confirmado por</span><strong>{pedido.pagamentoConfirmadoPor}</strong></div>}
              {pedido.pagamentoEstornadoEm && <div className={styles.linhaInfo}><span>Estornado em</span><strong>{dataHora(pedido.pagamentoEstornadoEm)}</strong></div>}
              {pedido.pagamentoEstornadoPor && <div className={styles.linhaInfo}><span>Estornado por</span><strong>{pedido.pagamentoEstornadoPor}</strong></div>}
              {pedido.pagamento === 'Dinheiro' && <div className={styles.linhaInfo}><span>Troco</span><strong>{pedido.semTroco === true ? 'Não precisa de troco' : pedido.trocoPara != null ? `Para R$ ${Number(pedido.trocoPara).toFixed(2).replace('.', ',')}` : 'Não informado'}</strong></div>}
              <div className={styles.linhaInfo}><span>Subtotal</span><strong>{moeda(subtotal)}</strong></div>
              <div className={styles.linhaInfo}><span>{pedido.origem === 'Retirada no balcão' ? 'Taxa de retirada' : 'Taxa de entrega'}</span><strong>{moeda(pedido.taxaEntrega ?? 0)}</strong></div>
            </div>
            {!['Pago', 'Cancelado', 'Estornado'].includes(pedido.pagamentoStatus) && pedido.status !== 'Cancelado' && (
              <button disabled={processando} type="button" className={`${styles.botaoPrimario} ${styles.botaoPagamento}`} onClick={confirmarPagamento}><CheckCircle2 size={17} /> Confirmar pagamento</button>
            )}
            {pedido.pagamentoStatus === 'Pago' && (
              <button disabled={processando} type="button" className={`${styles.botaoPerigo} ${styles.botaoPagamento}`} onClick={estornarPagamento}><RotateCcw size={17} /> Registrar estorno</button>
            )}
          </section>
        </aside>
      </div>
    </AdminLayout>
  );
}

export default DetalhesPedido;
