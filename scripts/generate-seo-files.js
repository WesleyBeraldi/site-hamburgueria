import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const pastaDist = resolve('dist');
const urlInformada = String(process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_URL || '').trim();
let origem = '';

if (urlInformada) {
  const url = new URL(urlInformada);
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('PUBLIC_SITE_URL deve usar HTTPS em produção.');
  }
  origem = url.href.replace(/\/$/, '');
}

const rotasPublicas = ['/', '/politica-de-privacidade', '/termos-de-uso'];
const sitemap = origem
  ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rotasPublicas.map((rota) => `  <url><loc>${origem}${rota}</loc></url>`).join('\n')}\n</urlset>\n`
  : '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';
const robots = `User-agent: *\nAllow: /\n${origem ? `\nSitemap: ${origem}/sitemap.xml\n` : ''}`;

await mkdir(pastaDist, { recursive: true });
await Promise.all([
  writeFile(resolve(pastaDist, 'robots.txt'), robots, 'utf8'),
  writeFile(resolve(pastaDist, 'sitemap.xml'), sitemap, 'utf8')
]);
