import { createServer as criarServidorVite } from 'vite';

import { criarServidor } from './app.js';
import { config } from './config.js';
import { abrirBanco, fecharBanco } from './database.js';
import { aguardarServidor, fecharServidor } from './runtime.js';

const banco = await abrirBanco({ mysql: config.mysql });
const api = criarServidor({
  banco,
  pastaUploads: config.pastaUploads,
  producao: config.producao,
  corsOrigins: config.corsOrigins,
  publicSiteUrl: config.publicSiteUrl,
  dominioPrincipal: config.dominioPrincipal,
  tenantDesenvolvimento: config.tenantDesenvolvimento,
  jwtSecret: config.jwtSecret
});
const vite = await criarServidorVite();

await aguardarServidor(api, config.porta);
await vite.listen();

console.log(`Backend da hamburgueria disponível em http://localhost:${config.porta}`);
vite.printUrls();

async function encerrar() {
  await Promise.all([fecharServidor(api), vite.close()]);
  await fecharBanco(banco);
}

process.once('SIGINT', () => encerrar().finally(() => process.exit(0)));
process.once('SIGTERM', () => encerrar().finally(() => process.exit(0)));
