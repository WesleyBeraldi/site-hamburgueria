import { createServer as criarServidorVite } from 'vite';

import { criarServidor } from './app.js';
import { config } from './config.js';
import { abrirBanco } from './database.js';
import { aguardarServidor, fecharServidor } from './runtime.js';

const banco = abrirBanco({ caminho: config.caminhoBanco, administrador: config.administrador });
const api = criarServidor({ banco, pastaUploads: config.pastaUploads });
const vite = await criarServidorVite();

await aguardarServidor(api, config.porta);
await vite.listen();

console.log(`Backend da hamburgueria disponível em http://localhost:${config.porta}`);
vite.printUrls();

async function encerrar() {
  await Promise.all([fecharServidor(api), vite.close()]);
  banco.close();
}

process.once('SIGINT', () => encerrar().finally(() => process.exit(0)));
process.once('SIGTERM', () => encerrar().finally(() => process.exit(0)));
