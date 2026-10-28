// Estimates the interest profile advertisers could build from the records.
// Every topic carries the evidence behind it, so the estimate can be checked.

import type { Action, AdEvent } from '../types';
import { TOPICS, topicsForSite, topicsForText, type Topic } from './topics';

export interface Evidence {
  /** Searches whose words point to the topic. */
  searches: number;
  /** Different sites in the topic that the user visited. */
  sites: number;
  /** Things sites reported (viewed, added to basket, bought…) that point to the topic. */
  actions: number;
  /** Ads clicked that led to a site in the topic. */
  adClicks: number;
}

export interface Interest extends Topic {
  score: number;
  strength: 'strong' | 'medium' | 'light';
  evidence: Evidence;
  /** Up to three examples, e.g. search words or product names. */
  examples: string[];
}

// How strongly each kind of record suggests an interest. Buying something
// says more than looking at it; a search says more than a page visit.
const ACTION_WEIGHT: Partial<Record<Action, number>> = {
  view_item: 2,
  add_to_wishlist: 3,
  add_to_cart: 4,
  checkout: 4,
  purchase: 5,
  search: 3,
  sign_up: 3,
  lead: 3,
  subscribe: 3,
};
const SEARCH_WEIGHT = 3;
const AD_CLICK_WEIGHT = 4;
const SITE_DAY_WEIGHT = 1;
const MIN_SCORE = 3;

export function computeInterests(events: readonly AdEvent[]): Interest[] {
  const acc = new Map<
    string,
    { score: number; evidence: Evidence; sites: Set<string>; siteDays: Set<string>; examples: string[] }
  >();
  const get = (id: string) => {
    let a = acc.get(id);
    if (!a) {
      a = {
        score: 0,
        evidence: { searches: 0, sites: 0, actions: 0, adClicks: 0 },
        sites: new Set(),
        siteDays: new Set(),
        examples: [],
      };
      acc.set(id, a);
    }
    return a;
  };
  const example = (id: string, text: string | undefined) => {
    const a = get(id);
    if (text && a.examples.length < 3 && !a.examples.includes(text)) a.examples.push(text);
  };

  for (const e of events) {
    // A visit counts once per site per day, whatever the record type.
    const day = Math.floor(e.ts / 86_400_000);
    for (const id of topicsForSite(e.site)) {
      const a = get(id);
      a.sites.add(e.site);
      const key = `${e.site}|${String(day)}`;
      if (!a.siteDays.has(key)) {
        a.siteDays.add(key);
        a.score += SITE_DAY_WEIGHT;
      }
    }

    if (e.kind === 'search' && e.query) {
      for (const id of topicsForText(e.query)) {
        const a = get(id);
        a.score += SEARCH_WEIGHT;
        a.evidence.searches++;
        example(id, e.query);
      }
    } else if (e.kind === 'reported') {
      const weight = ACTION_WEIGHT[e.action];
      if (!weight) continue;
      const text = [e.item, e.itemCategory, e.searchTerm].filter(Boolean).join(' ');
      const ids = new Set([...topicsForText(text), ...topicsForSite(e.site)]);
      for (const id of ids) {
        const a = get(id);
        a.score += weight;
        if (e.action === 'search') a.evidence.searches++;
        else a.evidence.actions++;
        example(id, e.item ?? e.searchTerm);
      }
    } else if (e.kind === 'ad_click') {
      for (const id of topicsForSite(e.site)) {
        const a = get(id);
        a.score += AD_CLICK_WEIGHT;
        a.evidence.adClicks++;
      }
    }
  }

  const out: Interest[] = [];
  for (const topic of TOPICS) {
    const a = acc.get(topic.id);
    if (!a || a.score < MIN_SCORE) continue;
    a.evidence.sites = a.sites.size;
    out.push({
      ...topic,
      score: a.score,
      strength: a.score >= 20 ? 'strong' : a.score >= 8 ? 'medium' : 'light',
      evidence: a.evidence,
      examples: a.examples,
    });
  }
  return out.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));
}
