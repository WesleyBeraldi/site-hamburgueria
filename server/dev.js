import { createServer as criarServidorVite } from 'vite';

import { aguardarServidor, fecharServidor } from './runtime.js';

const vite = await criarServidorVite();
let api;
let banco;
let fecharBanco;

await vite.listen();
vite.printUrls();

try {
  const [{ criarServidor }, { config }, moduloBanco] = await Promise.all([
    import('./app.js'),
    import('./config.js'),
    import('./database.js')
  ]);
  fecharBanco = moduloBanco.fecharBanco;
  banco = await moduloBanco.abrirBanco({
    mysql: config.mysql,
    administrador: config.administrador,
    incluirDadosDemonstracao: config.incluirDadosDemonstracao,
    pinFuncionarioDemonstracao: config.pinFuncionarioDemonstracao
  });
  api = criarServidor({
    banco,
    pastaUploads: config.pastaUploads,
    producao: config.producao,
    corsOrigins: config.corsOrigins,
    publicSiteUrl: config.publicSiteUrl
  });
  await aguardarServidor(api, config.porta);
  console.log(`Backend da hamburgueria disponível em http://localhost:${config.porta}`);
} catch (erro) {
  console.error('\n[API indisponível] O frontend continuará funcionando para visualização.');
  console.error(`Motivo: ${erro instanceof Error ? erro.message : erro}`);
  console.error('Configure o arquivo .env e inicie o MySQL para habilitar todos os recursos.\n');
}

async function encerrar() {
  await Promise.all([
    api ? fecharServidor(api) : Promise.resolve(),
    vite.close()
  ]);
  if (banco && fecharBanco) await fecharBanco(banco);
}

process.once('SIGINT', () => encerrar().finally(() => process.exit(0)));
process.once('SIGTERM', () => encerrar().finally(() => process.exit(0)));
