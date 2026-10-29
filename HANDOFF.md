# Handoff notes

Context for anyone (including a new Claude chat) picking up this project. Read README.md first for what the code does and how to run it, then `extension/README.md` for the extension.

- **Repo:** https://github.com/shantanunaik23/AdvertCheck (work is on `main`; PR #1 was merged on 29 October 2026)
- **Website:** https://shantanunaik23.github.io/AdvertCheck/ (deployed by CI on every push to `main`)
- **Name:** They Spy (the repo is still called AdvertCheck)

## The goal

A tool that shows people how they are being tracked and marketed to, and teaches them that tracking is built to get them to buy more and change their behaviour. Easy for anyone to understand, whatever their IT skills, simple to use and secure. Nothing ever leaves the user's device. The owner gives the direction; the builder is responsible for research and doing it properly.

## Where things stand (29 October 2026)

**Website (`site/`) — built and live.** Verdict first, then a privacy checkup with fixes for the visitor's own browser, plain-language details, account links and a FAQ (including "How does tracking get me to buy more?"). Casual but truthful tone. Load the `they-spy-design` skill (`.claude/skills/they-spy-design/SKILL.md`) before changing anything in `site/` or writing claims about tracking: it holds the standards, the voice and the sourced facts.

**Browser extension (`extension/`) — built, not yet published.** For Chrome, Edge and Firefox. Plan in `docs/extension/plan.md`, decisions in `docs/adr/0001`–`0005`. It:
- watches network traffic only (never reads pages) and stores everything in IndexedDB on the device; its CSP blocks all network access;
- records trackers per page, what sites told ad companies (viewed a product, added to basket, checkout, email handed over…), ad clicks and searches;
- shows a simple view by default ("Your week in ads"), with an Advanced mode for full detail, interests and patterns;
- optional on-page alerts (ADR 0005, off by default): a small overlay says who just learned what, focused on shopping moments;
- "This ad followed you": links an ad click to something viewed or basketed on that site in the last 30 days (retargeting);
- optional "Sleep on it" line on basket and checkout alerts.

Milestones 1–4 of the plan are done. Milestone 5 (website page and store release) is next.

## How to work on it

- Node.js is installed at `C:\Program Files\nodejs`, but VS Code may need a full restart before `node`/`npm` are on PATH.
- Website: `npm test` in the repo root (Playwright in Chromium, Firefox and WebKit, plus axe accessibility checks).
- Extension: `npm run verify` in `extension/` runs typecheck, lint, 55 unit tests, build, manifest check, Firefox lint and 9 end-to-end tests. All passed on 29 October 2026.
- Try the extension: `npm run build` in `extension/`, then load `extension/.output/chrome-mv3` as an unpacked extension (`chrome://extensions`, Developer mode).
- CI (`.github/workflows/pages.yml`) runs both test suites and deploys the website from `main`. Actions are pinned to commit SHAs; Dependabot waits 14 days before suggesting updates.
- The GitHub CLI (`gh`) is not installed on the owner's PC; git push works.

## Decisions made

- **Nothing leaves the device.** No analytics, no storage on the website, no third-party scripts or fonts, no server. The extension has `connect-src 'none'`.
- **Website hosting:** GitHub Pages, so the CSP is a `<meta>` tag generated from `site/js/config.js` by `scripts/build.mjs`; CI fails if they drift. `site/_headers` has the full header set for a later move to Cloudflare Pages or Netlify.
- **The website's ad server check runs only on a click**, because it reveals the visitor's IP to ad companies (EDPB Guidelines 2/2023).
- **DOM is built with `textContent` only**, never `innerHTML` (enforced by lint in the extension).
- **Tracker data** comes from AdGuard companiesdb (pinned commit, refresh with `extension/scripts/update-trackers.mjs`); pixel decoders are adapted from Omnibug. Credited in `THIRD_PARTY_NOTICES.md`.
- **Interests and patterns are estimates**, labelled as such; health is flagged as sensitive. Never a psychological score.
- **Weekly recap notification:** considered and dropped by the owner.
- **Licence:** MIT.

## Mobile (parked by the owner on 29 October 2026)

Research done, nothing built. Key facts:
- UK phones are about 45% Safari on iPhone and 45% Chrome on Android; neither can run the extension as it is.
- Firefox for Android should run it already (untested).
- iPhone: a small iOS app containing a Safari Web Extension, detecting trackers from the page's resource list instead of watching requests. Needs a new ADR, a Mac, Xcode and an Apple Developer account.
- Android: an app with an on-device VPN (reusing Apache-licensed parts of DuckDuckGo App Tracking Protection or Rethink; TrackerControl is GPL). Shows which ad companies each app contacts, but not basket details, because traffic is encrypted. Needs Google Play's VpnService declaration.
- **Do not** route the user's DNS to a server we run: it would send all browsing off the device and break the core promise.

## Not yet verified

- The extension on real installs of Chrome, Edge and Firefox with everyday browsing (only automated tests so far).
- The website's server check against the real ad servers, and the fingerprint check on real Brave, Safari 26 and Firefox Strict.
- The per-browser fix steps on the website were written from research, not by clicking through each browser.
- The live ad slot (`site/js/adslot.js`) is off by default and has never been tested.

## Next steps

1. Check the first deploy from `main` worked and the live site looks right on a phone and a laptop.
2. Use the extension for a few days of normal browsing and note anything confusing or wrong.
3. Milestone 5: an extension page on the website (install buttons for the visitor's browser, what it can and can't see), a privacy policy including the Chrome Web Store Limited Use statement, store listings and screenshots, then `npm run zip` and submit to the Chrome Web Store, Edge Add-ons and Firefox Add-ons.
4. The data download importer: visitors open their Google, Meta or TikTok data download on the website and it is read locally in the browser. Research the current export formats first, since they change.
5. Re-check the advice in `site/js/advice.js` and the facts in the design skill about every six months.
