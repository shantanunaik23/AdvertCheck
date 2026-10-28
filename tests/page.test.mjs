// End-to-end checks in a real browser. Run: node tests/page.test.mjs
// Starts the local preview server, so the strict headers are applied too.
// Set SCREENSHOTS=dir to save screenshots.

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// require() also finds a globally installed Playwright via NODE_PATH.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

const root = fileURLToPath(new URL('..', import.meta.url));
const port = 8765;
const url = `http://127.0.0.1:${port}/`;
const shots = process.env.SCREENSHOTS;
if (shots) await mkdir(shots, { recursive: true });

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
    console.log(`FAIL ${name}\n     ${err.message.split('\n').join('\n     ')}`);
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
  if (setup) await setup(context, page);
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('summary-id').textContent !== '…');
  await page.waitForFunction(() => document.getElementById('verdict').dataset.level !== 'pending');
  return { context, page, problems, external };
}

async function axe(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')})`);
}

// Pretends to be a visitor with an ad blocker: hides the bait like a cosmetic filter would.
async function withBlocker(_context, page) {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync('.adsbox { display: none !important; }');
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    });
  });
}

async function withGpc(_context, page) {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }));
}

await test('loads with no errors, no CSP violations and no outside requests', async () => {
  const { context, page, problems, external } = await openPage();
  assert.deepEqual(problems, []);
  assert.deepEqual(external, []);
  assert.match(await page.textContent('#summary-id'), /^[0-9a-f]{8,12}$/);
  assert.notEqual(await page.textContent('#fact-device'), '…');
  assert.notEqual(await page.textContent('#fact-browser'), '…');
  assert.ok(await page.locator('.row').count() >= 20, 'expected all signal rows');
  assert.equal(await page.textContent('#audit-text'), 'Nothing has left your browser');
  if (shots) await page.screenshot({ path: `${shots}/desktop-light.png`, fullPage: true });
  await context.close();
});

await test('unprotected browser gets a clear verdict and a fix for each failed check', async () => {
  const { context, page } = await openPage();
  assert.equal(await page.getAttribute('#verdict', 'data-level'), 'bad');
  assert.equal(await page.textContent('#verdict-title'), 'Advertisers can easily track this browser');
  assert.match(await page.textContent('#verdict-detail'), /passed 0 of 3 .* in Chrome/);
  for (const id of ['check-blocker', 'check-fingerprint', 'check-gpc']) {
    assert.equal(await page.getAttribute(`#${id}`, 'data-state'), 'fail', id);
    assert.equal(await page.textContent(`#${id} .fix summary`), 'How to fix this in Chrome', id);
  }
  await page.click('#check-blocker .fix summary');
  assert.ok(await page.locator('#check-blocker .fix-steps li').count() >= 2);
  assert.equal(await page.getAttribute('#check-blocker .step-link', 'href'), 'https://ublockorigin.com/');
  await context.close();
});

await test('ad blocker and privacy signal are recognised as protection', async () => {
  const { context, page } = await openPage({}, async (ctx, p) => { await withBlocker(ctx, p); await withGpc(ctx, p); });
  assert.equal(await page.getAttribute('#check-blocker', 'data-state'), 'pass');
  assert.equal(await page.getAttribute('#check-gpc', 'data-state'), 'pass');
  assert.equal(await page.locator('#check-blocker .fix').count(), 0, 'no fix needed when protected');
  assert.equal(await page.getAttribute('#verdict', 'data-level'), 'warn');
  assert.match(await page.textContent('#verdict-detail'), /passed 2 of 3/);
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

await test('server check: mixed results are reported, counted and update the verdict', async () => {
  const blockedHosts = ['pagead2.googlesyndication.com', 'connect.facebook.net', 'www.google-analytics.com'];
  const { context, page, problems } = await openPage({}, async (ctx) => {
    await ctx.route(/^https:\/\//, (route) => {
      const host = new URL(route.request().url()).host;
      if (blockedHosts.includes(host)) return route.abort('blockedbyclient');
      return route.fulfill({ status: 200, body: '' });
    });
  });
  await page.click('#live-run');
  await page.waitForSelector('#live-intro', { state: 'hidden' });
  assert.match(await page.textContent('#live-summary'), /^3 of 12 servers were blocked/);
  assert.equal(await page.getAttribute('#check-servers', 'data-state'), 'partial');
  assert.equal(await page.locator('.probe[data-state="blocked"]').count(), 3);
  assert.equal(await page.locator('.probe[data-state="reachable"]').count(), 9);
  assert.match(await page.textContent('#audit-text'), /servers? contacted/);
  assert.match(await page.textContent('#verdict-detail'), /passed 0 of 4/);
  assert.equal(await page.locator('#check-servers .fix').count(), 1);
  assert.deepEqual(problems.filter((p) => !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(p)), []);
  if (shots) {
    await page.click('#check-servers .fix summary');
    await page.locator('#checkup').screenshot({ path: `${shots}/checkup-after-check.png` });
  }
  await context.close();
});

await test('server check: offline is reported as unreliable, not as protected', async () => {
  const { context, page } = await openPage({}, async (ctx) => {
    await ctx.route(/^https:\/\//, (route) => route.abort('internetdisconnected'));
  });
  await page.click('#live-run');
  await page.waitForSelector('#live-intro', { state: 'hidden' });
  assert.match(await page.textContent('#live-summary'), /may be offline/);
  assert.equal(await page.locator('#probe-list').isHidden(), true);
  assert.equal(await page.getAttribute('#check-servers', 'data-state'), 'info');
  assert.match(await page.textContent('#verdict-detail'), /of 3 /, 'an unreliable check must not count');
  await context.close();
});

await test('every outside link is https and opens safely', async () => {
  const { context, page } = await openPage();
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
  const links = await page.$$eval('a[href^="http"]', (as) => as.map((a) => ({ href: a.href, rel: a.rel, target: a.target })));
  assert.ok(links.length >= 15, `expected many links, found ${links.length}`);
  for (const l of links) {
    assert.match(l.href, /^https:\/\//, l.href);
    assert.match(l.rel, /noopener/, l.href);
    assert.equal(l.target, '_blank', l.href);
  }
  await context.close();
});

for (const scheme of ['light', 'dark']) {
  await test(`no accessibility violations (${scheme})`, async () => {
    const { context, page } = await openPage({ colorScheme: scheme });
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    assert.deepEqual(await axe(page), []);
    await context.close();
  });
}

for (const width of [320, 390]) {
  await test(`phone width ${width}px has no horizontal scroll`, async () => {
    const { context, page } = await openPage({ viewport: { width, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `page is ${overflow}px too wide`);
    if (shots && width === 390) {
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = false; }));
      await page.screenshot({ path: `${shots}/phone-dark.png`, fullPage: true });
      await page.screenshot({ path: `${shots}/phone-dark-first-screen.png` });
    }
    await context.close();
  });
}

// Other engines: Firefox, and WebKit standing in for Safari.
const { firefox, webkit } = require('playwright');
for (const [engine, expected] of [[firefox, 'Firefox'], [webkit, 'Safari']]) {
  await test(`works in ${expected}'s engine and gives ${expected} advice`, async () => {
    const other = await engine.launch();
    // Reduced motion turns off transitions, so colours are final when read.
    const context = await other.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
    await page.goto(url);
    await page.waitForFunction(() => document.getElementById('verdict').dataset.level !== 'pending');
    assert.deepEqual(problems, []);
    assert.equal(await page.textContent('#browser-name'), expected);
    const tint = await page.evaluate(() => getComputedStyle(document.getElementById('verdict')).backgroundColor);
    assert.equal(tint, 'rgb(252, 240, 239)', 'verdict panel should show the red status tint (--bad-tint)');
    assert.ok(await page.locator('.row').count() >= 20, 'expected all signal rows');
    const fix = page.locator('#check-blocker .fix summary');
    if (await fix.count()) assert.equal(await fix.textContent(), `How to fix this in ${expected}`);
    if (shots) await page.screenshot({ path: `${shots}/${expected.toLowerCase()}-top.png` });
    await other.close();
  });
}

await browser.close();
server.kill();
if (failures) { console.log(`\n${failures} failed`); process.exit(1); }
console.log('\nAll checks passed.');
