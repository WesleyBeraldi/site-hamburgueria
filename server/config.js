import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pastaProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const producao = process.env.NODE_ENV === 'production';
const senhaAdmin = process.env.ADMIN_PASSWORD || '';

function caminhoConfigurado(valor, padrao) {
  const caminho = valor || padrao;
  return isAbsolute(caminho) ? caminho : resolve(pastaProjeto, caminho);
}

if (producao && senhaAdmin.length < 12) {
  throw new Error('Defina ADMIN_PASSWORD com pelo menos 12 caracteres antes de iniciar o servidor em produção.');
}

if (producao && (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME)) {
  throw new Error('Defina DB_HOST, DB_USER, DB_PASSWORD e DB_NAME antes de iniciar o servidor em produção.');
}

export const config = {
  porta: Number(process.env.PORT) || 3001,
  producao,
  incluirDadosDemonstracao: !producao || process.env.SEED_DEMO_DATA === '1',
  pinFuncionarioDemonstracao: process.env.DEMO_WAITER_PIN || null,
  mysql: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hamburgueria',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    criarBancoSeAusente: !producao
  },
  pastaUploads: caminhoConfigurado(process.env.UPLOADS_PATH, 'server/uploads'),
  pastaDist: resolve(pastaProjeto, 'dist'),
  administrador: {
    usuario: process.env.ADMIN_USER || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@hamburgueria.com',
    nome: process.env.ADMIN_NAME || 'Administrador',
    senha: senhaAdmin || 'admin123',
    sincronizarCredenciais: Boolean(process.env.ADMIN_PASSWORD)
  }
};
