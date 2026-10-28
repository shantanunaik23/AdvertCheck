// Plain-English sentences for records, written for a reading age of about 9.

import { companyName } from '../classify/companies';
import type { Action, AdEvent, ReportedEvent } from '../types';

const q = (s: string) => `“${s}”`;

function reportedPhrase(e: ReportedEvent): string {
  const item = e.item ? q(e.item) : undefined;
  const phrases: Record<Action, string> = {
    page_view: 'visited',
    view_item: item ? `looked at ${item}` : 'looked at a product',
    add_to_cart: item ? `added ${item} to your basket` : 'added something to your basket',
    add_to_wishlist: item ? `saved ${item} for later` : 'saved something for later',
    checkout: 'started to check out',
    purchase: item ? `bought ${item}` : 'bought something',
    sign_up: 'signed up',
    lead: 'filled in a form',
    search: e.searchTerm ? `searched for ${q(e.searchTerm)}` : 'searched the site',
    subscribe: 'subscribed or started a trial',
    conversion: 'did something it counts as a sale or sign-up',
    other: `did ${q(e.eventName)}`,
  };
  return phrases[e.action];
}

/** One sentence describing a record. */
export function describe(e: AdEvent): string {
  switch (e.kind) {
    case 'tracker':
      return `${companyName(e.companyId)} saw your visit to ${e.site}`;
    case 'reported': {
      const told = `${e.site} told ${companyName(e.companyId)} you ${reportedPhrase(e)}`;
      return e.identityShared ? `${told}, and sent your email or phone number in scrambled form` : told;
    }
    case 'ad_click':
      return e.certain
        ? `You clicked a ${e.platform} ad that led to ${e.site}`
        : `You reached ${e.site} from a ${e.platform} link, which may have been an ad`;
    case 'search':
      return e.query ? `You searched ${e.engine} for ${q(e.query)}` : `You searched ${e.engine}`;
  }
}

/** Short label for what a site told a company, for lists: "Added to basket". */
export const ACTION_LABELS: Record<Action, string> = {
  page_view: 'Page visit',
  view_item: 'Looked at a product',
  add_to_cart: 'Added to basket',
  add_to_wishlist: 'Saved for later',
  checkout: 'Started checkout',
  purchase: 'Bought',
  sign_up: 'Signed up',
  lead: 'Filled in a form',
  search: 'Searched',
  subscribe: 'Subscribed',
  conversion: 'Sale or sign-up',
  other: 'Other',
};

const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export function timeOf(ts: number): string {
  return timeFmt.format(ts);
}

/** "Today", "Yesterday" or "Monday 26 October". */
export function dayOf(ts: number, now = Date.now()): string {
  const start = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const diff = Math.round((start(now) - start(ts)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return dayFmt.format(ts);
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
