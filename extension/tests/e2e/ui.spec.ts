import { test, expect } from './fixtures';
import { axeViolations, backgroundWorker, serveFakeWeb, storedEvents } from './helpers';

const VIEWS: [string, string][] = [
  ['overview', 'Your ad mirror'],
  ['companies', 'Who knows about you'],
  ['timeline', 'Timeline'],
  ['interests', 'What advertisers could guess'],
  ['patterns', 'Your patterns'],
  ['settings', 'Settings'],
];

test('dashboard shows what was recorded, and every view is accessible', async ({ context, extensionId }) => {
  await serveFakeWeb(context);
  const worker = backgroundWorker(context);
  const shop = await context.newPage();
  await shop.goto('https://shop.example/lamp?gclid=test-click');
  await expect.poll(async () => (await storedEvents(worker)).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(5);

  const page = await context.newPage();
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [hash, title] of VIEWS) {
      await page.goto(`chrome-extension://${extensionId}/dashboard.html#${hash}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      expect(await axeViolations(page), `${hash} (${scheme})`).toEqual([]);
    }
  }

  await page.goto(`chrome-extension://${extensionId}/dashboard.html#timeline`);
  await expect(page.getByText('shop.example told Meta you added “Desk Lamp” to your basket')).toBeVisible();
  await expect(page.getByText('You clicked a Google Ads ad that led to shop.example')).toBeVisible();

  await page.goto(`chrome-extension://${extensionId}/dashboard.html#overview`);
  await expect(page.getByRole('heading', { name: 'Sites that sent your email or phone number' })).toBeVisible();
});

test('welcome and popup pages are accessible', async ({ context, extensionId }) => {
  const page = await context.newPage();
  for (const path of ['welcome.html', 'popup.html']) {
    await page.goto(`chrome-extension://${extensionId}/${path}`);
    await expect(page.getByRole('button').first()).toBeVisible();
    expect(await axeViolations(page), path).toEqual([]);
  }
});

test('pausing in settings stops recording, and delete removes everything', async ({ context, extensionId }) => {
  await serveFakeWeb(context);
  const worker = backgroundWorker(context);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dashboard.html#settings`);
  await page.getByRole('switch', { name: 'Record while I browse' }).uncheck();
  await expect(page.getByText('Paused. Nothing new is recorded')).toBeVisible();

  const shop = await context.newPage();
  await shop.goto('https://shop.example/?gclid=paused');
  await shop.waitForTimeout(1500);
  expect(await storedEvents(worker)).toEqual([]);

  await page.getByRole('switch', { name: 'Record while I browse' }).check();
  await shop.goto('https://shop.example/?gclid=resumed');
  await expect.poll(async () => (await storedEvents(worker)).length, { timeout: 10_000 }).toBeGreaterThan(0);

  await page.reload();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await page.getByRole('button', { name: 'Yes, delete all records' }).click();
  await expect.poll(async () => (await storedEvents(worker)).length).toBe(0);
});
