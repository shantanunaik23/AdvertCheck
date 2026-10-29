import data from '../../data/companies.json';

// Display names only, kept apart from the tracker domains (trackers.ts) so
// extension pages can show names without loading the whole tracker list.
const { companies } = data as { companies: Record<string, string> };

export function companyName(companyId: string): string {
  return companies[companyId] ?? companyId;
}
