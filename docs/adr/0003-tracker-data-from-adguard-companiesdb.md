# 3. Tracker and company data from AdGuard companiesdb

Date: 2026-10-28 · Status: accepted (supersedes the earlier "own curated list" choice)

## Context

The extension needs to map tracker domains to real company names and categories. The owner first chose a hand-curated list to avoid licence restrictions on the popular lists.

Research (28 October 2026):

| Source | Size | Licence | Commercial use |
|---|---|---|---|
| Disconnect tracking protection | large | CC BY-NC-SA 4.0 | no |
| Ghostery TrackerDB | large | not stated on GitHub (NC-SA reported) | unclear |
| DuckDuckGo Tracker Radar | large | not stated on GitHub | unclear |
| AdGuard companiesdb | 3,330 trackers, 5,126 domains, 2,368 companies | CC BY-SA 4.0 | yes, with attribution and share-alike |

## Decision

Generate `extension/data/trackers.json` from AdGuard companiesdb at a pinned commit, keeping the categories advertising, site analytics, social media and customer interaction, and dropping descriptions. Keep a small override file for corrections and plain-English company names. Credit AdGuard and WhoTracks.me in `THIRD_PARTY_NOTICES.md` and in the extension's About page.

## Consequences

- Far better coverage than a hand list, maintained by others, with no restriction on future commercial use.
- The derived data file is licensed CC BY-SA 4.0. This does not affect the licence of the code.
- Updates are a reviewed pull request from `scripts/update-trackers.mjs`, never a runtime download.
