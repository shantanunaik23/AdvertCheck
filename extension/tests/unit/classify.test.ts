import { describe, expect, it } from 'vitest';
import { findClickId } from '../../src/classify/clickIds';
import { decodePixel, toAction } from '../../src/classify/pixels';
import { findSearch } from '../../src/classify/search';
import { isThirdParty, siteOf } from '../../src/classify/site';
import { companyName, lookupTracker } from '../../src/classify/trackers';

describe('site', () => {
  it('uses the registrable domain, including multi-part suffixes', () => {
    expect(siteOf('https://www.shop.example.co.uk/basket')).toBe('example.co.uk');
    expect(siteOf('https://a.b.doubleclick.net/x')).toBe('doubleclick.net');
    expect(siteOf('http://127.0.0.1:8080/')).toBe('127.0.0.1');
  });

  it('treats subdomains of the same site as first-party', () => {
    expect(isThirdParty('https://cdn.example.com/app.js', 'example.com')).toBe(false);
    expect(isThirdParty('https://connect.facebook.net/en_US/fbevents.js', 'example.com')).toBe(true);
  });
});

describe('trackers', () => {
  it('matches parent domains and names the company people know', () => {
    expect(lookupTracker('securepubads.g.doubleclick.net')).toEqual({ companyId: 'google', category: 'ad' });
    expect(lookupTracker('connect.facebook.net')?.companyId).toBe('meta');
    expect(companyName('meta')).toBe('Meta');
    expect(companyName(lookupTracker('px.ads.linkedin.com')?.companyId ?? '')).toBe('LinkedIn');
  });

  it('ignores ordinary sites', () => {
    expect(lookupTracker('www.bbc.co.uk')).toBeNull();
    expect(lookupTracker('localhost')).toBeNull();
  });
});

describe('pixels', () => {
  const decode = (url: string, body?: string) =>
    decodePixel({ url, type: 'image', ...(body !== undefined && { body }) });

  it('Meta: event, product and hashed-email flag (but not the hash)', () => {
    const [r] = decode(
      'https://www.facebook.com/tr/?id=123&ev=AddToCart&cd[content_name]=Trail%20Runner%202&cd[content_category]=Shoes&ud[em]=5e88489',
    );
    expect(r).toEqual({
      platform: 'Meta Pixel',
      companyId: 'meta',
      eventName: 'AddToCart',
      action: 'add_to_cart',
      item: 'Trail Runner 2',
      itemCategory: 'Shoes',
      identityShared: true,
    });
    expect(JSON.stringify(r)).not.toContain('5e88489');
  });

  it('Meta: form-encoded POST body', () => {
    expect(decode('https://www.facebook.com/tr/', 'id=1&ev=Purchase')[0]?.action).toBe('purchase');
  });

  it('TikTok: JSON body, single and batched', () => {
    const one = JSON.stringify({ event: 'ViewContent', properties: { contents: [{ content_name: 'Lamp' }] } });
    expect(decode('https://analytics.tiktok.com/api/v2/pixel', one)).toMatchObject([
      { platform: 'TikTok Pixel', action: 'view_item', item: 'Lamp', identityShared: false },
    ]);
    const batch = JSON.stringify({
      batch: [{ event: 'Pageview' }, { event: 'CompletePayment', context: { user: { email: 'hash' } } }],
    });
    expect(
      decode('https://analytics.tiktok.com/api/v2/pixel/batch', batch).map((r) => [r.action, r.identityShared]),
    ).toEqual([
      ['page_view', false],
      ['purchase', true],
    ]);
  });

  it('Google Analytics 4: URL event, batched body and first-party endpoints', () => {
    const url =
      'https://region1.google-analytics.com/g/collect?v=2&tid=G-ABC123&en=view_item&pr1=idSKU1~nmDesk%20Chair~caFurniture';
    expect(decode(url)).toMatchObject([{ action: 'view_item', item: 'Desk Chair', itemCategory: 'Furniture' }]);
    const batched = decode(
      'https://shop.example/g/collect?v=2&tid=G-ABC123',
      'en=search&ep.search_term=sofa\nen=add_to_cart',
    );
    expect(batched.map((r) => r.action)).toEqual(['search', 'add_to_cart']);
    expect(batched[0]?.searchTerm).toBe('sofa');
    expect(decode('https://shop.example/g/collect?v=2&tid=UA-1')).toEqual([]);
  });

  it('Google Ads, Pinterest, Snap, LinkedIn, Reddit, X and Microsoft', () => {
    const cases: [string, string, string | undefined, string][] = [
      [
        'Google Ads',
        'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/123/?data=event%3Dpurchase',
        undefined,
        'purchase',
      ],
      ['Pinterest Tag', 'https://ct.pinterest.com/v3/?event=addtocart&tid=1', undefined, 'add_to_cart'],
      ['Snap Pixel', 'https://tr.snapchat.com/p', 'pid=1&ev=SIGN_UP&u_hem=abc', 'sign_up'],
      ['LinkedIn Insight Tag', 'https://px.ads.linkedin.com/collect?pid=1&conversionId=9', undefined, 'conversion'],
      ['Reddit Pixel', 'https://alb.reddit.com/rp.gif?id=1&event=Lead', undefined, 'lead'],
      [
        'X Pixel',
        `https://analytics.twitter.com/i/adsct?events=${encodeURIComponent('[["pageview",{}]]')}`,
        undefined,
        'page_view',
      ],
      [
        'Microsoft Advertising',
        'https://bat.bing.com/action/0?ti=1&evt=custom&ea=begin_checkout',
        undefined,
        'checkout',
      ],
    ];
    for (const [platform, url, body, action] of cases) {
      expect(decode(url, body)).toMatchObject([{ platform, action }]);
    }
  });

  it('ignores unrelated requests and keeps unknown event names', () => {
    expect(decode('https://example.com/tr/?ev=AddToCart')).toEqual([]);
    expect(toAction('VideoWatched')).toBe('other');
    expect(toAction('Add To Cart')).toBe('add_to_cart');
  });

  it('caps long text', () => {
    const [r] = decode(`https://www.facebook.com/tr/?ev=ViewContent&cd[content_name]=${'x'.repeat(500)}`);
    expect(r?.item).toHaveLength(80);
  });
});

describe('click IDs', () => {
  it('recognises ad clicks and marks link-only IDs as uncertain', () => {
    expect(findClickId('https://hotel.example/?gclid=abc')).toMatchObject({ platform: 'Google Ads', certain: true });
    expect(findClickId('https://hotel.example/?msclkid=abc')?.companyId).toBe('microsoft');
    expect(findClickId('https://shop.example/?fbclid=abc')).toMatchObject({ companyId: 'meta', certain: false });
    expect(findClickId('https://shop.example/?gclid=')).toBeNull();
    expect(findClickId('https://shop.example/?q=gclid')).toBeNull();
  });
});

describe('search', () => {
  it('reads the words from common engines and shops', () => {
    expect(findSearch('https://www.google.co.uk/search?q=running+shoes&hl=en')).toEqual({
      engine: 'Google',
      query: 'running shoes',
    });
    expect(findSearch('https://www.amazon.com/s?k=desk+lamp')).toEqual({ engine: 'Amazon', query: 'desk lamp' });
    expect(findSearch('https://www.youtube.com/results?search_query=diy')).toEqual({ engine: 'YouTube', query: 'diy' });
    expect(findSearch('https://duckduckgo.com/?q=weather')).toEqual({ engine: 'DuckDuckGo', query: 'weather' });
  });

  it('ignores non-search pages', () => {
    expect(findSearch('https://www.google.com/maps?q=london')).toBeNull();
    expect(findSearch('https://www.google.com/search?q=')).toBeNull();
    expect(findSearch('https://notgoogle.com/search?q=x')).toBeNull();
  });
});
