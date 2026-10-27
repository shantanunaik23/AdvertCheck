// Generates the Content-Security-Policy from site/js/config.js and writes it to
//   - the <meta> tag in site/index.html (used on GitHub Pages)
//   - site/_headers (used if you move to Cloudflare Pages or Netlify)
// Run with --check to fail instead of writing when the files are out of date.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { config } from '../site/js/config.js';
import { GPT_CSP } from '../site/js/adslot.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');

function origin(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error(`Only https URLs are allowed in config: ${url}`);
  return u.origin;
}

function buildPolicy() {
  const directives = {
    'default-src': ["'none'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'", origin(config.control.url), ...config.probes.map((p) => origin(p.url))],
    'frame-src': [],
    'base-uri': ["'none'"],
    'form-action': ["'none'"],
    'object-src': ["'none'"],
  };
  if (config.adSlot) {
    for (const [k, v] of Object.entries(GPT_CSP)) directives[k].push(...v);
  }
  return Object.entries(directives)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `${k} ${[...new Set(v)].join(' ')}`)
    .join('; ');
}

const policy = buildPolicy();

// Headers that GitHub Pages cannot send. frame-ancestors only works as a header.
const headers = `/*
  Content-Security-Policy: ${policy}; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
  Cross-Origin-Opener-Policy: same-origin
  X-Frame-Options: DENY
  Strict-Transport-Security: max-age=31536000; includeSubDomains
`;

const indexPath = `${root}site/index.html`;
const headersPath = `${root}site/_headers`;
const html = await readFile(indexPath, 'utf8');
const marker = /(<!-- csp:start[^>]*-->\n)[\s\S]*?(<!-- csp:end -->)/;
if (!marker.test(html)) throw new Error('CSP markers missing from site/index.html');
const escaped = policy.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const newHtml = html.replace(marker, `$1<meta http-equiv="Content-Security-Policy" content="${escaped}">\n$2`);

let currentHeaders = '';
try { currentHeaders = await readFile(headersPath, 'utf8'); } catch {}

const stale = newHtml !== html || currentHeaders !== headers;
if (check) {
  if (stale) {
    console.error('Security policy is out of date. Run: node scripts/build.mjs');
    process.exit(1);
  }
  console.log('Security policy is up to date.');
} else {
  await writeFile(indexPath, newHtml);
  await writeFile(headersPath, headers);
  console.log(`CSP: ${policy}`);
}
