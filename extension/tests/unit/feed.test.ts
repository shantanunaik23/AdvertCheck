import { describe, expect, it } from 'vitest';
import { applyToFeed, BASIC_DATA, EMAIL_TEXT } from '../../src/feed';
import type { AdEvent } from '../../src/types';

const tracker = (ts: number, companyId: string): AdEvent => ({
  kind: 'tracker',
  ts,
  site: 'shop.example',
  companyId,
  category: 'ad',
});

describe('on-page feed', () => {
  it('lists each company once, with the basic data every contacted company gets', () => {
    const feed = applyToFeed([], [tracker(1, 'google'), tracker(2, 'criteo'), tracker(3, 'google')]);
    expect(feed.map((i) => i.who)).toEqual(['An ad company', 'Google']);
    expect(feed[1]?.sent).toEqual([...BASIC_DATA]);
  });

  it('adds what the site reported and the email flag, and moves that company to the top', () => {
    let feed = applyToFeed([], [tracker(1, 'meta'), tracker(2, 'google')]);
    feed = applyToFeed(feed, [
      {
        kind: 'reported',
        ts: 3,
        site: 'shop.example',
        companyId: 'meta',
        platform: 'Meta Pixel',
        eventName: 'AddToCart',
        action: 'add_to_cart',
        item: 'Desk lamp',
        identityShared: true,
      },
    ]);
    expect(feed[0]).toMatchObject({
      who: 'Facebook',
      email: true,
      sent: [...BASIC_DATA, 'You added “Desk lamp” to your basket', EMAIL_TEXT],
    });
    // Shopping moments and email sharing become alerts, with why they matter.
    expect(feed[0]?.highlights.map((h) => [h.kind, h.title])).toEqual([
      ['shopping', 'Facebook now knows you added “Desk lamp” to your basket'],
      ['email', 'This site just gave Facebook your email address'],
    ]);
    expect(feed[0]?.highlights[0]?.why).toMatch(/basket/);
    // Basket and checkout moments can carry the optional "Sleep on it" nudge.
    expect(feed[0]?.highlights[0]?.nudge).toBe(true);
    expect(feed[0]?.highlights[1]?.nudge).toBeUndefined();
    expect(feed[1]?.highlights).toEqual([]);
  });

  it('does not repeat the same thing or list page views', () => {
    const view: AdEvent = {
      kind: 'reported',
      ts: 2,
      site: 'shop.example',
      companyId: 'meta',
      platform: 'Meta Pixel',
      eventName: 'PageView',
      action: 'page_view',
      identityShared: false,
    };
    const feed = applyToFeed(applyToFeed([], [tracker(1, 'meta'), view]), [view]);
    expect(feed[0]?.sent).toEqual([...BASIC_DATA]);
  });
});
