import { ArrowLeft, Check, Minus, Plus, Send, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import WaiterLayout from '../../components/WaiterLayout';
import { useApp } from '../../context/appContext';
import styles from './garcom.module.css';

function moeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function ComandaGarcom() {
  const { mesaId } = useParams();
  const {
    produtos,
    adicionais,
    mesas,
    comandas,
    garcomSessao,
    abrirComanda,
    adicionarItemComanda,
    removerItemComanda,
    enviarComanda,
    solicitarConta,
    fecharComanda,
    numeroPreco
  } = useApp();
  const navigate = useNavigate();
  const mesa = mesas.find((item) => item.id === Number(mesaId));
  const comanda = comandas.find((item) => item.mesaId === Number(mesaId) && item.status !== 'Encerrada');
  const [categoria, setCategoria] = useState('Todos');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  const [extras, setExtras] = useState([]);
  const [observacao, setObservacao] = useState('');
  const [pagamento, setPagamento] = useState('Pix');
  const [mensagem, setMensagem] = useState('');

  if (!mesa) {
    return <WaiterLayout titulo="Mesa não encontrada" subtitulo="Volte para selecionar uma mesa válida."><button type="button" className={styles.botaoSecundario} onClick={() => navigate('/garcom/mesas')}><ArrowLeft size={17} /> Voltar</button></WaiterLayout>;
  }

  if (!comanda) {
    return <WaiterLayout titulo={`Mesa ${mesa.numero}`} subtitulo="A comanda ainda não foi aberta."><button type="button" className={styles.botaoPrincipal} onClick={() => abrirComanda(mesa.id)}>Abrir comanda</button></WaiterLayout>;
  }

  if (comanda.funcionarioId !== garcomSessao.id) {
    return <WaiterLayout titulo={`Mesa ${mesa.numero} em atendimento`} subtitulo={`Esta comanda pertence a ${comanda.garcom}.`}><button type="button" className={styles.botaoSecundario} onClick={() => navigate('/garcom/mesas')}><ArrowLeft size={17} /> Voltar</button></WaiterLayout>;
  }

  const categorias = ['Todos', ...new Set(produtos.filter((produto) => produto.ativo).map((produto) => produto.categoria))];
  const filtrados = produtos.filter((produto) => produto.ativo && (categoria === 'Todos' || produto.categoria === categoria));
  const total = comanda.itens.reduce((soma, item) => soma + Number(item.preco) * item.quantidade, 0);
  const precoModal = produtoSelecionado ? (numeroPreco(produtoSelecionado.preco) + extras.reduce((soma, item) => soma + item.preco, 0)) * quantidade : 0;

  function abrirProduto(produto) {
    setProdutoSelecionado(produto);
    setQuantidade(1);
    setExtras([]);
    setObservacao('');
  }

  function alternarExtra(adicional) {
    setExtras((atuais) => atuais.some((item) => item.id === adicional.id) ? atuais.filter((item) => item.id !== adicional.id) : [...atuais, adicional]);
  }

  function adicionar() {
    adicionarItemComanda(comanda.id, produtoSelecionado, quantidade, extras, observacao.trim());
    setProdutoSelecionado(null);
    setMensagem('Item adicionado à comanda.');
  }

  function enviar() {
    if (enviarComanda(comanda.id)) setMensagem('Pedido enviado para a cozinha.');
  }

  function encerrar() {
    fecharComanda(comanda.id, pagamento);
    navigate('/garcom/mesas');
  }

  return (
    <WaiterLayout titulo={`Comanda • Mesa ${mesa.numero}`} subtitulo={`Garçom: ${comanda.garcom} • aberta às ${comanda.abertaEm}`}>
      {mensagem && <div className={styles.identificado}><span><Check size={18} /></span><div><strong>{mensagem}</strong><small>Status atual: {comanda.status}</small></div></div>}
      <div className={styles.comandaLayout}>
        <section className={styles.painel}>
          <div className={styles.topoPainel}><div><h2>Cardápio</h2><p>Adicione itens e observações à mesma comanda.</p></div><button type="button" className={styles.botaoSecundario} onClick={() => navigate('/garcom/mesas')}><ArrowLeft size={16} /> Mesas</button></div>
          <div className={styles.categorias}>{categorias.map((item) => <button type="button" key={item} className={`${styles.categoria} ${categoria === item ? styles.categoriaAtiva : ''}`} onClick={() => setCategoria(item)}>{item}</button>)}</div>
          <div className={styles.gradeProdutos}>{filtrados.map((produto) => <article className={styles.produto} key={produto.id}><img src={produto.imagem} alt={produto.nome} /><div><h3>{produto.nome}</h3><p>{produto.descricao}</p><div className={styles.produtoRodape}><strong>R$ {produto.preco}</strong><button type="button" aria-label={`Adicionar ${produto.nome}`} onClick={() => abrirProduto(produto)}><Plus size={16} /></button></div></div></article>)}</div>
        </section>

        <aside className={`${styles.painel} ${styles.resumo}`}>
          <div className={styles.topoPainel}><div><h2>Resumo da comanda</h2><p>{comanda.status} • {comanda.itens.length} itens</p></div></div>
          {comanda.itens.length === 0 ? <div className={styles.vazio}>A comanda está vazia.<br />Selecione um produto no cardápio.</div> : comanda.itens.map((item, indice) => <div className={styles.itemComanda} key={item.linhaId ?? `${item.id}-${indice}`}><div><h3>{item.quantidade}x {item.nome}</h3>{item.adicionais?.length > 0 && <p>+ {item.adicionais.map((extra) => extra.nome ?? extra).join(', ')}</p>}{item.observacao && <p>{item.observacao}</p>}</div><div><strong>{moeda(Number(item.preco) * item.quantidade)}</strong><button type="button" aria-label={`Remover ${item.nome}`} onClick={() => removerItemComanda(comanda.id, item.linhaId ?? item.id)}><Trash2 size={14} /></button></div></div>)}
          <div className={styles.total}><span>Total</span><strong>{moeda(total)}</strong></div>
          <div className={styles.acoesComanda}>
            <button type="button" className={styles.botaoPrincipal} disabled={comanda.itens.length === 0} onClick={enviar}><Send size={17} /> Enviar para cozinha</button>
            <button type="button" className={styles.botaoSecundario} disabled={comanda.itens.length === 0} onClick={() => { solicitarConta(comanda.id); setMensagem('Conta solicitada.'); }}>Solicitar conta</button>
            {comanda.status === 'Conta solicitada' && <><div className={styles.campo}><label htmlFor="pagamentoComanda">Forma de pagamento</label><select id="pagamentoComanda" value={pagamento} onChange={(event) => setPagamento(event.target.value)}><option>Pix</option><option>Cartão</option><option>Dinheiro</option></select></div><button type="button" className={styles.botaoPerigo} onClick={encerrar}>Finalizar e liberar mesa</button></>}
          </div>
        </aside>
      </div>

      {produtoSelecionado && <div className={styles.modalFundo} onClick={() => setProdutoSelecionado(null)}><div className={styles.modal} onClick={(event) => event.stopPropagation()}><div className={styles.modalTopo}><div><h2>{produtoSelecionado.nome}</h2><p>{produtoSelecionado.descricao}</p></div><button type="button" onClick={() => setProdutoSelecionado(null)}><X size={21} /></button></div><div className={styles.adicionais}>{adicionais.map((adicional) => <button type="button" key={adicional.id} className={`${styles.adicional} ${extras.some((item) => item.id === adicional.id) ? styles.adicionalAtivo : ''}`} onClick={() => alternarExtra(adicional)}><span>{adicional.nome}</span><strong>+ {moeda(adicional.preco)}</strong></button>)}</div><div className={styles.campo}><label htmlFor="observacaoItem">Observação <span>(opcional)</span></label><textarea id="observacaoItem" value={observacao} onChange={(event) => setObservacao(event.target.value)} placeholder="Ex: sem cebola, ponto da carne..." /></div><div className={styles.modalRodape}><div className={styles.quantidade}><button type="button" onClick={() => setQuantidade((atual) => Math.max(1, atual - 1))}><Minus size={16} /></button><strong>{quantidade}</strong><button type="button" onClick={() => setQuantidade((atual) => atual + 1)}><Plus size={16} /></button></div><button type="button" className={styles.botaoPrincipal} onClick={adicionar}>Adicionar • {moeda(precoModal)}</button></div></div></div>}
    </WaiterLayout>
  );
}

export default ComandaGarcom;
