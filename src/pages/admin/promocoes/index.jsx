import { BadgePercent, Edit3, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import styles from '../shared.module.css';

const vazio = {
  nome: '',
  categoria: 'Combos',
  descricao: '',
  precoAntigo: '',
  preco: '',
  destaque: '',
  tipo: 'OFERTA ESPECIAL',
  produtoId: '',
  inicioEm: '',
  fimEm: '',
  ativo: true
};

function PromocoesAdmin() {
  const { produtos, promocoes, salvarPromocao, removerPromocao } = useApp();
  const [formulario, setFormulario] = useState(null);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);

  function alterar(campo, valor) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(event) {
    event.preventDefault();
    if (processando) return;
    if (!formulario.produtoId || !formulario.nome.trim() || !formulario.preco.trim() || !formulario.descricao.trim()) {
      setErro('Vincule um produto e preencha nome, descrição e preço promocional.');
      return;
    }
    setProcessando(true);
    try {
      await salvarPromocao(formulario);
      setFormulario(null);
      setErro('');
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setProcessando(false);
    }
  }

  async function excluir(promocao) {
    if (processando) return;
    if (!window.confirm(`Remover a promoção ${promocao.nome}?`)) return;
    setProcessando(true);
    try {
      await removerPromocao(promocao.id);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setProcessando(false);
    }
  }

  const acao = <button type="button" className={styles.botaoPrimario} onClick={() => setFormulario({ ...vazio, produtoId: produtos.find((produto) => produto.ativo)?.id ?? '' })}><Plus size={17} /> Nova promoção</button>;

  return (
    <AdminLayout titulo="Promoções" subtitulo="Crie ofertas que aparecem no carrossel da página inicial." acao={acao}>
      {formulario && (
        <section className={styles.card}>
          <div className={styles.topoCard}>
            <div><h2>{formulario.id ? 'Editar promoção' : 'Cadastrar promoção'}</h2><p>Defina os dados exibidos no card promocional.</p></div>
            <button type="button" className={styles.botaoIcone} aria-label="Fechar formulário" onClick={() => setFormulario(null)}><X size={17} /></button>
          </div>
          <form className={styles.formulario} onSubmit={enviar}>
            <div className={styles.gridFormulario}>
              <div className={styles.campo}><label htmlFor="nomePromocao">Nome</label><input id="nomePromocao" value={formulario.nome} onChange={(event) => alterar('nome', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="produtoPromocao">Produto vinculado</label><select id="produtoPromocao" value={formulario.produtoId ?? ''} onChange={(event) => alterar('produtoId', Number(event.target.value))}><option value="">Selecione</option>{produtos.filter((produto) => produto.ativo).map((produto) => <option key={produto.id} value={produto.id}>{produto.nome}</option>)}</select></div>
              <div className={styles.campo}><label htmlFor="tipoPromocao">Selo da oferta</label><input id="tipoPromocao" value={formulario.tipo} onChange={(event) => alterar('tipo', event.target.value)} /></div>
              <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="descricaoPromocao">Descrição</label><textarea id="descricaoPromocao" value={formulario.descricao} onChange={(event) => alterar('descricao', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="precoAntigo">Preço anterior</label><input id="precoAntigo" value={formulario.precoAntigo} onChange={(event) => alterar('precoAntigo', event.target.value)} placeholder="49,90" /></div>
              <div className={styles.campo}><label htmlFor="precoNovo">Preço promocional</label><input id="precoNovo" value={formulario.preco} onChange={(event) => alterar('preco', event.target.value)} placeholder="42,40" /></div>
              <div className={styles.campo}><label htmlFor="destaquePromocao">Destaque</label><input id="destaquePromocao" value={formulario.destaque} onChange={(event) => alterar('destaque', event.target.value)} placeholder="15% OFF" /></div>
              <div className={styles.campo}><label htmlFor="categoriaPromocao">Categoria</label><select id="categoriaPromocao" value={formulario.categoria} onChange={(event) => alterar('categoria', event.target.value)}><option>Combos</option><option>Hambúrgueres</option><option>Porções</option><option>Bebidas</option></select></div>
              <div className={styles.campo}><label htmlFor="inicioPromocao">Início <span>(opcional)</span></label><input id="inicioPromocao" type="datetime-local" value={formulario.inicioEm ?? ''} onChange={(event) => alterar('inicioEm', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="fimPromocao">Fim <span>(opcional)</span></label><input id="fimPromocao" type="datetime-local" value={formulario.fimEm ?? ''} onChange={(event) => alterar('fimEm', event.target.value)} /></div>
            </div>
            {erro && <div className={styles.erro} role="alert">{erro}</div>}
            <div className={styles.rodapeFormulario}><button disabled={processando} type="button" className={styles.botaoSecundario} onClick={() => setFormulario(null)}>Cancelar</button><button disabled={processando} type="submit" className={styles.botaoPrimario}><Save size={17} /> {processando ? 'Salvando…' : 'Salvar promoção'}</button></div>
          </form>
        </section>
      )}

      <section className={styles.gradePromocoes}>
        {promocoes.map((promocao) => (
          <article className={styles.promocaoCard} key={promocao.id}>
            <div className={styles.produtoImagem}>
              <img src={promocao.imagem} alt={promocao.nome} loading="lazy" decoding="async" />
              <span className={`${styles.status} ${promocao.disponivel ? styles.statusAtivo : styles.statusInativo}`}>{promocao.disponivel ? promocao.destaque : promocao.ativo ? 'Fora do período' : 'Inativa'}</span>
            </div>
            <div className={styles.produtoConteudo}>
              <span className={styles.categoria}>{promocao.tipo}</span>
              <h3>{promocao.nome}</h3>
              <p>{promocao.descricao}</p>
              <div className={styles.produtoRodape}>
                <div><span className={styles.textoSecundario}>De R$ {promocao.precoAntigo}</span><span className={styles.preco}>R$ {promocao.preco}</span></div>
                <div className={styles.acoes}>
                  <button disabled={processando} type="button" className={styles.botaoIcone} aria-label={`Editar ${promocao.nome}`} onClick={() => setFormulario({ ...promocao, inicioEm: promocao.inicioEm?.slice(0, 16) ?? '', fimEm: promocao.fimEm?.slice(0, 16) ?? '' })}><Edit3 size={16} /></button>
                  <button disabled={processando} type="button" className={styles.botaoIcone} aria-label={`Remover ${promocao.nome}`} onClick={() => excluir(promocao)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {promocoes.length === 0 && <section className={styles.card}><div className={styles.vazio}><BadgePercent size={36} /><h3>Nenhuma promoção ativa</h3><p>Cadastre uma oferta para destacar no site.</p></div></section>}
    </AdminLayout>
  );
}

export default PromocoesAdmin;
