import { Eye, Minus, Plus, ReceiptText, Store, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import { usarPlaceholderProduto } from '../../../utils/productImage';
import styles from '../shared.module.css';

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function MesasAdmin() {
  const {
    mesas,
    comandas,
    produtos,
    configuracao,
    criarMesaAdmin,
    adicionarItemComandaAdmin,
    atualizarItemComandaAdmin,
    removerItemComandaAdmin,
    finalizarComandaAdmin
  } = useApp();
  const [selecionada, setSelecionada] = useState(null);
  const [formularioMesaAberto, setFormularioMesaAberto] = useState(false);
  const [numeroMesa, setNumeroMesa] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [pagamento, setPagamento] = useState('Cartão');
  const [processando, setProcessando] = useState('');
  const [erro, setErro] = useState('');

  const comandasAbertas = comandas.filter((comanda) => comanda.status !== 'Encerrada');
  const ocupadas = new Set(comandasAbertas.map((comanda) => comanda.mesaId)).size;
  const comandaSelecionada = selecionada
    ? comandasAbertas.find((comanda) => comanda.mesaId === selecionada.id)
    : null;
  const produtosAtivos = produtos.filter((produto) => produto.ativo);
  const totalSelecionado = comandaSelecionada?.itens.reduce(
    (soma, item) => soma + Number(item.preco) * item.quantidade,
    0
  ) ?? 0;
  const formasPagamento = [
    configuracao.pixChave && configuracao.pixBeneficiario && configuracao.pixCidade ? 'Pix' : null,
    configuracao.aceitaCartao !== false ? 'Cartão' : null,
    configuracao.aceitaDinheiro !== false ? 'Dinheiro' : null
  ].filter(Boolean);
  const pagamentoSelecionado = formasPagamento.includes(pagamento)
    ? pagamento
    : (formasPagamento[0] ?? '');

  function abrirFormularioMesa() {
    const maiorNumero = Math.max(0, ...mesas.map((mesa) => Number(mesa.numero) || 0));
    setNumeroMesa(String(maiorNumero + 1).padStart(2, '0'));
    setFormularioMesaAberto(true);
    setErro('');
  }

  async function executar(chave, operacao) {
    if (processando) return false;
    setProcessando(chave);
    setErro('');
    try {
      await operacao();
      return true;
    } catch (falha) {
      setErro(falha.message);
      return false;
    } finally {
      setProcessando('');
    }
  }

  async function cadastrarMesa(event) {
    event.preventDefault();
    const concluiu = await executar('mesa', () => criarMesaAdmin(numeroMesa));
    if (concluiu) {
      setFormularioMesaAberto(false);
      setNumeroMesa('');
    }
  }

  async function adicionarProduto() {
    if (!comandaSelecionada || !produtoId) return;
    const concluiu = await executar(
      'adicionar',
      () => adicionarItemComandaAdmin(comandaSelecionada.id, Number(produtoId))
    );
    if (concluiu) setProdutoId('');
  }

  async function ajustarQuantidade(item, quantidade) {
    if (!comandaSelecionada || quantidade < 1) return;
    await executar(
      `item-${item.linhaId}`,
      () => atualizarItemComandaAdmin(comandaSelecionada.id, item.linhaId, quantidade)
    );
  }

  async function removerItem(item) {
    if (!comandaSelecionada) return;
    await executar(
      `item-${item.linhaId}`,
      () => removerItemComandaAdmin(comandaSelecionada.id, item.linhaId)
    );
  }

  async function finalizar() {
    if (!comandaSelecionada || !pagamentoSelecionado) return;
    if (!window.confirm(`Finalizar a comanda da mesa ${selecionada.numero} em ${pagamentoSelecionado}?`)) return;
    const concluiu = await executar(
      'finalizar',
      () => finalizarComandaAdmin(comandaSelecionada.id, pagamentoSelecionado)
    );
    if (concluiu) setSelecionada(null);
  }

  const acao = (
    <button type="button" className={styles.botaoPrimario} onClick={abrirFormularioMesa}>
      <Plus size={17} /> Adicionar comanda
    </button>
  );

  return (
    <AdminLayout titulo="Mesas / Comandas" subtitulo="Acompanhe ocupação, responsáveis e consumo do salão." acao={acao}>
      {formularioMesaAberto && (
        <section className={`${styles.card} ${styles.secaoComMargemInferior}`}>
          <div className={styles.topoCard}>
            <div><h2>Adicionar comanda</h2><p>Crie um novo cartão usando o número da mesa.</p></div>
          </div>
          <form className={styles.formularioMesa} onSubmit={cadastrarMesa}>
            <div className={styles.campo}>
              <label htmlFor="numero-mesa">Número da mesa</label>
              <input id="numero-mesa" inputMode="numeric" maxLength={3} pattern="[0-9]{1,3}" required value={numeroMesa} onChange={(event) => setNumeroMesa(event.target.value.replace(/\D/g, '').slice(0, 3))} />
            </div>
            <div className={styles.acoesFormularioMesa}>
              <button type="button" className={styles.botaoSecundario} onClick={() => setFormularioMesaAberto(false)}>Cancelar</button>
              <button type="submit" className={styles.botaoPrimario} disabled={processando === 'mesa'}>{processando === 'mesa' ? 'Adicionando…' : 'Adicionar'}</button>
            </div>
          </form>
        </section>
      )}

      <section className={styles.gradeMetricas}>
        <div className={styles.metrica}><div className={styles.metricaIcone}><Store size={23} /></div><div><span>Total de mesas</span><strong>{mesas.length}</strong><small>Mesas cadastradas</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><Users size={23} /></div><div><span>Ocupadas</span><strong>{ocupadas}</strong><small>Em atendimento</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><Store size={23} /></div><div><span>Livres</span><strong>{mesas.length - ocupadas}</strong><small>Disponíveis agora</small></div></div>
        <div className={styles.metrica}><div className={styles.metricaIcone}><ReceiptText size={23} /></div><div><span>Comandas abertas</span><strong>{comandasAbertas.length}</strong><small>Consumo em andamento</small></div></div>
      </section>

      <section className={`${styles.gradeMesas} ${styles.secaoSeparada}`}>
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
              <div className={styles.mesaDetalhes}>
                {comanda ? (
                  <>
                    <span>Garçom: {comanda.garcom}</span>
                    <span>Status: {comanda.status}</span>
                    <strong>Total: {moeda(total)}</strong>
                    <button type="button" className={styles.botaoSecundario} onClick={() => { setSelecionada(mesa); setErro(''); }}><Eye size={16} /> Gerenciar comanda</button>
                  </>
                ) : <span>Nenhuma comanda aberta.</span>}
              </div>
            </article>
          );
        })}
      </section>

      {erro && <div className={`${styles.erro} ${styles.secaoSeparada}`} role="alert">{erro}</div>}
      {mesas.length === 0 && <section className={`${styles.card} ${styles.secaoSeparada}`}><div className={styles.vazio}><Store size={34} /><h3>Nenhuma mesa cadastrada</h3><p>Adicione uma comanda para preparar um novo atendimento.</p></div></section>}
      {selecionada && !comandaSelecionada && (
        <section className={`${styles.card} ${styles.secaoSeparada}`}>
          <div className={styles.vazio}><ReceiptText size={34} /><h3>A comanda foi encerrada</h3><p>A mesa está livre para um novo atendimento.</p></div>
          <button type="button" className={styles.botaoSecundario} onClick={() => setSelecionada(null)}>Fechar detalhes</button>
        </section>
      )}

      {selecionada && comandaSelecionada && (
        <section className={`${styles.card} ${styles.secaoSeparada}`}>
          <div className={styles.topoCard}>
            <div><h2>Comanda da mesa {selecionada.numero}</h2><p>Atendida por {comandaSelecionada.garcom} • {comandaSelecionada.status}</p></div>
            <button type="button" className={styles.botaoSecundario} onClick={() => setSelecionada(null)}>Fechar detalhes</button>
          </div>

          <div className={styles.adicionarProdutoComanda}>
            <label className={styles.campo}>
              <span>Adicionar produto</span>
              <select value={produtoId} onChange={(event) => setProdutoId(event.target.value)}>
                <option value="">Selecione no cardápio</option>
                {produtosAtivos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} — {moeda(Number(String(produto.preco).replace(',', '.')))}</option>)}
              </select>
            </label>
            <button type="button" className={styles.botaoPrimario} disabled={!produtoId || Boolean(processando)} onClick={adicionarProduto}><Plus size={17} /> {processando === 'adicionar' ? 'Adicionando…' : 'Adicionar item'}</button>
          </div>

          {comandaSelecionada.itens.length === 0 && <div className={styles.vazio}><p>Esta comanda ainda não possui itens.</p></div>}
          {comandaSelecionada.itens.map((item) => (
            <div className={styles.itemPedido} key={item.linhaId}>
              <img src={item.imagem} alt={item.nome} loading="lazy" decoding="async" onError={usarPlaceholderProduto} />
              <div>
                <h4>{item.nome}</h4>
                {item.adicionais?.length > 0 && <p>Adicionais: {item.adicionais.map((adicional) => adicional.nome).join(', ')}</p>}
                {item.observacao && <p>Observação: {item.observacao}</p>}
              </div>
              <div className={styles.acoesItemComanda}>
                <strong>{moeda(Number(item.preco) * item.quantidade)}</strong>
                <div className={styles.controleItemComanda} aria-label={`Quantidade de ${item.nome}`}>
                  <button type="button" aria-label={`Diminuir ${item.nome}`} disabled={Boolean(processando) || item.quantidade <= 1} onClick={() => ajustarQuantidade(item, item.quantidade - 1)}><Minus size={15} /></button>
                  <span>{item.quantidade}</span>
                  <button type="button" aria-label={`Aumentar ${item.nome}`} disabled={Boolean(processando)} onClick={() => ajustarQuantidade(item, item.quantidade + 1)}><Plus size={15} /></button>
                  <button type="button" className={styles.botaoRemoverItem} aria-label={`Remover ${item.nome}`} disabled={Boolean(processando)} onClick={() => removerItem(item)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}

          <div className={styles.finalizarComandaAdmin}>
            <div><span>Total da comanda</span><strong>{moeda(totalSelecionado)}</strong></div>
            <label className={styles.campo}>
              <span>Forma de pagamento</span>
              <select value={pagamentoSelecionado} onChange={(event) => setPagamento(event.target.value)}>
                {formasPagamento.map((forma) => <option key={forma} value={forma}>{forma}</option>)}
              </select>
            </label>
            <button type="button" className={styles.botaoPrimario} disabled={Boolean(processando) || comandaSelecionada.itens.length === 0 || formasPagamento.length === 0} onClick={finalizar}>{processando === 'finalizar' ? 'Finalizando…' : 'Finalizar comanda'}</button>
          </div>
        </section>
      )}
    </AdminLayout>
  );
}

export default MesasAdmin;
