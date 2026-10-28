// The plain-language summary behind the simple view: a few answers instead
// of lists. Shared by the popup and the dashboard.

import type { AdEvent, ReportedEvent } from '../types';
import { computeInterests, type Interest } from './interests';
import { summariseCompanies } from './summary';

export type TrackingLevel = 'none' | 'some' | 'lots';

/** How much a page was watched, as a traffic light. */
export function trackingLevel(companies: number): TrackingLevel {
  if (companies === 0) return 'none';
  return companies <= 3 ? 'some' : 'lots';
}

export const LEVEL_TEXT: Record<TrackingLevel, string> = {
  none: 'Private',
  some: 'Some tracking',
  lots: 'Lots of tracking',
};

export interface WeekSummary {
  /** Number of different advertising companies that saw the user. */
  companies: number;
  /** Every company that saw the user, most widespread first. */
  companyIds: string[];
  /** The most recent things shops told advertisers, newest first. */
  told: ReportedEvent[];
  /** Sites that sent the user's email or phone number (in coded form). */
  emailSites: string[];
  /** What advertisers probably think the user likes. */
  interests: Interest[];
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Summarises the last seven days of records. */
export function weekSummary(events: readonly AdEvent[], now: number): WeekSummary {
  const recent = events.filter((e) => e.ts >= now - WEEK_MS);
  const companies = summariseCompanies(recent);
  const told = recent.filter((e): e is ReportedEvent => e.kind === 'reported' && e.action !== 'page_view');
  return {
    companies: companies.length,
    companyIds: companies.map((c) => c.companyId),
    told: told.slice(-5).reverse(),
    emailSites: [...new Set(recent.filter((e) => e.kind === 'reported' && e.identityShared).map((e) => e.site))],
    interests: computeInterests(recent).slice(0, 5),
  };
}

/** "Google", "Google and Meta", "Google, Meta and TikTok". */
export function listOf(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`;
}
