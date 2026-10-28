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
  await expect(shop.locator('they-spy-feed')).toHaveCount(0);
});

test('shopping moments pop up with why they matter; the rest waits behind a button', async ({
  context,
  extensionId,
}) => {
  await serveFakeWeb(context);
  await setAlerts(context, extensionId, true);

  const shop = await context.newPage();
  await shop.goto('https://shop.example/lamp');
  const feed = shop.locator('they-spy-feed');

  // Alerts for the big moments, with an explanation.
  const basket = feed.getByRole('group', { name: 'Facebook now knows you added “Desk Lamp” to your basket' });
  await expect(basket).toBeVisible();
  await expect(basket).toContainText('still thinking about it?');
  await expect(feed.getByRole('group', { name: 'This site just gave Facebook your email address' })).toBeVisible();
  expect(await axeViolations(shop, 'they-spy-feed')).toEqual([]);

  // Alerts stay while you read them, and can be dismissed.
  await basket.hover();
  await basket.getByRole('button', { name: 'Dismiss' }).click();
  await expect(basket).toHaveCount(0);

  // Everything else is one click away.
  await feed.getByRole('button', { name: /ad companies are watching this page\. Show details/ }).click();
  await expect(feed.getByRole('heading', { name: /ad companies are watching this page/ })).toBeVisible();
  await expect(feed.getByText('Every one of them gets:')).toBeVisible();
  await expect(feed.getByText('Which website you are on')).toHaveCount(1);
  const knowMore = feed.getByRole('listitem').filter({ hasText: 'also knows:' });
  await expect(knowMore.first()).toContainText('Facebook also knows:');
  await expect(knowMore.first()).toContainText('Your email address (scrambled)');
  await expect(knowMore.filter({ hasText: 'TikTok' })).toContainText('You looked at “Desk Lamp”');
  expect(await axeViolations(shop, 'they-spy-feed')).toEqual([]);

  await feed.getByRole('button', { name: 'Minimise' }).click();
  await expect(feed.getByRole('button', { name: /Show details/ })).toBeVisible();

  // Switching it off removes the script from new pages.
  await setAlerts(context, extensionId, false);
  await shop.reload();
  await shop.waitForTimeout(1500);
  await expect(shop.locator('they-spy-feed')).toHaveCount(0);
});
