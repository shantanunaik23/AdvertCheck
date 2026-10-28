import { test, expect } from './fixtures';
import { axeViolations, backgroundWorker, serveFakeWeb, storedEvents } from './helpers';

const ADVANCED_VIEWS: [string, string][] = [
  ['overview', 'Your ad mirror'],
  ['companies', 'Who knows about you'],
  ['timeline', 'Timeline'],
  ['interests', 'What advertisers could guess'],
  ['patterns', 'Your patterns'],
  ['settings', 'Settings'],
];

test('simple view by default, advanced mode on request, all accessible', async ({ context, extensionId }) => {
  await serveFakeWeb(context);
  const worker = backgroundWorker(context);
  const shop = await context.newPage();
  await shop.goto('https://shop.example/lamp?gclid=test-click');
  await expect.poll(async () => (await storedEvents(worker)).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(5);

  const page = await context.newPage();
  const dashboard = `chrome-extension://${extensionId}/dashboard.html`;
  await page.goto(dashboard);

  // Simple view: plain answers, no side menu.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your week in ads');
  await expect(page.getByText('advertising companies watched what you did online')).toBeVisible();
  await expect(page.getByText('told Facebook you added “Desk Lamp” to your basket')).toBeVisible();
  await expect(page.getByRole('heading', { name: '1 website gave advertisers your email address' })).toBeVisible();
  await expect(page.locator('#nav')).toBeHidden();
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    expect(await axeViolations(page), `simple (${scheme})`).toEqual([]);
  }

  // Advanced mode shows every section, and is remembered.
  await page.getByRole('switch', { name: 'Advanced mode' }).check();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your ad mirror');
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const [hash, title] of ADVANCED_VIEWS) {
      await page.goto(`${dashboard}#${hash}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      expect(await axeViolations(page), `${hash} (${scheme})`).toEqual([]);
    }
  }
  await page.goto(`${dashboard}#timeline`);
  await expect(page.getByText('You clicked a Google Ads ad that led to shop.example')).toBeVisible();

  await page.getByRole('switch', { name: 'Advanced mode' }).uncheck();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your week in ads');
});

test('welcome and popup pages are accessible', async ({ context, extensionId }) => {
  const page = await context.newPage();
  for (const path of ['welcome.html', 'popup.html']) {
    await page.goto(`chrome-extension://${extensionId}/${path}`);
    await expect(page.getByRole('button').first()).toBeVisible();
    expect(await axeViolations(page), path).toEqual([]);
  }
});

test('pausing stops recording, and delete removes everything', async ({ context, extensionId }) => {
  await serveFakeWeb(context);
  const worker = backgroundWorker(context);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  await page.getByRole('button', { name: 'Pause recording' }).click();
  await expect(page.getByText('Recording is paused.')).toBeVisible();

  const shop = await context.newPage();
  await shop.goto('https://shop.example/?gclid=paused');
  await shop.waitForTimeout(1500);
  expect(await storedEvents(worker)).toEqual([]);

  await page.getByRole('button', { name: 'Start recording again' }).click();
  await shop.goto('https://shop.example/?gclid=resumed');
  await expect.poll(async () => (await storedEvents(worker)).length, { timeout: 10_000 }).toBeGreaterThan(0);

  await page.reload();
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await page.getByRole('button', { name: 'Yes, delete all records' }).click();
  await expect.poll(async () => (await storedEvents(worker)).length).toBe(0);
});
