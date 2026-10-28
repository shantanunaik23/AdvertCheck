// The on-page alert feed (ADR 0005): who got what from the current page,
// in plain words. Built in the background script; the content script only
// renders it.

import { toldPhrase } from './ui/format';
import { who } from './ui/who';
import type { AdEvent } from './types';

/** What any ad company gets just by being contacted from a page. */
export const BASIC_DATA = ['Which website you are on', 'Your rough location', 'Your device and browser'] as const;

export interface FeedItem {
  companyId: string;
  /** Brand name, or "An ad company". */
  who: string;
  /** Plain descriptions of what was sent, oldest first. */
  sent: string[];
  /** The site sent this company the user's email or phone number (in code). */
  email: boolean;
  /** When this item last changed, so the newest shows first. */
  updated: number;
}

export const EMAIL_TEXT = 'Your email address (in code)';

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Adds new records for a page to its feed. Returns a new array, newest first. */
export function applyToFeed(items: readonly FeedItem[], events: readonly AdEvent[]): FeedItem[] {
  const map = new Map(items.map((i) => [i.companyId, { ...i, sent: [...i.sent] }]));
  for (const e of events) {
    if (e.kind !== 'tracker' && e.kind !== 'reported') continue;
    let item = map.get(e.companyId);
    if (!item) {
      item = {
        companyId: e.companyId,
        who: capitalise(who(e.companyId)),
        sent: [...BASIC_DATA],
        email: false,
        updated: e.ts,
      };
      map.set(e.companyId, item);
    }
    if (e.kind === 'reported' && e.action !== 'page_view') {
      const text = `You ${toldPhrase(e)}`;
      if (!item.sent.includes(text)) item.sent.push(text);
      item.updated = e.ts;
    }
    if (e.kind === 'reported' && e.identityShared && !item.email) {
      item.email = true;
      item.sent.push(EMAIL_TEXT);
      item.updated = e.ts;
    }
  }
  return [...map.values()].sort((a, b) => b.updated - a.updated);
}

/** Messages between the background script and the feed content script. */
export type FeedMessage = { type: 'ad-mirror/feed'; items: FeedItem[] } | { type: 'ad-mirror/feed-hello' };
