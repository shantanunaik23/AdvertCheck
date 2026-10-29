// Turns observed requests into records, one page load at a time.
// Kept free of browser APIs so it can be tested directly.

import { findClickId } from './classify/clickIds';
import { decodePixel } from './classify/pixels';
import { findSearch } from './classify/search';
import { isThirdParty, siteOf } from './classify/site';
import { lookupTracker } from './classify/trackers';
import type { Settings } from './store/settings';
import type { AdEvent, RequestInfo } from './types';

/** What has been seen on the current page of a tab, to avoid duplicate records. */
export interface PageState {
  site: string;
  /** When this page load began, so the popup can show just this visit. */
  startedAt: number;
  /** Companies that saw this page load. */
  companies: string[];
  /** Keys of reported events already recorded for this page load. */
  reported: string[];
}

export interface RecorderDeps {
  now: () => number;
  settings: () => Settings;
  /** New records, and the tab they came from. */
  record: (events: AdEvent[], tabId: number) => void;
  /** Called when the number of companies for a tab changes (for the toolbar badge). */
  onCompanies: (tabId: number, count: number) => void;
  /** Called after tab state changes, so it can be persisted across worker restarts. */
  onTabsChanged: (tabs: Record<number, PageState>) => void;
}

/** Only web pages count; browser and extension pages are not "sites". */
function isWebPage(url: string): boolean {
  return /^https?:/i.test(url);
}

export class Recorder {
  private readonly tabs = new Map<number, PageState>();

  constructor(private readonly deps: RecorderDeps) {}

  restore(tabs: Record<number, PageState>): void {
    for (const [id, page] of Object.entries(tabs)) this.tabs.set(Number(id), page);
  }

  forget(tabId: number): void {
    if (this.tabs.delete(tabId)) this.changed();
  }

  /**
   * @param tabId the tab that made the request; negative ids (no tab) are ignored.
   * @param fallbackPageUrl the page that made the request, used if the tab's page load was missed.
   */
  handle(tabId: number, request: RequestInfo, fallbackPageUrl?: string): void {
    const settings = this.deps.settings();
    if (tabId < 0 || settings.paused) return;
    if (request.type === 'main_frame') {
      this.startPage(tabId, request.url, settings);
      return;
    }

    let page = this.tabs.get(tabId);
    if (!page && fallbackPageUrl && isWebPage(fallbackPageUrl)) {
      const site = siteOf(fallbackPageUrl);
      if (site) this.tabs.set(tabId, (page = { site, startedAt: this.deps.now(), companies: [], reported: [] }));
    }
    if (!page || settings.excludedSites.includes(page.site)) return;

    const ts = this.deps.now();
    const events: AdEvent[] = [];
    const seeCompany = (companyId: string, category: 'ad' | 'analytics' | 'social' | 'interaction') => {
      if (page.companies.includes(companyId)) return;
      page.companies.push(companyId);
      events.push({ kind: 'tracker', ts, site: page.site, companyId, category });
      this.deps.onCompanies(tabId, page.companies.length);
    };

    let hostname: string;
    try {
      hostname = new URL(request.url).hostname;
    } catch {
      return;
    }
    const tracker = isThirdParty(request.url, page.site) ? lookupTracker(hostname) : null;
    if (tracker) seeCompany(tracker.companyId, tracker.category);

    for (const r of decodePixel(request)) {
      // A pixel served from the site's own domain still reports to the platform.
      seeCompany(r.companyId, 'ad');
      // Page views once per company per page; other events once per distinct item.
      const key =
        r.action === 'page_view' ? `${r.companyId}|page_view` : `${r.companyId}|${r.eventName}|${r.item ?? ''}`;
      if (page.reported.includes(key)) continue;
      page.reported.push(key);
      events.push({ kind: 'reported', ts, site: page.site, ...r });
    }

    if (events.length) {
      this.deps.record(events, tabId);
      this.changed();
    }
  }

  private startPage(tabId: number, url: string, settings: Settings): void {
    const site = isWebPage(url) ? siteOf(url) : null;
    if (!site) {
      this.forget(tabId);
      this.deps.onCompanies(tabId, 0);
      return;
    }
    this.tabs.set(tabId, { site, startedAt: this.deps.now(), companies: [], reported: [] });
    this.deps.onCompanies(tabId, 0);
    this.changed();
    if (settings.excludedSites.includes(site)) return;

    const ts = this.deps.now();
    const events: AdEvent[] = [];
    const click = findClickId(url);
    if (click) {
      events.push({
        kind: 'ad_click',
        ts,
        site,
        companyId: click.companyId,
        platform: click.platform,
        certain: click.certain,
      });
    }
    const search = findSearch(url);
    if (search) {
      events.push(
        settings.recordSearchWords
          ? { kind: 'search', ts, site, engine: search.engine, query: search.query }
          : { kind: 'search', ts, site, engine: search.engine },
      );
    }
    if (events.length) this.deps.record(events, tabId);
  }

  private changed(): void {
    this.deps.onTabsChanged(Object.fromEntries(this.tabs));
  }
}
