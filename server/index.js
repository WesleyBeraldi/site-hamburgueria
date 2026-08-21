import { criarServidor } from './app.js';
import { config } from './config.js';
import { abrirBanco } from './database.js';
import { aguardarServidor, fecharServidor } from './runtime.js';

const banco = abrirBanco({ caminho: config.caminhoBanco, administrador: config.administrador });
const servidor = criarServidor({ banco, pastaUploads: config.pastaUploads, pastaDist: config.pastaDist });

await aguardarServidor(servidor, config.porta);
console.log(`Backend da hamburgueria disponível em http://localhost:${config.porta}`);

async function encerrar() {
  await fecharServidor(servidor);
  banco.close();
}

process.once('SIGINT', () => encerrar().finally(() => process.exit(0)));
process.once('SIGTERM', () => encerrar().finally(() => process.exit(0)));
