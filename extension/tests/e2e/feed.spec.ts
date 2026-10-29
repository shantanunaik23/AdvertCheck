import type { BrowserContext } from '@playwright/test';
import { test, expect } from './fixtures';
import { axeViolations, backgroundWorker, seedEvents, serveFakeWeb } from './helpers';

async function setAlerts(context: BrowserContext, extensionId: string, on: boolean, sleepOnIt = false) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dashboard.html`);
  const toggle = page.getByRole('switch', { name: 'Show alerts on websites' });
  if (on) await toggle.check();
  else await toggle.uncheck();
  if (on && sleepOnIt) await page.getByRole('switch', { name: '“Sleep on it” reminders' }).check();
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

test('an ad click is linked to what you looked at earlier, and "Sleep on it" is optional', async ({
  context,
  extensionId,
}) => {
  await serveFakeWeb(context);
  // Two days ago, the shop told Facebook you looked at a lamp.
  await seedEvents(backgroundWorker(context), [
    {
      kind: 'reported',
      ts: Date.now() - 2 * 24 * 60 * 60 * 1000,
      site: 'shop.example',
      companyId: 'meta',
      platform: 'Meta Pixel',
      eventName: 'ViewContent',
      action: 'view_item',
      item: 'Brass desk lamp',
      identityShared: false,
    },
  ]);
  await setAlerts(context, extensionId, true);

  const shop = await context.newPage();
  await shop.goto('https://shop.example/lamp?gclid=retargeted');
  const feed = shop.locator('they-spy-feed');
  const followed = feed.getByRole('group', { name: 'This Google Ads ad probably followed you here' });
  await expect(followed).toBeVisible();
  await expect(followed).toContainText('You looked at “Brass desk lamp” on shop.example 2 days ago.');

  // No nudge unless asked for…
  const basket = feed.getByRole('group', { name: /added “Desk Lamp” to your basket/ });
  await expect(basket).toBeVisible();
  await expect(basket).not.toContainText('Sleep on it?');

  // …and there when switched on.
  await setAlerts(context, extensionId, true, true);
  await shop.goto('https://shop.example/lamp');
  await expect(feed.getByRole('group', { name: /added “Desk Lamp” to your basket/ })).toContainText('Sleep on it?');
  expect(await axeViolations(shop, 'they-spy-feed')).toEqual([]);
});
