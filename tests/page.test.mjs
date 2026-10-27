// End-to-end checks in a real browser. Run: node tests/page.test.mjs
// Starts the local preview server, so the strict headers are applied too.
// Set SCREENSHOTS=dir to save screenshots.

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// require() also finds a globally installed Playwright via NODE_PATH.
const { chromium } = createRequire(import.meta.url)('playwright');

const root = fileURLToPath(new URL('..', import.meta.url));
const port = 8765;
const url = `http://127.0.0.1:${port}/`;
const shots = process.env.SCREENSHOTS;

const server = spawn(process.execPath, ['scripts/serve.mjs', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => server.stdout.once('data', r));

const browser = await chromium.launch();
let failures = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL ${name}\n     ${err.message}`);
  }
}

async function openPage(opts = {}, setup) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
  page.on('pageerror', (e) => problems.push(e.message));
  const external = [];
  page.on('request', (r) => { if (!r.url().startsWith(url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  if (setup) await setup(context);
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('summary-id').textContent !== '…');
  await page.waitForFunction(() => document.getElementById('bait-result').textContent !== 'Checking…');
  return { context, page, problems, external };
}

await test('loads with no errors, no CSP violations and no outside requests', async () => {
  const { context, page, problems, external } = await openPage();
  assert.deepEqual(problems, []);
  assert.deepEqual(external, []);
  assert.match(await page.textContent('#summary-sentence'), /^Someone on /);
  assert.match(await page.textContent('#summary-id'), /^[0-9a-f]{8,12}$/);
  assert.ok(await page.locator('.row').count() >= 20, 'expected all signal rows');
  assert.equal(await page.textContent('#audit-badge'), 'Nothing leaves your browser');
  if (shots) {
    await mkdir(shots, { recursive: true });
    await page.screenshot({ path: `${shots}/desktop-light.png`, fullPage: true });
  }
  await context.close();
});

await test('fingerprint ID is stable across fresh browser contexts', async () => {
  const a = await openPage();
  const b = await openPage();
  assert.equal(await a.page.textContent('#summary-id'), await b.page.textContent('#summary-id'));
  await a.context.close();
  await b.context.close();
});

await test('blocks injected inline script (CSP works)', async () => {
  const { context, page } = await openPage();
  const ran = await page.evaluate(() => new Promise((resolve) => {
    window.__injected = false;
    const s = document.createElement('script');
    s.textContent = 'window.__injected = true';
    document.body.append(s);
    setTimeout(() => resolve(window.__injected), 100);
  }));
  assert.equal(ran, false);
  await context.close();
});

await test('live check: mixed results are reported and counted', async () => {
  const blockedHosts = ['pagead2.googlesyndication.com', 'connect.facebook.net', 'www.google-analytics.com'];
  const { context, page, problems } = await openPage({}, async (ctx) => {
    await ctx.route(/^https:\/\//, (route) => {
      const host = new URL(route.request().url()).host;
      if (blockedHosts.includes(host)) return route.abort('blockedbyclient');
      return route.fulfill({ status: 200, body: '' });
    });
  });
  await page.click('#live-run');
  await page.waitForSelector('#live-summary:not([hidden])');
  const summary = await page.textContent('#live-summary');
  assert.match(summary, /^3 of 12 servers were blocked/);
  assert.equal(await page.locator('.probe[data-state="blocked"]').count(), 3);
  assert.equal(await page.locator('.probe[data-state="reachable"]').count(), 9);
  assert.match(await page.textContent('#audit-badge'), /outside servers? contacted/);
  assert.equal(await page.locator('#live-intro').isHidden(), true, 'intro and button should hide after the check');
  assert.deepEqual(problems.filter((p) => !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(p)), []);
  if (shots) await page.screenshot({ path: `${shots}/desktop-after-check.png`, fullPage: true });
  await context.close();
});

await test('live check: offline is reported as unreliable, not as protected', async () => {
  const { context, page } = await openPage({}, async (ctx) => {
    await ctx.route(/^https:\/\//, (route) => route.abort('internetdisconnected'));
  });
  await page.click('#live-run');
  await page.waitForSelector('#live-summary:not([hidden])');
  assert.match(await page.textContent('#live-summary'), /may be offline/);
  assert.equal(await page.locator('#probe-list').isHidden(), true);
  await context.close();
});

await test('phone width has no horizontal scroll', async () => {
  const { context, page } = await openPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 0, `page is ${overflow}px too wide`);
  if (shots) await page.screenshot({ path: `${shots}/phone-dark.png`, fullPage: true });
  await context.close();
});

await browser.close();
server.kill();
if (failures) { console.log(`\n${failures} failed`); process.exit(1); }
console.log('\nAll checks passed.');
