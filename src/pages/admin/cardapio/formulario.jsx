import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import styles from '../shared.module.css';

const formularioVazio = {
  nome: '',
  categoria: 'Hambúrgueres',
  descricao: '',
  preco: '',
  destaque: '',
  ativo: true
};

function FormularioProduto() {
  const { id } = useParams();
  const { produtos, salvarProduto } = useApp();
  const navigate = useNavigate();
  const existente = produtos.find((produto) => String(produto.id) === id);
  const [dados, setDados] = useState(() => existente ? { ...existente } : formularioVazio);
  const [erro, setErro] = useState('');

  function alterar(campo, valor) {
    setDados((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function enviar(event) {
    event.preventDefault();
    if (!dados.nome.trim() || !dados.descricao.trim() || !dados.preco.trim()) {
      setErro('Preencha nome, descrição e preço do produto.');
      return;
    }

    salvarProduto({ ...dados, preco: dados.preco.replace('.', ',') });
    navigate('/admin/cardapio');
  }

  const acao = <button type="button" className={styles.botaoSecundario} onClick={() => navigate('/admin/cardapio')}><ArrowLeft size={17} /> Voltar</button>;

  return (
    <AdminLayout titulo={existente ? 'Editar produto' : 'Cadastrar produto'} subtitulo="As alterações aparecem no cardápio do cliente e do garçom." acao={acao}>
      <section className={styles.card}>
        <form className={styles.formulario} onSubmit={enviar}>
          <div className={styles.gridFormulario}>
            <div className={styles.campo}><label htmlFor="nome">Nome do produto</label><input id="nome" value={dados.nome} onChange={(event) => alterar('nome', event.target.value)} placeholder="Ex: X-Bacon Especial" /></div>
            <div className={styles.campo}><label htmlFor="categoria">Categoria</label><select id="categoria" value={dados.categoria} onChange={(event) => alterar('categoria', event.target.value)}><option>Hambúrgueres</option><option>Combos</option><option>Porções</option><option>Bebidas</option></select></div>
            <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="descricao">Descrição</label><textarea id="descricao" value={dados.descricao} onChange={(event) => alterar('descricao', event.target.value)} placeholder="Descreva ingredientes e características..." /></div>
            <div className={styles.campo}><label htmlFor="preco">Preço</label><input id="preco" inputMode="decimal" value={dados.preco} onChange={(event) => alterar('preco', event.target.value)} placeholder="34,90" /></div>
            <div className={styles.campo}><label htmlFor="destaque">Destaque <span>(opcional)</span></label><input id="destaque" value={dados.destaque ?? ''} onChange={(event) => alterar('destaque', event.target.value)} placeholder="Ex: Mais vendido" /></div>
          </div>
          {erro && <div className={styles.erro}>{erro}</div>}
          <div className={styles.rodapeFormulario}>
            <button type="button" className={styles.botaoSecundario} onClick={() => navigate('/admin/cardapio')}>Cancelar</button>
            <button type="submit" className={styles.botaoPrimario}><Save size={17} /> Salvar produto</button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
}

export default FormularioProduto;
