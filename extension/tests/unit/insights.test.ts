import { describe, expect, it } from 'vitest';
import { computeInterests } from '../../src/insights/interests';
import { computePatterns, READY_ENGAGEMENTS } from '../../src/insights/patterns';
import { TOPICS, topicsForSite, topicsForText } from '../../src/insights/topics';
import type { AdEvent } from '../../src/types';

const DAY = 86_400_000;
// A Wednesday, 8pm local time.
const WED_8PM = new Date(2026, 9, 21, 20, 0, 0).getTime();

describe('topics', () => {
  it('has unique ids and plain names', () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
    expect(TOPICS.find((t) => t.id === 'health')?.sensitive).toBe(true);
  });

  it('maps known sites', () => {
    expect(topicsForSite('booking.com')).toEqual(['travel']);
    expect(topicsForSite('unknown.example')).toEqual([]);
  });

  it('matches short words whole and longer words at the start', () => {
    expect(topicsForText('cheap car insurance')).toEqual(expect.arrayContaining(['cars', 'money']));
    expect(topicsForText('new carpet')).not.toContain('cars');
    expect(topicsForText('cat food')).toContain('pets');
    expect(topicsForText('category page')).not.toContain('pets');
    expect(topicsForText('Running shoes')).toEqual(expect.arrayContaining(['fitness', 'fashion']));
    expect(topicsForText('holidays in Spain')).toContain('travel');
  });
});

describe('interests', () => {
  it('scores topics from searches, sites, reported actions and ad clicks, with evidence', () => {
    const events: AdEvent[] = [
      { kind: 'search', ts: WED_8PM, site: 'google.com', engine: 'Google', query: 'cheap flights to rome' },
      { kind: 'tracker', ts: WED_8PM + 1, site: 'booking.com', companyId: 'google', category: 'ad' },
      { kind: 'tracker', ts: WED_8PM + 2, site: 'booking.com', companyId: 'meta', category: 'ad' },
      {
        kind: 'ad_click',
        ts: WED_8PM + 3,
        site: 'expedia.co.uk',
        companyId: 'google',
        platform: 'Google Ads',
        certain: true,
      },
      {
        kind: 'reported',
        ts: WED_8PM + 4,
        site: 'shop.example',
        companyId: 'meta',
        platform: 'Meta Pixel',
        eventName: 'AddToCart',
        action: 'add_to_cart',
        item: 'Hard shell suitcase',
        identityShared: false,
      },
    ];
    const [top] = computeInterests(events);
    expect(top).toMatchObject({
      id: 'travel',
      name: 'Travel and holidays',
      evidence: { searches: 1, sites: 2, actions: 1, adClicks: 1 },
      examples: ['cheap flights to rome', 'Hard shell suitcase'],
    });
    // search 3 + 2 site-days + ad click 4 + basket 4 = 13
    expect(top?.score).toBe(13);
    expect(top?.strength).toBe('medium');
  });

  it('counts a site visit once per day, not per tracker', () => {
    const visit = (ts: number): AdEvent => ({
      kind: 'tracker',
      ts,
      site: 'asos.com',
      companyId: 'meta',
      category: 'ad',
    });
    const sameDay = computeInterests([visit(WED_8PM), visit(WED_8PM + 1000), visit(WED_8PM + 2000)]);
    expect(sameDay).toEqual([]);
    const threeDays = computeInterests([visit(WED_8PM), visit(WED_8PM + DAY), visit(WED_8PM + 2 * DAY)]);
    expect(threeDays[0]).toMatchObject({ id: 'fashion', score: 3, strength: 'light' });
  });

  it('ignores page views and searches without words', () => {
    const events: AdEvent[] = [
      { kind: 'search', ts: WED_8PM, site: 'google.com', engine: 'Google' },
      {
        kind: 'reported',
        ts: WED_8PM,
        site: 'shop.example',
        companyId: 'meta',
        platform: 'Meta Pixel',
        eventName: 'PageView',
        action: 'page_view',
        item: 'Dog bed',
        identityShared: false,
      },
    ];
    expect(computeInterests(events)).toEqual([]);
  });
});

describe('patterns', () => {
  const click = (ts: number): AdEvent => ({
    kind: 'ad_click',
    ts,
    site: 'asos.com',
    companyId: 'meta',
    platform: 'Facebook or Instagram',
    certain: false,
  });

  it('waits for enough data', () => {
    const p = computePatterns([click(WED_8PM), click(WED_8PM + DAY)]);
    expect(p.ready).toBe(false);
    expect(p.engagements).toBe(2);
  });

  it('is ready after two weeks or enough engagements', () => {
    expect(computePatterns([click(WED_8PM), click(WED_8PM + 14 * DAY)]).ready).toBe(true);
    const many = Array.from({ length: READY_ENGAGEMENTS }, (_, i) => click(WED_8PM + i * 60_000));
    expect(computePatterns(many).ready).toBe(true);
  });

  it('finds the busiest part of the week, by local time', () => {
    const events = [click(WED_8PM), click(WED_8PM + DAY), click(WED_8PM + 2 * DAY - 10 * 3_600_000)];
    const p = computePatterns(events);
    expect(p.grid[3]?.[20]).toBe(1);
    expect(p.grid[4]?.[20]).toBe(1);
    expect(p.busiest).toEqual({ label: 'Weekday evenings', share: 2 / 3 });
    expect(p.adClicksByTopic).toEqual([{ topicId: 'fashion', count: 3 }]);
    expect(p.adClicksByPlatform).toEqual([{ platform: 'Facebook or Instagram', count: 3 }]);
  });

  it('does not name a busiest time when engagement is spread out', () => {
    const spread = [0, 6, 12, 18].map((h) => click(new Date(2026, 9, 21, h).getTime()));
    expect(computePatterns(spread).busiest).toBeNull();
  });
});
