import { test, expect } from './fixtures';
import { backgroundWorker, serveFakeWeb, storedEvents, type Row } from './helpers';

test('records trackers, what the shop reported, the ad click and a search', async ({ context, extensionId }) => {
  expect(extensionId).toBeTruthy();
  await serveFakeWeb(context);
  const worker = backgroundWorker(context);

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
