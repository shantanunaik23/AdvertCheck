// Totals and per-company summaries for the dashboard and popup.

import { companyName } from '../classify/companies';
import type { AdEvent, ReportedEvent } from '../types';

export interface CompanySummary {
  companyId: string;
  name: string;
  /** Different sites where this company saw the user. */
  sites: string[];
  /** Things sites told this company, excluding page visits. */
  told: ReportedEvent[];
  identityShared: boolean;
  lastSeen: number;
}

export interface Totals {
  companies: number;
  sites: number;
  told: number;
  adClicks: number;
  searches: number;
  identityShared: number;
}

export function summariseCompanies(events: readonly AdEvent[]): CompanySummary[] {
  const map = new Map<string, CompanySummary>();
  for (const e of events) {
    if (e.kind !== 'tracker' && e.kind !== 'reported') continue;
    let c = map.get(e.companyId);
    if (!c) {
      c = {
        companyId: e.companyId,
        name: companyName(e.companyId),
        sites: [],
        told: [],
        identityShared: false,
        lastSeen: 0,
      };
      map.set(e.companyId, c);
    }
    if (!c.sites.includes(e.site)) c.sites.push(e.site);
    c.lastSeen = Math.max(c.lastSeen, e.ts);
    if (e.kind === 'reported') {
      if (e.action !== 'page_view') c.told.push(e);
      if (e.identityShared) c.identityShared = true;
    }
  }
  return [...map.values()].sort(
    (a, b) => b.sites.length - a.sites.length || b.told.length - a.told.length || a.name.localeCompare(b.name),
  );
}

export function totals(events: readonly AdEvent[]): Totals {
  const companies = new Set<string>();
  const sites = new Set<string>();
  let told = 0;
  let adClicks = 0;
  let searches = 0;
  let identityShared = 0;
  for (const e of events) {
    if (e.kind === 'tracker' || e.kind === 'reported') {
      companies.add(e.companyId);
      sites.add(e.site);
    }
    if (e.kind === 'reported' && e.action !== 'page_view') told++;
    if (e.kind === 'reported' && e.identityShared) identityShared++;
    if (e.kind === 'ad_click') adClicks++;
    if (e.kind === 'search') searches++;
  }
  return { companies: companies.size, sites: sites.size, told, adClicks, searches, identityShared };
}
