# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Extension detection engine: trackers per page (AdGuard companiesdb, 4,033 domains), what sites reported to Meta, TikTok, Google Analytics, Google Ads, Pinterest, Snap, LinkedIn, Reddit, X and Microsoft (decoders adapted from Omnibug), ad clicks from click IDs, and searches on 10 engines and shops. Stored on the device in IndexedDB with 30-day retention, pause, site exclusions and a switch for search words. Toolbar badge counts companies per page.
- Extension project (WXT, TypeScript): background worker, welcome page, permissions and Content Security Policy that block all network access, unit and end-to-end tests, Firefox linting, manifest permission check.
- Project licence (MIT), security policy, third-party notices, decision records and the extension plan.
- CI runs website and extension checks; actions pinned to commit SHAs; Dependabot with a 14-day cooldown.

### Changed
- Website redesign: verdict first, privacy checkup with fixes for the visitor's browser, plain-language details, account links, FAQ.
- Website tests run in Chromium, Firefox and WebKit, with axe accessibility checks.
