// Search result pages of common search engines and shops.

interface Engine {
  name: string;
  host: RegExp;
  path: RegExp;
  params: string[];
}

const ENGINES: Engine[] = [
  { name: 'Google', host: /(^|\.)google\.[a-z.]{2,6}$/, path: /^\/search$/, params: ['q'] },
  { name: 'YouTube', host: /(^|\.)youtube\.com$/, path: /^\/results$/, params: ['search_query'] },
  { name: 'Bing', host: /(^|\.)bing\.com$/, path: /^\/search$/, params: ['q'] },
  { name: 'DuckDuckGo', host: /(^|\.)duckduckgo\.com$/, path: /^\/(html\/?)?$/, params: ['q'] },
  { name: 'Yahoo', host: /^search\.yahoo\.com$/, path: /^\/search/, params: ['p'] },
  { name: 'Ecosia', host: /(^|\.)ecosia\.org$/, path: /^\/search$/, params: ['q'] },
  { name: 'Brave Search', host: /^search\.brave\.com$/, path: /^\/search$/, params: ['q'] },
  { name: 'Amazon', host: /(^|\.)amazon\.[a-z.]{2,6}$/, path: /^\/s\/?$/, params: ['k', 'field-keywords'] },
  { name: 'eBay', host: /(^|\.)ebay\.[a-z.]{2,6}$/, path: /^\/sch\//, params: ['_nkw'] },
  { name: 'Etsy', host: /(^|\.)etsy\.com$/, path: /^\/search$/, params: ['q'] },
];

export interface SearchMatch {
  engine: string;
  query: string;
}

/** The engine and words of a search results page address, if it is one. */
export function findSearch(url: string): SearchMatch | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  for (const engine of ENGINES) {
    if (!engine.host.test(u.hostname) || !engine.path.test(u.pathname)) continue;
    for (const p of engine.params) {
      const query = u.searchParams.get(p)?.trim();
      if (query) return { engine: engine.name, query: query.slice(0, 200) };
    }
  }
  return null;
}
