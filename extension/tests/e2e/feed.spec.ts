import type { BrowserContext } from '@playwright/test';
import { test, expect } from './fixtures';
import { axeViolations, serveFakeWeb } from './helpers';

async function setAlerts(context: BrowserContext, extensionId: string, on: boolean) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  const toggle = page.getByRole('switch', { name: 'Show alerts on websites' });
  if (on) await toggle.check();
  else await toggle.uncheck();
  // The background registers or removes the page script when the setting changes.
  await page.waitForTimeout(500);
  await page.close();
}

test('no alerts on websites unless switched on', async ({ context }) => {
  await serveFakeWeb(context);
  const shop = await context.newPage();
  await shop.goto('https://shop.example/lamp');
  await shop.waitForTimeout(1500);
  await expect(shop.locator('ad-mirror-feed')).toHaveCount(0);
});

test('when switched on, a panel on the page says what each company was sent', async ({ context, extensionId }) => {
  await serveFakeWeb(context);
  await setAlerts(context, extensionId, true);

  const shop = await context.newPage();
  await shop.goto('https://shop.example/lamp');
  const feed = shop.locator('ad-mirror-feed');
  await expect(feed.getByRole('heading', { name: /companies got data from this page/ })).toBeVisible();
  // The basics are said once for everyone.
  await expect(feed.getByText('All of them got:')).toBeVisible();
  await expect(feed.getByText('Which website you are on')).toHaveCount(1);
  // Companies told more are listed, the one that got the email first.
  const told = feed.getByRole('listitem').filter({ hasText: 'was also told:' });
  await expect(told.first()).toContainText('Facebook was also told:');
  await expect(told.first()).toContainText('You added “Desk Lamp” to your basket');
  await expect(told.first()).toContainText('Your email address (in code)');
  await expect(told.filter({ hasText: 'TikTok' })).toContainText('You looked at “Desk Lamp”');

  // Accessible, judged on the panel only (the fake shop page is not ours).
  const violations = await axeViolations(shop, 'ad-mirror-feed');
  expect(violations).toEqual([]);

  // Minimise to a small button, and back.
  await feed.getByRole('button', { name: 'Minimise' }).click();
  await feed.getByRole('button', { name: /Show details/ }).click();
  await expect(feed.getByRole('heading', { name: /companies got data/ })).toBeVisible();

  // Switching it off removes the script from new pages.
  await setAlerts(context, extensionId, false);
  await shop.reload();
  await shop.waitForTimeout(1500);
  await expect(shop.locator('ad-mirror-feed')).toHaveCount(0);
});
