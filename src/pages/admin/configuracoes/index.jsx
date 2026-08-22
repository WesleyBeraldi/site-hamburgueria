import { Database, ImageUp, Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import { otimizarImagemProduto } from '../../../utils/imageUpload';
import styles from '../shared.module.css';

function ConfiguracoesAdmin() {
  const { configuracao, setConfiguracao } = useApp();
  const [dados, setDados] = useState({ ...configuracao, areasEntrega: configuracao.areasEntrega ?? [] });
  const [salvo, setSalvo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  function alterar(campo, valor) {
    setDados((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function alterarArea(indice, campo, valor) {
    setDados((atuais) => ({
      ...atuais,
      areasEntrega: atuais.areasEntrega.map((area, posicao) => (
        posicao === indice ? { ...area, [campo]: valor } : area
      ))
    }));
  }

  function adicionarArea() {
    setDados((atuais) => ({
      ...atuais,
      areasEntrega: [...atuais.areasEntrega, { bairro: '', taxa: atuais.taxaEntrega ?? 0 }]
    }));
  }

  function removerArea(indice) {
    setDados((atuais) => ({
      ...atuais,
      areasEntrega: atuais.areasEntrega.filter((_, posicao) => posicao !== indice)
    }));
  }

  async function selecionarLogo(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    setErro('');
    try {
      alterar('logo', await otimizarImagemProduto(arquivo));
    } catch (falha) {
      setErro(falha.message);
    }
  }

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;
    setErro('');
    setEnviando(true);
    try {
      const configuracaoSalva = await setConfiguracao({
        ...dados,
        taxaEntrega: Number(dados.taxaEntrega),
        pedidoMinimo: Number(dados.pedidoMinimo),
        areasEntrega: dados.areasEntrega.map((area) => ({
          bairro: area.bairro,
          taxa: Number(area.taxa)
        }))
      });
      setDados({ ...configuracaoSalva, areasEntrega: configuracaoSalva.areasEntrega ?? [] });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AdminLayout titulo="Configurações" subtitulo="Identidade, operação e regras públicas da loja.">
      <div className={styles.detalheGrid}>
        <section className={styles.card}>
          <div className={styles.topoCard}>
            <div><h2>Informações da lanchonete</h2><p>O site público usa estes dados, sem contatos ou links fictícios.</p></div>
          </div>

          <form className={styles.formulario} onSubmit={enviar}>
            <div className={styles.uploadImagem}>
              <div className={styles.previaImagem}>
                {dados.logo ? <img src={dados.logo} alt="Prévia da logo" /> : <div><ImageUp size={32} /><span>Nenhuma logo cadastrada</span></div>}
              </div>
              <div className={styles.uploadConteudo}>
                <h2>Logo da loja</h2>
                <p>JPG, PNG ou WebP. A imagem será otimizada antes de ser salva.</p>
                <div className={styles.acoesCabecalho}>
                  <label className={styles.botaoSecundario} htmlFor="logoLoja"><ImageUp size={16} /> Selecionar logo</label>
                  {dados.logo && <button type="button" className={styles.botaoPerigo} onClick={() => alterar('logo', '')}><Trash2 size={16} /> Remover</button>}
                </div>
                <input className={styles.arquivoInput} id="logoLoja" type="file" accept="image/jpeg,image/png,image/webp" onChange={selecionarLogo} />
              </div>
            </div>

            <div className={styles.gridFormulario}>
              <div className={styles.campo}><label htmlFor="nomeLoja">Nome da loja</label><input id="nomeLoja" required value={dados.nomeLoja ?? ''} onChange={(event) => alterar('nomeLoja', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="telefoneLoja">Telefone</label><input id="telefoneLoja" required value={dados.telefone ?? ''} onChange={(event) => alterar('telefone', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="whatsappLoja">WhatsApp <span>(opcional)</span></label><input id="whatsappLoja" value={dados.whatsapp ?? ''} onChange={(event) => alterar('whatsapp', event.target.value)} placeholder="Número com DDD" /></div>
              <div className={styles.campo}><label htmlFor="emailLoja">E-mail</label><input id="emailLoja" required type="email" value={dados.email ?? ''} onChange={(event) => alterar('email', event.target.value)} /></div>
              <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="enderecoLoja">Endereço</label><input id="enderecoLoja" required value={dados.endereco ?? ''} onChange={(event) => alterar('endereco', event.target.value)} /></div>
              <div className={`${styles.campo} ${styles.campoCompleto}`}><label htmlFor="horarioFuncionamento">Horário de funcionamento</label><textarea id="horarioFuncionamento" required value={dados.horarioFuncionamento ?? ''} onChange={(event) => alterar('horarioFuncionamento', event.target.value)} placeholder={'Segunda a quinta: 18h às 23h\nSexta e sábado: 18h à 0h'} /></div>
              <div className={styles.campo}><label htmlFor="instagramUrl">Instagram <span>(URL opcional)</span></label><input id="instagramUrl" type="url" value={dados.instagramUrl ?? ''} onChange={(event) => alterar('instagramUrl', event.target.value)} placeholder="https://instagram.com/sua-loja" /></div>
              <div className={styles.campo}><label htmlFor="facebookUrl">Facebook <span>(URL opcional)</span></label><input id="facebookUrl" type="url" value={dados.facebookUrl ?? ''} onChange={(event) => alterar('facebookUrl', event.target.value)} placeholder="https://facebook.com/sua-loja" /></div>
            </div>

            <div className={styles.topoCard}><div><h2>Operação de pedidos</h2><p>Estas regras também são validadas pelo servidor.</p></div></div>
            <div className={styles.gridFormulario}>
              <div className={styles.campo}><label htmlFor="lojaAberta">Funcionamento atual</label><select id="lojaAberta" value={dados.lojaAberta ? 'aberta' : 'fechada'} onChange={(event) => alterar('lojaAberta', event.target.value === 'aberta')}><option value="aberta">Loja aberta</option><option value="fechada">Loja fechada</option></select></div>
              <div className={styles.campo}><label htmlFor="entregaAtiva">Delivery</label><select id="entregaAtiva" value={dados.entregaAtiva ? 'ativo' : 'inativo'} onChange={(event) => alterar('entregaAtiva', event.target.value === 'ativo')}><option value="ativo">Entrega ativa</option><option value="inativo">Entrega indisponível</option></select></div>
              <div className={styles.campo}><label htmlFor="taxaEntrega">Taxa padrão de entrega</label><input id="taxaEntrega" min="0" required type="number" step="0.01" value={dados.taxaEntrega ?? 0} onChange={(event) => alterar('taxaEntrega', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="tempoEntrega">Tempo estimado</label><input id="tempoEntrega" required value={dados.tempoEntrega ?? ''} onChange={(event) => alterar('tempoEntrega', event.target.value)} /></div>
              <div className={styles.campo}><label htmlFor="pedidoMinimo">Pedido mínimo</label><input id="pedidoMinimo" min="0" required type="number" step="0.01" value={dados.pedidoMinimo ?? 0} onChange={(event) => alterar('pedidoMinimo', event.target.value)} /></div>
            </div>

            <div className={styles.tituloCampoComAcao}>
              <div><h2>Áreas de entrega</h2><p>Quando houver bairros cadastrados, pedidos fora desta lista serão recusados. Sem bairros, vale a taxa padrão.</p></div>
              <button type="button" className={styles.botaoSecundario} onClick={adicionarArea}><Plus size={16} /> Adicionar bairro</button>
            </div>
            {dados.areasEntrega.length === 0 && <div className={styles.aviso}>Nenhuma área específica: qualquer bairro informado usará a taxa padrão.</div>}
            <div className={styles.listaAreasEntrega}>
              {dados.areasEntrega.map((area, indice) => (
                <div className={styles.linhaAreaEntrega} key={indice}>
                  <div className={styles.campo}><label htmlFor={`bairro-${indice}`}>Bairro</label><input id={`bairro-${indice}`} required value={area.bairro} onChange={(event) => alterarArea(indice, 'bairro', event.target.value)} /></div>
                  <div className={styles.campo}><label htmlFor={`taxa-${indice}`}>Taxa</label><input id={`taxa-${indice}`} min="0" required type="number" step="0.01" value={area.taxa} onChange={(event) => alterarArea(indice, 'taxa', event.target.value)} /></div>
                  <button type="button" className={styles.botaoIcone} onClick={() => removerArea(indice)} aria-label={`Remover ${area.bairro || 'área'}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <div className={styles.topoCard}><div><h2>Formas de pagamento</h2><p>O Pix só aparece quando chave e beneficiário estiverem preenchidos.</p></div></div>
            <div className={styles.gridFormulario}>
              <div className={styles.campo}><label htmlFor="aceitaCartao">Cartão na entrega</label><select id="aceitaCartao" value={dados.aceitaCartao ? 'sim' : 'nao'} onChange={(event) => alterar('aceitaCartao', event.target.value === 'sim')}><option value="sim">Aceitar</option><option value="nao">Não aceitar</option></select></div>
              <div className={styles.campo}><label htmlFor="aceitaDinheiro">Dinheiro</label><select id="aceitaDinheiro" value={dados.aceitaDinheiro ? 'sim' : 'nao'} onChange={(event) => alterar('aceitaDinheiro', event.target.value === 'sim')}><option value="sim">Aceitar</option><option value="nao">Não aceitar</option></select></div>
              <div className={styles.campo}><label htmlFor="pixChave">Chave Pix <span>(opcional)</span></label><input id="pixChave" value={dados.pixChave ?? ''} onChange={(event) => alterar('pixChave', event.target.value)} placeholder="Cadastre a chave real da hamburgueria" /></div>
              <div className={styles.campo}><label htmlFor="pixBeneficiario">Beneficiário do Pix</label><input id="pixBeneficiario" value={dados.pixBeneficiario ?? ''} onChange={(event) => alterar('pixBeneficiario', event.target.value)} disabled={!dados.pixChave} /></div>
            </div>

            {salvo && <div className={styles.sucesso} role="status">Configurações salvas com sucesso.</div>}
            {erro && <div className={styles.erro} role="alert">{erro}</div>}
            <div className={styles.rodapeFormulario}><button disabled={enviando} type="submit" className={styles.botaoPrimario}><Save size={17} /> {enviando ? 'Salvando…' : 'Salvar configurações'}</button></div>
          </form>
        </section>

        <aside>
          <section className={styles.card}>
            <div className={styles.topoCard}><div><h2>Persistência centralizada</h2><p>Fonte única de dados do sistema.</p></div><Database size={25} color="#ffc107" /></div>
            <div className={styles.aviso}>Identidade, contatos, horários, áreas, taxas, pedido mínimo, status e pagamentos são publicados a partir do MySQL. Revise todos os dados reais antes de abrir a loja.</div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  );
}

export default ConfiguracoesAdmin;
