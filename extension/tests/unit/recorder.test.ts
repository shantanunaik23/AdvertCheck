import { beforeEach, describe, expect, it } from 'vitest';
import { Recorder } from '../../src/recorder';
import { DEFAULT_SETTINGS, type Settings } from '../../src/store/settings';
import type { AdEvent, ReportedEvent, TrackerEvent } from '../../src/types';

const isTracker = (e: AdEvent): e is TrackerEvent => e.kind === 'tracker';
const isReported = (e: AdEvent): e is ReportedEvent => e.kind === 'reported';

describe('Recorder', () => {
  let settings: Settings;
  let recorded: AdEvent[];
  let badges: Map<number, number>;
  let recorder: Recorder;
  const TAB = 7;

  beforeEach(() => {
    settings = { ...DEFAULT_SETTINGS };
    recorded = [];
    badges = new Map();
    recorder = new Recorder({
      now: () => 1000,
      settings: () => settings,
      record: (e) => recorded.push(...e),
      onCompanies: (tab, n) => badges.set(tab, n),
      onTabsChanged: () => undefined,
    });
  });

  const visit = (url: string) => {
    recorder.handle(TAB, { url, type: 'main_frame' });
  };
  const load = (url: string, type = 'script', body?: string) => {
    recorder.handle(TAB, { url, type, ...(body !== undefined && { body }) });
  };

  it('records each tracking company once per page and updates the badge', () => {
    visit('https://www.shop.example/');
    load('https://connect.facebook.net/en_US/fbevents.js');
    load('https://www.facebook.com/tr/?ev=PageView');
    load('https://securepubads.g.doubleclick.net/tag/js/gpt.js');
    load('https://tpc.googlesyndication.com/x.js');
    expect(recorded.filter(isTracker).map((e) => e.companyId)).toEqual(['meta', 'google']);
    expect(badges.get(TAB)).toBe(2);

    visit('https://news.example/');
    expect(badges.get(TAB)).toBe(0);
    load('https://connect.facebook.net/en_US/fbevents.js');
    expect(recorded.filter((e) => e.kind === 'tracker')).toHaveLength(3);
  });

  it('records what the site reported, once per distinct event and item', () => {
    visit('https://shop.example/product');
    load('https://www.facebook.com/tr/?ev=PageView', 'image');
    load('https://www.facebook.com/tr/?ev=PageView', 'image');
    load('https://www.facebook.com/tr/?ev=AddToCart&cd[content_name]=Lamp', 'image');
    load('https://www.facebook.com/tr/?ev=AddToCart&cd[content_name]=Lamp', 'image');
    load('https://www.facebook.com/tr/?ev=AddToCart&cd[content_name]=Rug', 'image');
    const reported = recorded.filter(isReported);
    expect(reported.map((e) => `${e.action}:${e.item ?? ''}`)).toEqual([
      'page_view:',
      'add_to_cart:Lamp',
      'add_to_cart:Rug',
    ]);
    expect(reported[1]).toMatchObject({ site: 'shop.example', companyId: 'meta', ts: 1000 });
  });

  it('ignores the site loading its own files', () => {
    visit('https://www.bing.com/search?q=maps');
    load('https://www.bing.com/sa/simg/sprite.png', 'image');
    expect(recorded.filter((e) => e.kind === 'tracker')).toEqual([]);
  });

  it('counts a pixel on the site’s own domain (server-side tagging) as reporting to Google', () => {
    visit('https://shop.example/');
    load('https://shop.example/g/collect?v=2&tid=G-XYZ&en=purchase', 'ping');
    expect(recorded).toMatchObject([
      { kind: 'tracker', companyId: 'google' },
      { kind: 'reported', companyId: 'google', action: 'purchase' },
    ]);
  });

  it('records ad clicks and searches from the page address', () => {
    visit('https://hotel.example/?gclid=abc');
    visit('https://www.google.com/search?q=cheap+flights');
    expect(recorded).toEqual([
      { kind: 'ad_click', ts: 1000, site: 'hotel.example', companyId: 'google', platform: 'Google Ads', certain: true },
      { kind: 'search', ts: 1000, site: 'google.com', engine: 'Google', query: 'cheap flights' },
    ]);
  });

  it('leaves out search words when the user turns them off', () => {
    settings.recordSearchWords = false;
    visit('https://www.google.com/search?q=private+thing');
    expect(recorded).toEqual([{ kind: 'search', ts: 1000, site: 'google.com', engine: 'Google' }]);
  });

  it('records nothing while paused or on excluded sites', () => {
    settings.paused = true;
    visit('https://hotel.example/?gclid=abc');
    load('https://connect.facebook.net/x.js');
    settings.paused = false;
    settings.excludedSites = ['bank.example'];
    visit('https://bank.example/?gclid=abc');
    load('https://connect.facebook.net/x.js');
    expect(recorded).toEqual([]);
  });

  it('ignores requests not tied to a tab', () => {
    recorder.handle(-1, { url: 'https://connect.facebook.net/x.js', type: 'script' }, 'https://shop.example/');
    expect(recorded).toEqual([]);
  });

  it('falls back to the requesting page when the page load was missed (e.g. after a restart)', () => {
    recorder.handle(TAB, { url: 'https://connect.facebook.net/x.js', type: 'script' }, 'https://www.shop.example/');
    expect(recorded).toMatchObject([{ kind: 'tracker', site: 'shop.example', companyId: 'meta' }]);
  });

  it('restores tab state so a restarted worker does not double count', () => {
    recorder.restore({ [TAB]: { site: 'shop.example', startedAt: 0, companies: ['meta'], reported: [] } });
    load('https://connect.facebook.net/x.js');
    expect(recorded).toEqual([]);
  });
});

describe('Recorder pages', () => {
  it('ignores browser and extension pages', () => {
    const recorded: AdEvent[] = [];
    const recorder = new Recorder({
      now: () => 0,
      settings: () => DEFAULT_SETTINGS,
      record: (e) => recorded.push(...e),
      onCompanies: () => undefined,
      onTabsChanged: () => undefined,
    });
    recorder.handle(1, { url: 'chrome-extension://abc/welcome.html?gclid=x', type: 'main_frame' });
    recorder.handle(1, { url: 'https://connect.facebook.net/x.js', type: 'script' });
    expect(recorded).toEqual([]);
  });
});

describe('Recorder fallback page', () => {
  it('does not treat an extension page as the requesting site', () => {
    const recorded: AdEvent[] = [];
    const recorder = new Recorder({
      now: () => 0,
      settings: () => DEFAULT_SETTINGS,
      record: (e) => recorded.push(...e),
      onCompanies: () => undefined,
      onTabsChanged: () => undefined,
    });
    recorder.handle(1, { url: 'https://connect.facebook.net/x.js', type: 'script' }, 'chrome-extension://abc/');
    expect(recorded).toEqual([]);
  });
});
