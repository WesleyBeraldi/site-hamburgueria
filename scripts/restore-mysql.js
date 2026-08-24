import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';

for (const chave of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
  if (!process.env[chave]) throw new Error(`Defina ${chave} antes de restaurar o backup.`);
}
const entrada = process.argv[2];
if (!entrada) throw new Error('Informe o arquivo: npm run db:restore -- caminho/do/backup.sql');
if (process.env.CONFIRM_RESTORE !== process.env.DB_NAME) {
  throw new Error(`Para confirmar a substituição dos dados, defina CONFIRM_RESTORE=${process.env.DB_NAME}.`);
}

const arquivo = resolve(entrada);
await access(arquivo);
const processo = spawn('mysql', [
  `--host=${process.env.DB_HOST}`,
  `--port=${process.env.DB_PORT || '3306'}`,
  `--user=${process.env.DB_USER}`,
  '--default-character-set=utf8mb4',
  process.env.DB_NAME
], {
  env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD },
  stdio: ['pipe', 'inherit', 'inherit'],
  windowsHide: true
});
const [codigo] = await Promise.all([
  new Promise((resolveCodigo, reject) => {
    processo.once('error', reject);
    processo.once('close', resolveCodigo);
  }),
  pipeline(createReadStream(arquivo), processo.stdin)
]);
if (codigo !== 0) throw new Error(`mysql terminou com código ${codigo}.`);
console.info(`Backup restaurado em ${process.env.DB_NAME}: ${arquivo}`);
