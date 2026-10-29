import data from '../../data/topics.json';

export interface Topic {
  id: string;
  name: string;
  /** Data protection law gives this kind of information extra protection. */
  sensitive: boolean;
}

interface TopicData {
  topics: { id: string; name: string; sensitive?: boolean; sites: string[]; keywords: string[] }[];
}

const raw = (data as TopicData).topics;

export const TOPICS: readonly Topic[] = raw.map(({ id, name, sensitive }) => ({
  id,
  name,
  sensitive: sensitive ?? false,
}));

const bySite = new Map<string, string[]>();
for (const t of raw) for (const s of t.sites) bySite.set(s, [...(bySite.get(s) ?? []), t.id]);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Short words must match whole (with an optional plural) so "car" does not
// match "carpet"; longer words and phrases match at the start of a word.
function keywordPattern(keyword: string): string {
  const k = escape(keyword.toLowerCase());
  return keyword.length < 5 && !keyword.includes(' ') ? `\\b${k}(?:s|es)?\\b` : `\\b${k}`;
}

const matchers = raw.map((t) => ({ id: t.id, re: new RegExp(t.keywords.map(keywordPattern).join('|'), 'i') }));

/** Topics a site belongs to, from the curated site list. */
export function topicsForSite(site: string): string[] {
  return bySite.get(site) ?? [];
}

/** Topics whose keywords appear in a piece of text (a search, a product name). */
export function topicsForText(text: string): string[] {
  return matchers.filter((m) => m.re.test(text)).map((m) => m.id);
}

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
