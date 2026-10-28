// Renders the website's logo (site/favicon.svg) to the PNG sizes browsers
// need for the toolbar and store. Run after changing the logo:
//   node scripts/make-icons.mjs

import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const svg = await readFile(new URL('../../site/favicon.svg', import.meta.url), 'utf8');
const out = new URL('../public/icon/', import.meta.url);
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
for (const size of [16, 32, 48, 128]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({
    path: new URL(`${size}.png`, out).pathname.replace(/^\/([A-Z]:)/, '$1'),
    omitBackground: true,
  });
  await page.close();
}
await browser.close();
console.log('Icons written to public/icon/');
