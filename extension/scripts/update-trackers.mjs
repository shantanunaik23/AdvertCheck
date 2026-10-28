// Regenerates data/trackers.json from AdGuard companiesdb (CC BY-SA 4.0).
// Usage: node scripts/update-trackers.mjs [commit]
// Review the diff like code; the extension never downloads this at runtime.

import { readFile, writeFile } from 'node:fs/promises';

const COMMIT = process.argv[2] ?? '8d845040224a0e3ea9cbba5df68ceb6a988235d2';
const BASE = `https://raw.githubusercontent.com/AdguardTeam/companiesdb/${COMMIT}/dist`;

// companiesdb category → our short code. Others (CDNs, players, comments…) are not ad tracking.
const CATEGORIES = {
  advertising: 'ad',
  pornvertising: 'ad',
  site_analytics: 'analytics',
  social_media: 'social',
  customer_interaction: 'interaction',
};

// "Adobe Inc." → "Adobe": legal suffixes add nothing for readers.
function plainName(name) {
  return name
    .replace(/,?\s+(Inc\.?|Ltd\.?|LLC|Limited|Corporation|Corp\.?|GmbH|S\.A\.|SAS|AG|plc|B\.V\.|Co\.)$/i, '')
    .replace(/\s+International$/i, '')
    .trim();
}

async function get(file) {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

const [{ trackers, trackerDomains, categories }, { companies }] = await Promise.all([
  get('trackers.json'),
  get('companies.json'),
]);
// Reviewed corrections: brand names people recognise (e.g. LinkedIn, not its owner Microsoft).
const readData = async (file) => JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), 'utf8'));
const overrides = await readData('company-names.json');
const trackerCompanies = await readData('tracker-companies.json');

const usedCompanies = {};
const domains = {};
for (const [domain, trackerId] of Object.entries(trackerDomains).sort(([a], [b]) => a.localeCompare(b))) {
  const tracker = trackers[trackerId];
  const category = tracker && CATEGORIES[categories[tracker.categoryId]];
  if (!category) continue;
  const companyId = trackerCompanies[trackerId] ?? tracker.companyId ?? trackerId;
  usedCompanies[companyId] = overrides[companyId] ?? plainName(companies[companyId]?.name ?? tracker.name);
  domains[domain] = [companyId, category];
}

const out = {
  source: `AdGuard companiesdb ${COMMIT} (CC BY-SA 4.0), built on WhoTracks.me data. Filtered; see THIRD_PARTY_NOTICES.md.`,
  companies: Object.fromEntries(Object.entries(usedCompanies).sort(([a], [b]) => a.localeCompare(b))),
  domains,
};
await writeFile(new URL('../data/trackers.json', import.meta.url), JSON.stringify(out) + '\n');
console.log(`${Object.keys(domains).length} domains, ${Object.keys(usedCompanies).length} companies`);
