# They Spy extension

Records, on your own device, what websites tell advertisers about you, and shows it back. Plan: [`docs/extension/plan.md`](../docs/extension/plan.md). Decisions: [`docs/adr/`](../docs/adr/).

Status: milestones 1–4 done (foundations, detection, insights, interface), with a simple default view, Advanced mode and an optional on-page alert feed. Next: website page and store listings (5).

Try it: `npm run build`, then load `.output/chrome-mv3` as an unpacked extension (chrome://extensions → Developer mode → Load unpacked), or run `npm run dev`.

## Build from source

These steps produce a byte-identical copy of the published packages (required by Firefox Add-ons review).

Requirements: Node.js 24 and npm 11, on Windows, macOS or Linux.

```sh
# from the repository root
npm ci                  # installs exact versions from package-lock.json
cd extension
npm run build           # .output/chrome-mv3 and .output/firefox-mv3
npm run zip             # store packages in .output/*.zip (Chrome, Firefox + sources, Edge)
```

## Develop

```sh
npm run dev             # Chrome with live reload
npm run dev:firefox     # Firefox with live reload
```

## Checks

| Command                  | What it checks                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `npm run typecheck`      | TypeScript, strict mode                                                                  |
| `npm run lint`           | ESLint (incl. Mozilla's no-unsanitized rules and a ban on network APIs) and Prettier     |
| `npm test`               | Unit tests (Vitest with a fake browser API)                                              |
| `npm run check:manifest` | Built manifests ask only for the reviewed permissions, and the CSP blocks network access |
| `npm run lint:firefox`   | Mozilla's add-on linter, warnings count as errors                                        |
| `npm run test:e2e`       | The built extension in Chromium: detection, every page with axe accessibility checks     |
| `npm run verify`         | All of the above, in order                                                               |

For end-to-end tests, install the browser once: `npx playwright install chromium`.

## Rules

- No network access: no `fetch`, XHR or WebSocket; the CSP blocks it anyway.
- Nothing runs inside web pages unless the user turns on "Show alerts on websites" (ADR 0005). That script (`entrypoints/feed.ts`) only renders what the background sends about its own tab; `check:manifest` fails if it signals the page or uses the network.
- No `innerHTML` or similar; build DOM with `textContent`.
- New permissions need a decision record and an update to `scripts/check-manifest.mjs`.
- Dependencies: exact versions, at least 14 days old, and as few as possible in the shipped code.

## Updating tracker data

```sh
node scripts/update-trackers.mjs [companiesdb-commit]
```

Regenerates `data/trackers.json` from AdGuard companiesdb at a pinned commit, applying `data/company-names.json` (display names) and `data/tracker-companies.json` (brand corrections, e.g. LinkedIn rather than its owner Microsoft). Review the diff before committing.
