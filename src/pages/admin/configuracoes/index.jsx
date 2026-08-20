import { RotateCcw, Save, Settings } from 'lucide-react';
import { useState } from 'react';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import styles from '../shared.module.css';

function ConfiguracoesAdmin() {
  const { configuracao, setConfiguracao, restaurarDemonstracao } = useApp();
  const [dados, setDados] = useState({ ...configuracao });
  const [salvo, setSalvo] = useState(false);

  function alterar(campo, valor) {
    setDados((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function enviar(event) {
    event.preventDefault();
    setConfiguracao({ ...dados, taxaEntrega: Number(dados.taxaEntrega), pedidoMinimo: Number(dados.pedidoMinimo) });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  function restaurar() {
    if (window.confirm('Restaurar todos os dados demonstrativos do sistema?')) {
      restaurarDemonstracao();
      window.location.reload();
    }
  }

  return (
    <AdminLayout titulo="Configurações" subtitulo="Dados da loja e parâmetros usados no atendimento.">
      <div className={styles.detalheGrid}>
        <section className={styles.card}>
          <div className={styles.topoCard}><div><h2>Informações da lanchonete</h2><p>Esses dados serão usados no site e nos pedidos.</p></div></div>
          <form className={styles.formulario} onSubmit={enviar}>
            <div className={styles.gridFormulario}>
              <div className={styles.campo}><label htmlFor="nomeLoja">Nome da loja</label><input id="nomeLoja" value={dados.nomeLoja} onChange={(event) => alterar('nomeLoja', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="telefoneLoja">Telefone</label><input id="telefoneLoja" value={dados.telefone} onChange={(event) => alterar('telefone', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="emailLoja">E-mail</label><input id="emailLoja" type="email" value={dados.email} onChange={(event) => alterar('email', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="enderecoLoja">Endereço</label><input id="enderecoLoja" value={dados.endereco} onChange={(event) => alterar('endereco', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="taxaEntrega">Taxa de entrega</label><input id="taxaEntrega" type="number" step="0.1" value={dados.taxaEntrega} onChange={(event) => alterar('taxaEntrega', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="tempoEntrega">Tempo estimado</label><input id="tempoEntrega" value={dados.tempoEntrega} onChange={(event) => alterar('tempoEntrega', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="pedidoMinimo">Pedido mínimo</label><input id="pedidoMinimo" type="number" step="0.1" value={dados.pedidoMinimo} onChange={(event) => alterar('pedidoMinimo', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="lojaAberta">Funcionamento</label><select id="lojaAberta" value={dados.lojaAberta ? 'aberta' : 'fechada'} onChange={(event) => alterar('lojaAberta', event.target.value === 'aberta')}><option value="aberta">Loja aberta</option><option value="fechada">Loja fechada</option></select></div>
            </div>
            {salvo && <div className={styles.sucesso}>Configurações salvas com sucesso.</div>}
            <div className={styles.rodapeFormulario}><button type="submit" className={styles.botaoPrimario}><Save size={17} /> Salvar configurações</button></div>
          </form>
        </section>

        <aside>
          <section className={styles.card}>
            <div className={styles.topoCard}><div><h2>Ambiente demonstrativo</h2><p>Ferramentas úteis durante o desenvolvimento.</p></div><Settings size={25} color="#ffc107" /></div>
            <div className={styles.aviso}>Os dados ainda ficam salvos somente neste navegador. Quando o backend estiver pronto, essa camada será substituída pela API sem alterar as telas.</div>
            <div className={styles.rodapeFormulario}><button type="button" className={styles.botaoPerigo} onClick={restaurar}><RotateCcw size={17} /> Restaurar demonstração</button></div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  );
}

export default ConfiguracoesAdmin;
