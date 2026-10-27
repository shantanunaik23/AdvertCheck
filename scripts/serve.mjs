// Local preview server. Serves site/ with the same headers as site/_headers,
// so you can test the strict policy before deploying.
// Usage: node scripts/serve.mjs [port]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = fileURLToPath(new URL('../site', import.meta.url));
const port = Number(process.argv[2]) || 8080;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };

async function headers() {
  const text = await readFile(join(siteDir, '_headers'), 'utf8');
  return Object.fromEntries(text.split('\n').slice(1).map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf(':');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }));
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(siteDir, path.endsWith('/') ? `${path}index.html` : path));
  if (!file.startsWith(siteDir + sep) && file !== siteDir) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    // HSTS is meaningless on plain-http localhost, so leave it out here.
    const { 'Strict-Transport-Security': _, ...h } = await headers();
    res.writeHead(200, { ...h, 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Ad Mirror preview: http://127.0.0.1:${port}/`));
