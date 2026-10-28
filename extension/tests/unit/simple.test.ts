import { describe, expect, it } from 'vitest';
import { listOf, trackingLevel, weekSummary, WEEK_MS } from '../../src/insights/simple';
import type { AdEvent } from '../../src/types';

const NOW = 1_800_000_000_000;

describe('simple view', () => {
  it('turns company counts into a traffic light', () => {
    expect([0, 1, 3, 4, 12].map(trackingLevel)).toEqual(['none', 'some', 'some', 'lots', 'lots']);
  });

  it('joins names the way people say them', () => {
    expect(listOf([])).toBe('');
    expect(listOf(['Google'])).toBe('Google');
    expect(listOf(['Google', 'Meta'])).toBe('Google and Meta');
    expect(listOf(['Google', 'Meta', 'TikTok'])).toBe('Google, Meta and TikTok');
  });

  it('summarises only the last seven days', () => {
    const tracker = (ts: number, site: string, companyId: string): AdEvent => ({
      kind: 'tracker',
      ts,
      site,
      companyId,
      category: 'ad',
    });
    const told = (ts: number, item: string, identityShared = false): AdEvent => ({
      kind: 'reported',
      ts,
      site: 'asos.com',
      companyId: 'meta',
      platform: 'Meta Pixel',
      eventName: 'AddToCart',
      action: 'add_to_cart',
      item,
      identityShared,
    });
    const events: AdEvent[] = [
      tracker(NOW - WEEK_MS - 1, 'old.example', 'criteo'),
      told(NOW - WEEK_MS - 1, 'Old jacket', true),
      tracker(NOW - 3000, 'asos.com', 'meta'),
      tracker(NOW - 3000, 'asos.com', 'google'),
      tracker(NOW - 2000, 'bbc.co.uk', 'google'),
      told(NOW - 2000, 'Linen shirt'),
      told(NOW - 1000, 'White trainers', true),
    ];
    const s = weekSummary(events, NOW);
    expect(s.companies).toBe(2);
    expect(s.companyIds).toEqual(['google', 'meta']);
    expect(s.told.map((e) => e.item)).toEqual(['White trainers', 'Linen shirt']);
    expect(s.emailSites).toEqual(['asos.com']);
    expect(s.interests.map((i) => i.id)).toContain('fashion');
  });
});

describe('who', () => {
  it('uses everyday brand names and groups the rest', async () => {
    const { brand, who, whoList } = await import('../../src/ui/who');
    expect(brand('meta')).toBe('Facebook');
    expect(brand('bytedance_inc')).toBe('TikTok');
    expect(brand('amazon_associates')).toBe('Amazon');
    expect(brand('criteo')).toBeNull();
    expect(who('criteo')).toBe('an ad company');
    expect(whoList(['google', 'meta', 'criteo', 'the_trade_desk'])).toBe('Google, Facebook and 2 other ad companies');
    expect(whoList(['criteo'])).toBe('1 ad company');
    expect(whoList(['google', 'meta', 'bytedance_inc', 'amazon', 'criteo'])).toBe(
      'Google, Facebook, TikTok and 2 other ad companies',
    );
    expect(whoList(['google'])).toBe('Google');
  });
});
