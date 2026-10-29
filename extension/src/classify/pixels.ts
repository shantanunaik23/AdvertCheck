// Decoders for the messages websites send to ad platforms ("pixels").
// Endpoint patterns and the location of each event name are adapted from
// Omnibug's provider definitions (MIT, Copyright (c) 2017 Philip Lawrence;
// see THIRD_PARTY_NOTICES.md). Only the event and a few descriptive fields
// are read; identifiers and hashes are never returned.

import type { Action, RequestInfo } from '../types';

export interface Reported {
  companyId: string;
  platform: string;
  eventName: string;
  action: Action;
  item?: string;
  itemCategory?: string;
  searchTerm?: string;
  identityShared: boolean;
}

/** What a decoder reads; optional fields may come back undefined and are dropped. */
interface Decoded {
  eventName: string;
  item?: string | undefined;
  itemCategory?: string | undefined;
  searchTerm?: string | undefined;
  identityShared: boolean;
}

interface Decoder {
  platform: string;
  companyId: string;
  /** Cheap test on the URL, so the request body is only read for known endpoints. */
  match: (url: URL) => boolean;
  decode: (url: URL, body: string | undefined) => Decoded[];
}

// Platform event names, lower-cased with spaces, dashes and underscores removed.
const ACTIONS: Record<string, Action> = {
  pageview: 'page_view',
  pagevisit: 'page_view',
  pageload: 'page_view',
  viewcontent: 'view_item',
  viewitem: 'view_item',
  viewitemlist: 'view_item',
  viewcategory: 'view_item',
  addtocart: 'add_to_cart',
  addcart: 'add_to_cart',
  addtowishlist: 'add_to_wishlist',
  initiatecheckout: 'checkout',
  begincheckout: 'checkout',
  startcheckout: 'checkout',
  checkout: 'checkout',
  addpaymentinfo: 'checkout',
  purchase: 'purchase',
  completepayment: 'purchase',
  placeanorder: 'purchase',
  completeregistration: 'sign_up',
  signup: 'sign_up',
  lead: 'lead',
  generatelead: 'lead',
  submitform: 'lead',
  contact: 'lead',
  search: 'search',
  viewsearchresults: 'search',
  subscribe: 'subscribe',
  starttrial: 'subscribe',
  conversion: 'conversion',
};

export function toAction(eventName: string): Action {
  return ACTIONS[eventName.toLowerCase().replace(/[\s_-]/g, '')] ?? 'other';
}

const MAX_TEXT = 80;
function text(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const s = String(value).trim();
  return s ? s.slice(0, MAX_TEXT) : undefined;
}

function hostIs(url: URL, ...hosts: string[]): boolean {
  return hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}

/** Query parameters from the URL plus a form-encoded body, if any. */
function params(url: URL, body: string | undefined): URLSearchParams {
  const all = new URLSearchParams(url.search);
  if (body && !body.trimStart().startsWith('{') && body.includes('=')) {
    for (const [k, v] of new URLSearchParams(body)) all.append(k, v);
  }
  return all;
}

function json(body: string | undefined): unknown {
  if (!body?.trimStart().startsWith('{')) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function prop(obj: unknown, ...path: string[]): unknown {
  let cur = obj;
  for (const key of path) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

const decoders: Decoder[] = [
  {
    platform: 'Meta Pixel',
    companyId: 'meta',
    match: (u) => hostIs(u, 'facebook.com') && /^\/tr\/?$/.test(u.pathname),
    decode: (u, body) => {
      const p = params(u, body);
      const ev = p.get('ev');
      if (!ev || ev === 'microdata') return [];
      return [
        {
          eventName: ev,
          item: text(p.get('cd[content_name]')),
          itemCategory: text(p.get('cd[content_category]')),
          searchTerm: text(p.get('cd[search_string]')),
          identityShared: [...p.keys()].some((k) => /^ud\[(em|ph)\]$/.test(k)),
        },
      ];
    },
  },
  {
    platform: 'TikTok Pixel',
    companyId: 'bytedance_inc',
    match: (u) => hostIs(u, 'analytics.tiktok.com') && /^\/api\/v\d\/(pixel|track)/.test(u.pathname),
    decode: (_u, body) => {
      const data = json(body);
      const batch = prop(data, 'batch');
      const items = Array.isArray(batch) ? (batch as unknown[]) : [data];
      return items.flatMap((ev) => {
        const name = text(prop(ev, 'event'));
        if (!name) return [];
        const contents = prop(ev, 'properties', 'contents');
        const first: unknown = Array.isArray(contents) ? (contents as unknown[])[0] : undefined;
        const user = prop(ev, 'context', 'user');
        return [
          {
            eventName: name,
            item: text(prop(ev, 'properties', 'content_name')) ?? text(prop(first, 'content_name')),
            itemCategory: text(prop(ev, 'properties', 'content_category')) ?? text(prop(first, 'content_category')),
            searchTerm: text(prop(ev, 'properties', 'query')),
            identityShared: Boolean(prop(user, 'email') ?? prop(user, 'phone_number') ?? prop(user, 'sha256_email')),
          },
        ];
      });
    },
  },
  {
    platform: 'Google Analytics',
    companyId: 'google',
    // GA4 also runs on first-party domains (server-side tagging), so match the path and a GA4 property ID.
    match: (u) => u.pathname.endsWith('/g/collect') && (u.searchParams.get('tid') ?? '').startsWith('G-'),
    decode: (u, body) => {
      // Batched events arrive as one query string per line in the body.
      const lines = body?.split(/\r?\n/).filter((l) => l.includes('en=')) ?? [];
      const events = u.searchParams.has('en')
        ? [u.searchParams, ...lines.map((l) => new URLSearchParams(l))]
        : lines.map((l) => new URLSearchParams(l));
      return events.flatMap((p) => {
        const en = p.get('en');
        if (!en) return [];
        // Items look like "pr1=idSKU1~nmTrainers~caShoes".
        const pr1 = p.get('pr1') ?? '';
        const field = (code: string) => text(new RegExp(`(?:^|~)${code}([^~]*)`).exec(pr1)?.[1]);
        return [
          {
            eventName: en,
            item: field('nm') ?? text(p.get('ep.item_name')),
            itemCategory: field('ca'),
            searchTerm: text(p.get('ep.search_term')),
            identityShared: u.searchParams.has('em') || p.has('em'),
          },
        ];
      });
    },
  },
  {
    platform: 'Google Ads',
    companyId: 'google',
    match: (u) =>
      hostIs(u, 'googleadservices.com', 'doubleclick.net', 'google.com') &&
      /^\/pagead\/(viewthrough)?conversion\//.test(u.pathname),
    decode: (u) => {
      const ev = /(?:^|;)event=([^;]+)/.exec(u.searchParams.get('data') ?? '')?.[1];
      return [{ eventName: ev ?? 'conversion', identityShared: u.searchParams.has('em') }];
    },
  },
  {
    platform: 'Pinterest Tag',
    companyId: 'pinterest',
    match: (u) => hostIs(u, 'ct.pinterest.com') && /^\/(v3|user)\/?/.test(u.pathname),
    decode: (u, body) => {
      const p = params(u, body);
      const ev = p.get('event');
      if (!ev) return [];
      return [{ eventName: ev, identityShared: /"em"\s*:/.test(p.get('pd') ?? '') }];
    },
  },
  {
    platform: 'Snap Pixel',
    companyId: 'snap_technologies',
    match: (u) => hostIs(u, 'tr.snapchat.com') && u.pathname.startsWith('/p'),
    decode: (u, body) => {
      const p = params(u, body);
      const ev = p.get('ev');
      if (!ev) return [];
      return [{ eventName: ev, identityShared: p.has('u_hem') || p.has('u_hpn') }];
    },
  },
  {
    platform: 'LinkedIn Insight Tag',
    companyId: 'linkedin',
    match: (u) => hostIs(u, 'px.ads.linkedin.com') && /^\/(collect|wa)\/?/.test(u.pathname),
    decode: (u) => [
      { eventName: u.searchParams.has('conversionId') ? 'conversion' : 'page_view', identityShared: false },
    ],
  },
  {
    platform: 'Reddit Pixel',
    companyId: 'reddit',
    match: (u) => hostIs(u, 'reddit.com') && u.pathname === '/rp.gif',
    decode: (u) => {
      const ev = u.searchParams.get('m.customEventName') ?? u.searchParams.get('event');
      return ev ? [{ eventName: ev, identityShared: u.searchParams.has('em') }] : [];
    },
  },
  {
    platform: 'X Pixel',
    companyId: 'twitter',
    match: (u) => hostIs(u, 'analytics.twitter.com', 't.co') && u.pathname.startsWith('/i/adsct'),
    decode: (u) => {
      let names: string[] = [];
      try {
        const parsed: unknown = JSON.parse(u.searchParams.get('events') ?? '[]');
        if (Array.isArray(parsed))
          names = parsed.map((e: unknown) => (Array.isArray(e) ? String(e[0]) : '')).filter(Boolean);
      } catch {
        // Malformed events: fall through to a plain conversion.
      }
      if (!names.length) names = [u.searchParams.has('txn_id') ? 'conversion' : 'page_view'];
      return names.map((eventName) => ({ eventName, identityShared: false }));
    },
  },
  {
    platform: 'Microsoft Advertising',
    companyId: 'microsoft',
    match: (u) => hostIs(u, 'bat.bing.com') && u.pathname.startsWith('/action'),
    decode: (u) => {
      const evt = u.searchParams.get('evt');
      if (!evt) return [];
      const eventName = evt === 'custom' ? (u.searchParams.get('ea') ?? 'custom') : evt;
      return [
        {
          eventName,
          searchTerm: text(u.searchParams.get('ec') === 'search' ? u.searchParams.get('el') : undefined),
          identityShared: false,
        },
      ];
    },
  },
];

/** The decoder for a URL, so callers can fetch the request body only when needed. */
export function findDecoder(url: URL): Decoder | undefined {
  return decoders.find((d) => d.match(url));
}

/** Decodes what a site reported, or [] if the request is not a known pixel. */
export function decodePixel(request: RequestInfo): Reported[] {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return [];
  }
  const decoder = findDecoder(url);
  if (!decoder) return [];
  return decoder.decode(url, request.body).map((r) => {
    const out: Reported = {
      platform: decoder.platform,
      companyId: decoder.companyId,
      eventName: r.eventName,
      action: toAction(r.eventName),
      identityShared: r.identityShared,
    };
    if (r.item) out.item = r.item;
    if (r.itemCategory) out.itemCategory = r.itemCategory;
    if (r.searchTerm) out.searchTerm = r.searchTerm;
    return out;
  });
}
