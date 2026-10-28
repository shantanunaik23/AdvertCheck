// The on-page alert feed (ADR 0005): who got what from the current page,
// in plain words. Built in the background script; the content script only
// renders it.

import { toldPhrase } from './ui/format';
import { who } from './ui/who';
import type { Action, AdEvent } from './types';

/** What any ad company gets just by being contacted from a page. */
export const BASIC_DATA = ['Which website you are on', 'Your rough location', 'Your device and browser'] as const;

export const EMAIL_TEXT = 'Your email address (scrambled)';

/** A big moment worth popping up an alert for: shopping, or giving away your email. */
export interface Highlight {
  /** Stable key, so the page shows each alert once. */
  id: string;
  /** "Facebook now knows you added “Desk lamp” to your basket" */
  title: string;
  /** Why it matters, in one plain sentence. */
  why: string;
  kind: 'shopping' | 'email';
}

export interface FeedItem {
  companyId: string;
  /** Brand name, or "An ad company". */
  who: string;
  /** Plain descriptions of what was sent, oldest first. The first three are BASIC_DATA. */
  sent: string[];
  /** The site sent this company the user's email or phone number (scrambled). */
  email: boolean;
  /** Shopping moments and email sharing, oldest first. */
  highlights: Highlight[];
  /** When this item last changed, so the newest shows first. */
  updated: number;
}

// The shopping moments that change what ads you see, and why each matters.
// Kept to well-established practice: retargeting, basket reminders, and
// matching you to your account. See the they-spy-design skill before editing.
const WHY: Partial<Record<Action, string>> = {
  view_item:
    'Just looking is enough. Ads for it, or things like it, can now follow you round other sites to tempt you back.',
  add_to_cart:
    'A full basket says you’re close to buying. Expect “still thinking about it?” ads chasing you round the web.',
  add_to_wishlist: 'Saving it for later tells them you’re tempted. Reminder ads are made for exactly this.',
  checkout: 'You’re at the till. If you don’t finish, expect ads nudging you to come back and pay.',
  purchase: 'They use this to guess what you’ll buy next, and to prove their ads work so shops spend more on them.',
  search: 'Your searches show what you want right now, which is exactly when ads are most likely to get you to buy.',
};

const EMAIL_WHY = 'Now they can link what you do here to your account with them, even if you clear your cookies.';

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Adds new records for a page to its feed. Returns a new array, newest first. */
export function applyToFeed(items: readonly FeedItem[], events: readonly AdEvent[]): FeedItem[] {
  const map = new Map(items.map((i) => [i.companyId, { ...i, sent: [...i.sent], highlights: [...i.highlights] }]));
  for (const e of events) {
    if (e.kind !== 'tracker' && e.kind !== 'reported') continue;
    let item = map.get(e.companyId);
    if (!item) {
      item = {
        companyId: e.companyId,
        who: capitalise(who(e.companyId)),
        sent: [...BASIC_DATA],
        email: false,
        highlights: [],
        updated: e.ts,
      };
      map.set(e.companyId, item);
    }
    if (e.kind !== 'reported') continue;

    if (e.action !== 'page_view') {
      const phrase = toldPhrase(e);
      const text = `You ${phrase}`;
      if (!item.sent.includes(text)) {
        item.sent.push(text);
        item.updated = e.ts;
        const why = WHY[e.action];
        if (why) {
          item.highlights.push({
            id: `${e.companyId}|${text}`,
            title: `${item.who} now knows you ${phrase}`,
            why,
            kind: 'shopping',
          });
        }
      }
    }
    if (e.identityShared && !item.email) {
      item.email = true;
      item.sent.push(EMAIL_TEXT);
      item.updated = e.ts;
      const name = item.who === 'An ad company' ? 'an ad company' : item.who;
      item.highlights.push({
        id: `${e.companyId}|email`,
        title: `This site just gave ${name} your email address`,
        why: EMAIL_WHY,
        kind: 'email',
      });
    }
  }
  return [...map.values()].sort((a, b) => b.updated - a.updated);
}

/** Messages between the background script and the feed content script. */
export type FeedMessage = { type: 'they-spy/feed'; items: FeedItem[] } | { type: 'they-spy/feed-hello' };
