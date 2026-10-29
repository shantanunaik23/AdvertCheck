import { describe, expect, it } from 'vitest';
import { followedNote } from '../../src/feed';
import { findFollowed, followedSince, LOOKBACK_MS, whenAgo } from '../../src/insights/followed';
import type { Action, AdClickEvent, AdEvent } from '../../src/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const click: AdClickEvent = {
  kind: 'ad_click',
  ts: NOW,
  site: 'asos.com',
  companyId: 'meta',
  platform: 'Facebook or Instagram',
  certain: false,
};

const seen = (ts: number, action: Action, item: string, site = 'asos.com'): AdEvent => ({
  kind: 'reported',
  ts,
  site,
  companyId: 'meta',
  platform: 'Meta Pixel',
  eventName: action,
  action,
  item,
  identityShared: false,
});

describe('ads that followed you', () => {
  it('links an ad click to the strongest earlier shopping moment on the same site', () => {
    const history = [
      seen(NOW - 5 * DAY, 'view_item', 'Linen shirt'),
      seen(NOW - 3 * DAY, 'add_to_cart', 'Linen shirt'),
      seen(NOW - 1 * DAY, 'view_item', 'Socks'),
    ];
    const f = findFollowed(click, history);
    expect(f?.earlier.action).toBe('add_to_cart');
    expect(f?.daysAgo).toBe(3);
  });

  it('ignores other sites, the visit the click started, and anything too old', () => {
    expect(findFollowed(click, [seen(NOW - DAY, 'add_to_cart', 'Lamp', 'other.example')])).toBeNull();
    expect(findFollowed(click, [seen(NOW + 5_000, 'add_to_cart', 'Lamp')])).toBeNull();
    expect(findFollowed(click, [seen(NOW - 30_000, 'add_to_cart', 'Lamp')])).toBeNull();
    expect(findFollowed(click, [seen(NOW - LOOKBACK_MS - 1, 'add_to_cart', 'Lamp')])).toBeNull();
    expect(findFollowed(click, [seen(NOW - DAY, 'purchase', 'Lamp')])).toBeNull();
  });

  it('lists recent ad clicks that followed you, newest first', () => {
    const events: AdEvent[] = [
      seen(NOW - 4 * DAY, 'view_item', 'Linen shirt'),
      { ...click, ts: NOW - 2 * DAY },
      { ...click, ts: NOW - DAY, site: 'nowhere.example' },
      click,
    ];
    expect(followedSince(events, NOW - 7 * DAY).map((f) => f.click.ts)).toEqual([NOW, NOW - 2 * DAY]);
  });

  it('says it plainly, and says "probably"', () => {
    const f = findFollowed(click, [seen(NOW - 3 * DAY, 'add_to_cart', 'Linen shirt')]);
    if (!f) throw new Error('expected a match');
    const note = followedNote(f);
    expect(note.title).toBe('This Facebook or Instagram link probably followed you here');
    expect(note.why).toMatch(/^You added “Linen shirt” to your basket on asos\.com 3 days ago\./);
    expect(note.why).toMatch(/retargeting/);
    expect([0, 1, 4].map(whenAgo)).toEqual(['earlier today', 'yesterday', '4 days ago']);
  });
});
