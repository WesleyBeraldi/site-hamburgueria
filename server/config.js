import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pastaProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const producao = process.env.NODE_ENV === 'production';

function caminhoConfigurado(valor, padrao) {
  const caminho = valor || padrao;
  return isAbsolute(caminho) ? caminho : resolve(pastaProjeto, caminho);
}

if (producao && !process.env.ADMIN_PASSWORD) {
  throw new Error('Defina ADMIN_PASSWORD antes de iniciar o servidor em produção.');
}

export const config = {
  porta: Number(process.env.PORT) || 3001,
  producao,
  caminhoBanco: caminhoConfigurado(process.env.DATABASE_PATH, 'server/data/hamburgueria.sqlite'),
  pastaUploads: caminhoConfigurado(process.env.UPLOADS_PATH, 'server/uploads'),
  pastaDist: resolve(pastaProjeto, 'dist'),
  administrador: {
    usuario: process.env.ADMIN_USER || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@hamburgueria.com',
    nome: process.env.ADMIN_NAME || 'Administrador',
    senha: process.env.ADMIN_PASSWORD || 'admin123',
    sincronizarCredenciais: Boolean(process.env.ADMIN_PASSWORD)
  }
};
