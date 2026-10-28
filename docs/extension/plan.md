# Ad Mirror extension: plan

Status: accepted · Last updated: 28 October 2026

## Goal

A browser extension that records, on the user's own device, the actions and events that lead to personalised advertising, and shows them back clearly: which ad companies saw each visit, what websites told those companies, which ads the user clicked, what they searched for, the interest profile this adds up to, and when they engage with ads most.

It must be secure, run entirely locally, and be built to the standard of a professional team: established open-source building blocks, typed code, automated tests in real browsers, documented decisions.

## Principles

1. **Observe, never alter.** Version 1 only watches network requests. It injects nothing into web pages, so a hostile page has nothing to attack.
2. **Nothing leaves the device.** No servers, no analytics, no remote code, no remote lists. The extension's Content Security Policy blocks all network connections from its own pages.
3. **Keep the least data that tells the story.** Store the site's domain, the company, the event name and the time. Never full URLs, page content or identifiers.
4. **Honest labels.** Interests and patterns are estimates and say so. Known blind spots are shown in the extension.
5. **Reuse proven work.** Prefer maintained open-source projects and data over writing our own; record every reuse in `THIRD_PARTY_NOTICES.md`.

## What it records (version 1)

| Record | Detected from | Stored fields |
|---|---|---|
| **Tracker seen** | Third-party request to a known ad or tracking domain | time, site, company, category |
| **Site told a company** | Known tracking endpoint (Meta Pixel, TikTok, Google Ads, GA4, Pinterest, Snap, LinkedIn, Reddit, X, Microsoft) with an event name | time, site, company, event (e.g. `AddToCart`), product name or category if sent, "identity shared" flag if hashed email/phone was sent (the hash itself is discarded) |
| **Ad click** | Top-level page load whose address carries a click ID (`gclid`, `gbraid`, `wbraid`, `dclid`, `fbclid`, `msclkid`, `ttclid`, `twclid`, `li_fat_id`, `ScCid`, `epik`, `rdt_cid`) | time, destination site, ad platform |
| **Search** | Top-level page load on a known search page (Google, Bing, DuckDuckGo, Yahoo, Ecosia, Brave Search, Amazon, YouTube, eBay, Etsy) | time, engine, search words (user can turn off) |

Derived on demand from those records, never stored separately:

- **Interests (estimate):** about 20 plain topics (Travel, Fitness, Money, Shopping for clothes, Cars, Home, Health, Gaming, …). Each topic is scored from the sites visited (curated site→topic list), search words (curated keyword→topic list), and product names or categories sites reported. Every topic shows its evidence ("3 searches, 5 sites, 2 basket adds").
- **Patterns (estimate):** hour-of-day × day-of-week grid of ad clicks and reported events; the topics and kinds of sites where ad clicks happen. Shown only after about 14 days or 30 qualifying events.

## What it shows

- **Toolbar badge:** number of ad companies that saw the current page.
- **Popup (this page):** the companies that saw this visit, what the site told them, and a link to the dashboard.
- **Dashboard (extension page):** Overview · Who knows about you (companies) · Timeline · Interests · Patterns · Settings (pause, exclude sites, search recording on/off, retention period, export, delete everything).
- **First run:** what is recorded, what is not, the search switch, and the permission explained in plain English. On Firefox it also asks for site access if it was not granted at install.

Visual design follows `.claude/skills/ad-mirror-design` (same tokens as the website, light and dark, WCAG 2.2 AA).

## Architecture

```
 webRequest events (service worker / Firefox event page)
        │  onBeforeRequest  (url, initiator, type, tabId, requestBody for known endpoints only)
        ▼
 classify ──► trackers.ts   tracker domain → company   (AdGuard companiesdb, filtered)
          ──► pixels.ts     endpoint + event decoders  (adapted from Omnibug, typed code)
          ──► clickIds.ts   click-ID parameters → platform
          ──► search.ts     search page → query parameter
        │  third-party test via tldts (Public Suffix List)
        ▼
 events queue ──(batched, ≤1 s)──► IndexedDB "ad-mirror" (idb)   retention purge via alarms
        │
        ├─► storage.session: per-tab counts → toolbar badge
        ▼
 popup / dashboard read from IndexedDB, compute interests and patterns in memory
```

Service-worker rules (Chrome terminates idle workers): register every listener synchronously at top level; keep no state in globals that cannot be rebuilt; flush the queue on a short timer and on `onSuspend`; keep per-tab data in `storage.session`.

Matching rules:
- A request counts only if it is **third-party** (its registrable domain differs from the page's), so Bing search loading Bing files is not "Bing Ads saw you".
- Hostnames match the tracker list by suffix (`a.b.doubleclick.net` → `doubleclick.net`).
- Request bodies are read only for the handful of endpoints that put the event name there (GA4, TikTok), parsed in memory, and dropped.

## Permissions

| Permission | Why | Install warning |
|---|---|---|
| `webRequest` | Observe requests (not block or change them) | — (covered by host access) |
| host `<all_urls>` | Chrome only reports a request if the extension can access both the tracker **and** the page that made it | "Read and change all your data on all websites" |
| `storage` | Settings and per-tab counts | none |
| `alarms` | Daily retention purge | none |

Not requested: `tabs`, `history`, `cookies`, `scripting`, `webNavigation`, content scripts, `web_accessible_resources`, `externally_connectable`. The warning wording is unavoidable for this feature; the website and first-run page explain it, and the code is open for anyone to check.

## Reused open source

| Project | Used for | Licence |
|---|---|---|
| [WXT](https://github.com/wxt-dev/wxt) | Build, cross-browser manifest, dev server, store zips (incl. Firefox source zip), Vitest integration | MIT |
| [AdGuard companiesdb](https://github.com/AdguardTeam/companiesdb) | Tracker domains, company names, categories (filtered at build time to advertising, site analytics, social media, customer interaction) | CC BY-SA 4.0 (our derived data file stays CC BY-SA 4.0, with attribution) |
| [Omnibug](https://github.com/MisterPhilip/omnibug) | Endpoint patterns and where each platform puts its event name | MIT |
| [tldts](https://github.com/remusao/tldts) | Registrable domain (Public Suffix List) | MIT |
| [idb](https://github.com/jakearchibald/idb) | Promise wrapper for IndexedDB | ISC |
| Vitest, `@webext-core/fake-browser` (via WXT) | Unit tests with a fake `browser` API | MIT |
| Playwright | End-to-end tests with the real extension loaded | Apache-2.0 |
| [web-ext](https://github.com/mozilla/web-ext) | Firefox lint and run | MPL-2.0 (dev only) |
| ESLint, typescript-eslint, [eslint-plugin-no-unsanitized](https://github.com/mozilla/eslint-plugin-no-unsanitized) | Lint; ban `innerHTML`-style sinks | MIT / MPL-2.0 |

Considered and not used: `webextension-polyfill` (archived July 2026; WXT provides `browser`); Disconnect, Ghostery TrackerDB and DuckDuckGo Tracker Radar lists (non-commercial or unclear licences); Chrome Topics taxonomy (archived, no licence); UT1 site categories (licence not confirmed). Site→topic and keyword→topic lists are therefore written by us, small and curated.

## Engineering standards

- **TypeScript, strict mode.** Vanilla DOM for the UI (no UI framework), built only with `textContent`/`createElement`, matching the website.
- **Runtime dependencies:** `tldts`, `idb`. Everything else is build or test tooling. Exact versions, at least two weeks old, lockfile committed.
- **Checks on every pull request:** typecheck, ESLint, unit tests (classifiers, store, interests, patterns), `web-ext lint`, end-to-end tests in Chromium with the built extension against a local test server that imitates tracker endpoints, bundle size and permission snapshot (a new permission fails CI until reviewed).
- **Reproducible build** as Firefox reviewers require: documented Node/npm versions, one build command, lockfile.
- **Supply chain:** GitHub Actions pinned to commit SHAs, Dependabot for npm and actions, no install scripts from unknown packages, two-factor auth on store accounts.
- **Project hygiene:** Conventional Commits, `CHANGELOG.md`, `SECURITY.md` (how to report a vulnerability), `THIRD_PARTY_NOTICES.md`, decision records in `docs/adr/`.
- **Data updates:** `scripts/update-trackers.mjs` pulls companiesdb at a pinned commit and regenerates `extension/data/trackers.json`; the diff is reviewed like code. Never fetched at runtime.

## Repository layout

```
extension/
  wxt.config.ts            manifest, permissions, CSP, per-browser settings
  entrypoints/
    background.ts          listeners → classify → queue → store
    popup/                 this-page summary
    dashboard/             overview, companies, timeline, interests, patterns, settings
    welcome/               first run and permission explainer
  src/
    classify/              trackers.ts, pixels.ts, clickIds.ts, search.ts, thirdParty.ts
    store/                 db.ts (idb schema, queries), retention.ts, settings.ts
    insights/              interests.ts, patterns.ts
    ui/                    shared DOM helpers, tokens.css (from the website), components
  data/                    trackers.json (generated), company-names.json, tracker-companies.json, topics.json (sites and keywords per topic)
  tests/
    unit/                  Vitest
    e2e/                   Playwright + local fake tracker server
docs/
  extension/plan.md        this file
  adr/                     decision records
site/                      website (adds an extension page and privacy policy)
```

## Milestones

Each milestone ends with all checks green and a screenshot review where there is UI.

1. **Foundations.** WXT + TypeScript project, lint/test/CI, manifest and CSP, permission snapshot test, `THIRD_PARTY_NOTICES.md`, `SECURITY.md`.
   *Done when:* an empty extension builds for Chrome and Firefox, loads in Playwright, and CI runs everything.
2. **Detection engine.** Tracker data pipeline, classifiers, third-party test, event queue, IndexedDB store, retention, pause and exclusions, badge.
   *Done when:* unit tests cover each classifier with real request fixtures, and an end-to-end test visits a local test site and finds the expected records.
3. **Insights.** Topic and keyword lists, interests and patterns with evidence.
   *Done when:* fixture histories produce the expected topics and grids, including "not enough data yet".
4. **Popup, dashboard, first run.** Design to the website's standard; light and dark; keyboard and screen reader; axe clean.
   *Done when:* screenshot review passes on desktop and Firefox Android sizes.
5. **Website and release prep.** Extension page with store buttons for the visitor's browser, permission explainer, privacy policy with the Chrome Web Store Limited Use statement, store listings and screenshots.
   *Done when:* the owner has the zips and listings ready to submit.

## Risks

| Risk | Mitigation |
|---|---|
| Install warning puts people off | Explain before install; show exactly what is and is not recorded; open source; zero network |
| Store rejection over broad host access | Single clear purpose, Limited Use statement, privacy policy, no remote code, minimal other permissions |
| Ad platforms change endpoints | Fixtures from real requests; endpoint table in one file; review every six months alongside the website advice |
| Server-side tracking (e.g. Meta Conversions API) and first-party proxies are invisible | Shown as a stated limit in the extension and on the website |
| Service worker stopped mid-batch loses a few events | Short flush interval; flush on suspend; accept rare loss rather than keeping the worker alive |
| Data on disk readable by anyone with access to the computer | Data minimisation, short retention, delete-all; optional password lock considered for a later version |

## Open questions for the owner

1. Project licence before publishing (code). MIT is common; the derived tracker data file stays CC BY-SA 4.0 either way.
2. Store accounts: Chrome Web Store ($5 one-time), Microsoft Edge Add-ons, Firefox Add-ons.
