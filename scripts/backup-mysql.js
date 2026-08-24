import { createWriteStream } from 'node:fs';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { finished } from 'node:stream/promises';

for (const chave of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
  if (!process.env[chave]) throw new Error(`Defina ${chave} antes de gerar o backup.`);
}

const pasta = resolve(process.env.BACKUP_PATH || 'backups/mysql');
const retencaoDias = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS) || 14);
const carimbo = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const arquivo = resolve(pasta, `${process.env.DB_NAME}-${carimbo}.sql`);
await mkdir(pasta, { recursive: true });

const argumentos = [
  `--host=${process.env.DB_HOST}`,
  `--port=${process.env.DB_PORT || '3306'}`,
  `--user=${process.env.DB_USER}`,
  '--single-transaction',
  '--routines',
  '--triggers',
  '--events',
  '--set-gtid-purged=OFF',
  '--default-character-set=utf8mb4',
  process.env.DB_NAME
];
const processo = spawn('mysqldump', argumentos, {
  env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD },
  stdio: ['ignore', 'pipe', 'inherit'],
  windowsHide: true
});
const saida = createWriteStream(arquivo, { flags: 'wx' });
processo.stdout.pipe(saida);
let codigo;
try {
  [codigo] = await Promise.all([
    new Promise((resolveCodigo, reject) => {
      processo.once('error', reject);
      processo.once('close', resolveCodigo);
    }),
    finished(saida)
  ]);
} catch (erro) {
  saida.destroy();
  await unlink(arquivo).catch(() => {});
  throw erro;
}
if (codigo !== 0) {
  await unlink(arquivo).catch(() => {});
  throw new Error(`mysqldump terminou com código ${codigo}.`);
}

const limite = Date.now() - retencaoDias * 24 * 60 * 60 * 1000;
for (const nome of await readdir(pasta)) {
  if (!nome.endsWith('.sql') || !nome.startsWith(`${process.env.DB_NAME}-`)) continue;
  const caminho = resolve(pasta, nome);
  if ((await stat(caminho)).mtimeMs < limite) await unlink(caminho);
}

console.info(`Backup criado: ${arquivo}`);
