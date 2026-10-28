import { getDomain, getHostname } from 'tldts';

/**
 * The registrable domain ("site") of a URL, using the Public Suffix List:
 * "https://a.b.example.co.uk/x" → "example.co.uk". Falls back to the hostname
 * for addresses without one (IP addresses, localhost).
 */
export function siteOf(url: string): string | null {
  return getDomain(url) ?? getHostname(url);
}

/** True when the request goes to a different site from the page. */
export function isThirdParty(requestUrl: string, pageSite: string): boolean {
  const site = siteOf(requestUrl);
  return site !== null && site !== pageSite;
}
