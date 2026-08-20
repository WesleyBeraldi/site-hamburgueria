import { ArrowLeft, Copy, ExternalLink, QrCode } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AdminLayout from '../../../components/AdminLayout';
import { useApp } from '../../../context/appContext';
import { QRCodeSVG } from '../../../vendor/qrcode';
import styles from '../shared.module.css';

function QrCodeFuncionario() {
  const { id } = useParams();
  const { funcionarios } = useApp();
  const navigate = useNavigate();
  const [copiado, setCopiado] = useState(false);
  const funcionario = funcionarios.find((item) => item.id === id);

  if (!funcionario) {
    return <AdminLayout titulo="Funcionário não encontrado" subtitulo="Não foi possível gerar o acesso."><button type="button" className={styles.botaoSecundario} onClick={() => navigate('/admin/funcionarios')}><ArrowLeft size={17} /> Voltar</button></AdminLayout>;
  }

  const urlAcesso = `${window.location.origin}/garcom/acesso/${funcionario.token}`;

  async function copiar() {
    await navigator.clipboard.writeText(urlAcesso);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  const acao = <button type="button" className={styles.botaoSecundario} onClick={() => navigate('/admin/funcionarios')}><ArrowLeft size={17} /> Voltar</button>;

  return (
    <AdminLayout titulo="QR Code do garçom" subtitulo={`Acesso individual de ${funcionario.nome}.`} acao={acao}>
      <section className={styles.card}>
        <div className={styles.qrArea}>
          <div className={styles.qrBox}>
            <QRCodeSVG value={urlAcesso} size={210} level="H" includeMargin aria-label={`QR Code de ${funcionario.nome}`} />
          </div>
          <div>
            <div className={styles.topoCard}><div><h2>{funcionario.nome}</h2><p>{funcionario.cargo} • {funcionario.status}</p></div><QrCode size={34} color="#ffc107" /></div>
            <div className={styles.aviso}>Este QR Code contém somente o token <strong>{funcionario.token}</strong>. A senha/PIN permanece separada e será solicitada após a leitura.</div>
            <p className={styles.codigo}>{urlAcesso}</p>
            <div className={styles.acoes}>
              <button type="button" className={styles.botaoPrimario} onClick={copiar}><Copy size={17} /> {copiado ? 'Link copiado' : 'Copiar link'}</button>
              <button type="button" className={styles.botaoSecundario} onClick={() => window.open(urlAcesso, '_blank', 'noopener,noreferrer')}><ExternalLink size={17} /> Testar acesso</button>
            </div>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}

export default QrCodeFuncionario;
