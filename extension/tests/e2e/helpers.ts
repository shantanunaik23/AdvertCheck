import type { BrowserContext, Page, Worker } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// A fake shop page that loads trackers the way real sites do. Every request is
// answered locally by Playwright, so nothing reaches the real companies.
const SHOP = `<!doctype html><title>Shop</title>
<script src="https://connect.facebook.net/en_US/fbevents.js"></script>
<img src="https://www.facebook.com/tr/?id=1&ev=AddToCart&cd[content_name]=Desk%20Lamp&ud[em]=abc123">
<script>
  navigator.sendBeacon('https://analytics.tiktok.com/api/v2/pixel',
    JSON.stringify({ event: 'ViewContent', properties: { content_name: 'Desk Lamp' } }));
</script>`;

export async function serveFakeWeb(context: BrowserContext): Promise<void> {
  await context.route(/^https:\/\//, (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'shop.example') return route.fulfill({ contentType: 'text/html', body: SHOP });
    return route.fulfill({ status: 200, body: '' });
  });
}

export type Row = Record<string, unknown>;

export function backgroundWorker(context: BrowserContext): Worker {
  const worker = context.serviceWorkers()[0];
  if (!worker) throw new Error('no background worker');
  return worker;
}

/** Reads the extension's database from its background worker. */
export async function storedEvents(worker: Worker): Promise<Row[]> {
  return worker.evaluate(async () =>
    // Opening a database that does not exist yet would create an empty one
    // and stop the extension from setting it up, so check first.
    !(await indexedDB.databases()).some((d) => d.name === 'they-spy')
      ? []
      : new Promise<Row[]>((resolve, reject) => {
          const open = indexedDB.open('they-spy');
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

/** WCAG 2.2 AA violations on a page, as readable strings. */
export async function axeViolations(page: Page, include?: string): Promise<string[]> {
  const builder = new AxeBuilder({ page });
  if (include) builder.include(include);
  const { violations } = await builder
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`);
}

/** Adds records to the extension's database, creating it the way the extension does if needed. */
export async function seedEvents(worker: Worker, events: Row[]): Promise<void> {
  await worker.evaluate(
    (rows) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('they-spy', 1);
        // Same schema as src/store/db.ts.
        open.onupgradeneeded = () => {
          open.result.createObjectStore('events', { keyPath: 'id', autoIncrement: true }).createIndex('ts', 'ts');
        };
        open.onsuccess = () => {
          const tx = open.result.transaction('events', 'readwrite');
          for (const row of rows) tx.objectStore('events').add(row);
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => {
            reject(new Error('seed failed'));
          };
        };
      }),
    events,
  );
}
