// "Who" in the simple view: brands people know, and everyone else grouped
// as "other ad companies". Advanced mode shows the full company names.

import { listOf } from '../insights/simple';
import { plural } from './dom';

const BRANDS: [RegExp, string][] = [
  [/^google$/, 'Google'],
  [/^meta$|^facebook/, 'Facebook'],
  [/^bytedance/, 'TikTok'],
  [/^amazon/, 'Amazon'],
  [/^microsoft$/, 'Microsoft'],
  [/^twitter$/, 'X (Twitter)'],
  [/^snap/, 'Snapchat'],
  [/^pinterest$/, 'Pinterest'],
  [/^linkedin$/, 'LinkedIn'],
  [/^reddit$/, 'Reddit'],
  [/^apple$/, 'Apple'],
  [/^yahoo|^oath/, 'Yahoo'],
];

/** The everyday brand name, or null for companies most people have not heard of. */
export function brand(companyId: string): string | null {
  return BRANDS.find(([re]) => re.test(companyId))?.[1] ?? null;
}

/** A brand name, or "an ad company" for the rest. */
export function who(companyId: string): string {
  return brand(companyId) ?? 'an ad company';
}

/** "Google, Facebook and 4 other ad companies": at most `maxNames` brands, most active first. */
export function whoList(companyIds: string[], maxNames = 3): string {
  const ids = [...new Set(companyIds)];
  const names = [...new Set(ids.map(brand).filter((b): b is string => b !== null))].slice(0, maxNames);
  const others = ids.filter((id) => {
    const b = brand(id);
    return b === null || !names.includes(b);
  }).length;
  if (!others) return listOf(names);
  const rest = names.length
    ? plural(others, 'other ad company', 'other ad companies')
    : plural(others, 'ad company', 'ad companies');
  return listOf([...names, rest]);
}
