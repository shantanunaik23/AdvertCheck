import type { BrowserContext, Worker } from '@playwright/test';
import { test, expect } from './fixtures';

// A fake shop page that loads trackers the way real sites do. Every request is
// answered locally by Playwright, so nothing reaches the real companies.
const SHOP = `<!doctype html><title>Shop</title>
<script src="https://connect.facebook.net/en_US/fbevents.js"></script>
<img src="https://www.facebook.com/tr/?id=1&ev=AddToCart&cd[content_name]=Desk%20Lamp&ud[em]=abc123">
<script>
  navigator.sendBeacon('https://analytics.tiktok.com/api/v2/pixel',
    JSON.stringify({ event: 'ViewContent', properties: { content_name: 'Desk Lamp' } }));
</script>`;

async function serveFakeWeb(context: BrowserContext) {
  await context.route(/^https:\/\//, (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'shop.example') return route.fulfill({ contentType: 'text/html', body: SHOP });
    return route.fulfill({ status: 200, body: '' });
  });
}

type Row = Record<string, unknown>;

/** Reads the extension's database from its background worker. */
async function storedEvents(worker: Worker): Promise<Row[]> {
  return worker.evaluate(async () =>
    // Opening a database that does not exist yet would create an empty one
    // and stop the extension from setting it up, so check first.
    !(await indexedDB.databases()).some((d) => d.name === 'ad-mirror')
      ? []
      : new Promise<Row[]>((resolve, reject) => {
          const open = indexedDB.open('ad-mirror');
          open.onerror = () => {
            reject(new Error('open failed'));
          };
          open.onsuccess = () => {
            const db = open.result;
            if (!db.objectStoreNames.contains('events')) {
              resolve([]);
              return;
            }
            const req = db.transaction('events').objectStore('events').getAll();
            req.onsuccess = () => {
              resolve(req.result as Row[]);
            };
          };
        }),
  );
}

test('records trackers, what the shop reported, the ad click and a search', async ({ context, extensionId }) => {
  expect(extensionId).toBeTruthy();
  await serveFakeWeb(context);
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error('no background worker');

  const page = await context.newPage();
  await page.goto('https://shop.example/lamp?gclid=test-click');
  await page.goto('https://www.google.com/search?q=desk+lamp');

  await expect.poll(async () => (await storedEvents(worker)).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(6);
  const rows = await storedEvents(worker);
  const pick = (r: Row) => {
    const { id: _id, ts: _ts, ...rest } = r;
    return rest;
  };

  expect(rows.map(pick)).toEqual(
    expect.arrayContaining([
      { kind: 'ad_click', site: 'shop.example', companyId: 'google', platform: 'Google Ads', certain: true },
      { kind: 'tracker', site: 'shop.example', companyId: 'meta', category: 'ad' },
      expect.objectContaining({
        kind: 'reported',
        site: 'shop.example',
        platform: 'Meta Pixel',
        action: 'add_to_cart',
        item: 'Desk Lamp',
        identityShared: true,
      }),
      expect.objectContaining({ kind: 'reported', platform: 'TikTok Pixel', action: 'view_item', item: 'Desk Lamp' }),
      { kind: 'search', site: 'google.com', engine: 'Google', query: 'desk lamp' },
    ]),
  );
  // The hashed email was detected but never stored.
  expect(JSON.stringify(rows)).not.toContain('abc123');
  // Nothing beyond the reviewed fields is kept: no full URLs.
  expect(JSON.stringify(rows)).not.toContain('https://');
});
