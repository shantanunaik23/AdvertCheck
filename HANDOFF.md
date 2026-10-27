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

## Decisions made

- **Hosting:** GitHub Pages first. GitHub Pages cannot send HTTP headers, so the CSP is a `<meta>` tag. `site/_headers` has the full header set for a later move to Cloudflare Pages or Netlify.
- **The ad and tracking server check runs on a click, not automatically.** It reveals the visitor's IP to ad companies, which contradicts the page's privacy promise and, under EU guidance (EDPB Guidelines 2/2023), needs consent. `autoRunLiveProbe` in `site/js/config.js` can change this if a consent step is added.
- **No web fonts, no third-party scripts, no storage, no analytics.** Any of these would leak visits to a third party.
- **Every outside server is listed in `site/js/config.js`.** `scripts/build.mjs` generates the CSP from it, and CI fails if they drift.
- **DOM is built with `textContent` only**, never `innerHTML`.

## Not yet verified

The original build environment had no internet access, so these were not tested for real:

- The server check against the real ad servers (tested only with simulated blocked, reachable and offline responses).
- The external links on the page (ad settings, data downloads, opt-outs).
- The GitHub Actions workflow (`.github/workflows/pages.yml`) has not run yet.
- The live ad slot (`site/js/adslot.js`) is off by default and has never been tested. It needs a Google Ad Manager ad unit.

## Next steps

1. Enable GitHub Pages: repo **Settings → Pages → Source: GitHub Actions**, then check the first workflow run passes.
2. Open the live site in a normal browser and in one with an ad blocker. Run the server check in both and confirm the results make sense.
3. Click through every external link and fix any that have moved.
4. Choose a licence (for example MIT) if the project should be open source.
5. Build the data export importer (step 2 of the plan). Research the current export formats for each platform first, since they change.
