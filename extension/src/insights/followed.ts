// "This ad followed you": links an ad click to something the user looked at
// or put in their basket on the same site earlier. That is retargeting, the
// most common way tracking turns browsing into buying. We say "probably",
// because we see the timing, not the ad company's reasons.

import type { Action, AdClickEvent, AdEvent, ReportedEvent } from '../types';

/** How far back an earlier visit can explain an ad. */
export const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
/** Ignore activity from the visit the ad click itself started. */
const SAME_VISIT_MS = 60 * 1000;

// Stronger signals win: a basket says more than a glance.
const STRENGTH: Partial<Record<Action, number>> = { view_item: 1, add_to_wishlist: 2, add_to_cart: 3, checkout: 4 };

export interface Followed {
  click: AdClickEvent;
  /** The earlier shopping moment the ad most likely came from. */
  earlier: ReportedEvent;
  daysAgo: number;
}

/** The earlier shopping moment on the clicked site that best explains the ad, if any. */
export function findFollowed(click: AdClickEvent, history: readonly AdEvent[]): Followed | null {
  let best: ReportedEvent | null = null;
  for (const e of history) {
    if (e.kind !== 'reported' || e.site !== click.site) continue;
    const strength = STRENGTH[e.action];
    if (!strength || e.ts > click.ts - SAME_VISIT_MS || e.ts < click.ts - LOOKBACK_MS) continue;
    const bestStrength = best ? (STRENGTH[best.action] ?? 0) : 0;
    if (!best || strength > bestStrength || (strength === bestStrength && e.ts > best.ts)) best = e;
  }
  if (!best) return null;
  return { click, earlier: best, daysAgo: Math.floor((click.ts - best.ts) / (24 * 60 * 60 * 1000)) };
}

/** Every ad click in `events` since `since` that probably followed the user. */
export function followedSince(events: readonly AdEvent[], since: number): Followed[] {
  return events
    .filter((e): e is AdClickEvent => e.kind === 'ad_click' && e.ts >= since)
    .map((click) => findFollowed(click, events))
    .filter((f): f is Followed => f !== null)
    .reverse();
}

/** "today", "yesterday", "3 days ago". */
export function whenAgo(days: number): string {
  if (days <= 0) return 'earlier today';
  return days === 1 ? 'yesterday' : `${String(days)} days ago`;
}
