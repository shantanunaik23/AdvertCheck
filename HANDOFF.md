# Handoff notes

Context for anyone (including a new Claude chat) picking up this project. Read README.md first for what the code does and how to run it.

## The goal

A tool that shows people how they are being marketed to through ads: what they are shown, what they engage with, and how susceptible they are. It should be easy to understand, simple to use and secure. The owner gives the direction; the builder is responsible for research and doing it properly.

## The overall plan

1. **Website (built, this repo).** A front door that gives instant value with no install. Shows what any site can see about the visitor, and whether ad networks can reach their browser. Points to the deeper options.
2. **Data export importer (next).** Visitors drop their Google, Meta or TikTok data export onto the page and it is parsed locally in the browser, never uploaded. Shows inferred interests and advertisers holding their data.
3. **Browser extension (later).** Records ads seen and clicked over time, stored only on the device. Adds a "susceptibility" view: which categories and times of day the user engages with ads most. Frame it as a mirror of their own patterns, labelled as an estimate, never as a psychological score.
4. **Mobile app (later).** Phones do not let one app see another app's ads, so the app is a dashboard plus the export importer, optionally synced with the extension. Avoid accessibility-service or screen-reading approaches (store policy and privacy risk).
5. **Optional home network device (idea).** Pi-hole style logging of ad-network contacts per device. Shows ad infrastructure exposure, not ad content.

## Browser extension (in planning)

The plan is in `docs/extension/plan.md`, with decisions in `docs/adr/`. In short:
- **Records:** trackers on each page, what sites told ad companies, ad clicks, and searches.
- **Shows:** interests and patterns, which are estimates.
- **Runs:** fully on the device, by watching network traffic only.
- **Built with:** WXT and TypeScript, reusing AdGuard companiesdb and Omnibug's patterns.
- **Browsers:** Chrome, Edge and Firefox.

Progress (28 October 2026):
- **Done:** milestones 1 (foundations), 2 (detection engine), 3 (interests and patterns) and 4 (popup, dashboard and welcome page), plus a simple default view with an Advanced mode, and an optional on-page alert feed (ADR 0005). Everything is verified by `npm run verify` in `extension/`.
- **Next:** milestone 5 (extension page on the website, privacy policy, store listings), then real-device testing. Work is on the `redesign-and-extension` branch, pull request #1.

## Decisions made

- **Hosting:** GitHub Pages first. GitHub Pages cannot send HTTP headers, so the CSP is a `<meta>` tag. `site/_headers` has the full header set for a later move to Cloudflare Pages or Netlify.
- **The ad and tracking server check runs on a click, not automatically.** It reveals the visitor's IP to ad companies, which contradicts the page's privacy promise and, under EU guidance (EDPB Guidelines 2/2023), needs consent. `autoRunLiveProbe` in `site/js/config.js` can change this if a consent step is added.
- **No web fonts, no third-party scripts, no storage, no analytics.** Any of these would leak visits to a third party.
- **Every outside server is listed in `site/js/config.js`.** `scripts/build.mjs` generates the CSP from it, and CI fails if they drift.
- **DOM is built with `textContent` only**, never `innerHTML`.
- **Redesign (28 October 2026).** The page now leads with a verdict, then a privacy checkup where every failed check has fixes for the visitor's own browser, then the full details, then account links. It follows Material 3 style and is written for a reading age of about 9. The standards, the research behind them and the sources are in `.claude/skills/ad-mirror-design/SKILL.md`. Load that skill before changing the site.
- **Unfinished features stay hidden.** The live ad slot card only appears when `adSlot` is configured. The extension is mentioned once in the footer's "Coming next".
- **Recommended tools:** uBlock Origin Lite (all major browsers), uBlock Origin (Firefox) and Privacy Badger (to send the do-not-sell signal). All are free, open source and not commercial. Re-check that the advice in `site/js/advice.js` is still current about every six months.

## Not yet verified

- The server check against the real ad servers (tested only with simulated blocked, reachable and offline responses).
- The fingerprint protection check on real Brave, Safari 26 and Firefox Strict. It was tested in Playwright's Chromium, Firefox and WebKit builds, which don't scramble canvas reads by default.
- The per-browser fix steps were written from research, not by clicking through each browser. Check them on real devices, especially iPhone and Android.
- The GitHub Actions workflow (`.github/workflows/pages.yml`) has not run yet. It now installs Chromium, Firefox and WebKit.
- The live ad slot (`site/js/adslot.js`) is off by default and has never been tested. It needs a Google Ad Manager ad unit.

External links were checked on 28 October 2026 and all respond. Google and Meta pages need you to be signed in.

## Next steps

1. Enable GitHub Pages: repo **Settings → Pages → Source: GitHub Actions**, then check the first workflow run passes.
2. Open the site on real devices (Chrome, Safari on iPhone, Firefox, Brave), with and without an ad blocker. Run the server check and follow a few fix steps to confirm they match what each browser shows.
3. Choose a licence (for example MIT) if the project should be open source.
4. Add a social share image (`og:image`) and a custom domain if wanted.
5. Build the data export importer (step 2 of the plan). Research the current export formats for each platform first, since they change.
