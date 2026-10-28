# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Shopping alerts: when a site tells an ad company you looked at a product, added it to your basket, saved it, checked out, bought it or searched, or hands over your email, a small alert says who now knows and why it matters. Everything else waits behind a counter button.
- "How this gets you to spend" explainer on the dashboard and website, including the FTC 2025 surveillance pricing findings.

### Changed
- Renamed to They Spy. Friendlier, more direct wording throughout.
- Optional on-page alert feed (ADR 0005): when switched on, a small panel on each website says which companies got data from the page and what they were told, in plain words. Off by default; its script is only placed in pages while it is on, never reads the page, and does not signal the page.
- Simple view as the default for the extension, with an Advanced mode for full detail.
- Extension interface: toolbar popup (companies that saw the current page and what they were told), dashboard (overview, companies, timeline, interests, patterns, settings with pause, search-word switch, retention, site exclusions, export and delete), and a first-run welcome page explaining what is and is not recorded and the install warning. Light and dark themes; accessibility checked with axe on every page.
- Extension insights: estimated interests across 20 plain-English topics (curated lists of 293 sites and 320 keywords), each with its evidence and examples; patterns of when and where ads are engaged with (weekly grid, busiest time, ad clicks by topic and platform), shown only once there is enough data. Health is flagged as sensitive.
- Extension detection engine: trackers per page (AdGuard companiesdb, 4,033 domains), what sites reported to Meta, TikTok, Google Analytics, Google Ads, Pinterest, Snap, LinkedIn, Reddit, X and Microsoft (decoders adapted from Omnibug), ad clicks from click IDs, and searches on 10 engines and shops. Stored on the device in IndexedDB with 30-day retention, pause, site exclusions and a switch for search words. Toolbar badge counts companies per page.
- Extension project (WXT, TypeScript): background worker, welcome page, permissions and Content Security Policy that block all network access, unit and end-to-end tests, Firefox linting, manifest permission check.
- Project licence (MIT), security policy, third-party notices, decision records and the extension plan.
- CI runs website and extension checks; actions pinned to commit SHAs; Dependabot with a 14-day cooldown.

### Changed
- Website redesign: verdict first, privacy checkup with fixes for the visitor's browser, plain-language details, account links, FAQ.
- Website tests run in Chromium, Firefox and WebKit, with axe accessibility checks.
