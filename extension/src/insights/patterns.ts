// When and where the user engages with ads: a mirror of their own habits,
// shown only once there is enough data to say anything.

import type { AdEvent } from '../types';
import { topicsForSite } from './topics';

export interface Patterns {
  /** False until about two weeks of records or 30 engagements exist. */
  ready: boolean;
  /** Days between the first and last record. */
  daysCovered: number;
  /** Ad clicks plus things sites reported (other than page views). */
  engagements: number;
  /** [day 0 = Sunday … 6][hour 0 … 23] → engagements, in local time. */
  grid: number[][];
  /** The part of the week with the most engagements, if one stands out. */
  busiest: { label: string; share: number } | null;
  adClicksByTopic: { topicId: string; count: number }[];
  adClicksByPlatform: { platform: string; count: number }[];
}

export const READY_DAYS = 14;
export const READY_ENGAGEMENTS = 30;

const BANDS = [
  { name: 'nights', from: 0, to: 6 },
  { name: 'mornings', from: 6, to: 12 },
  { name: 'afternoons', from: 12, to: 18 },
  { name: 'evenings', from: 18, to: 24 },
] as const;

function isEngagement(e: AdEvent): boolean {
  return e.kind === 'ad_click' || (e.kind === 'reported' && e.action !== 'page_view');
}

function countBy<T>(items: T[]): { key: T; count: number }[] {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export function computePatterns(events: readonly AdEvent[]): Patterns {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  const engaged = events.filter(isEngagement);
  const slots = new Map<string, number>();
  for (const e of engaged) {
    const d = new Date(e.ts);
    const day = d.getDay();
    const hour = d.getHours();
    const row = grid[day];
    if (row) row[hour] = (row[hour] ?? 0) + 1;
    const band = BANDS.find((b) => hour >= b.from && hour < b.to)?.name ?? 'nights';
    const slot = `${day === 0 || day === 6 ? 'Weekend' : 'Weekday'} ${band}`;
    slots.set(slot, (slots.get(slot) ?? 0) + 1);
  }

  const first = events[0]?.ts;
  const last = events.at(-1)?.ts;
  const daysCovered = first !== undefined && last !== undefined ? Math.floor((last - first) / 86_400_000) : 0;

  // Only name a busiest time if it holds a clear share (over a third).
  const top = [...slots].sort((a, b) => b[1] - a[1])[0];
  const busiest =
    top && engaged.length && top[1] / engaged.length > 1 / 3 ? { label: top[0], share: top[1] / engaged.length } : null;

  const clicks = events.filter((e) => e.kind === 'ad_click');
  return {
    ready: daysCovered >= READY_DAYS || engaged.length >= READY_ENGAGEMENTS,
    daysCovered,
    engagements: engaged.length,
    grid,
    busiest,
    adClicksByTopic: countBy(clicks.flatMap((e) => topicsForSite(e.site))).map(({ key, count }) => ({
      topicId: key,
      count,
    })),
    adClicksByPlatform: countBy(clicks.map((e) => e.platform)).map(({ key, count }) => ({ platform: key, count })),
  };
}
