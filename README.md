# Ad Mirror

See what every website learns about you the moment you arrive, and whether ad networks can reach your browser.

Ad Mirror is a single static page. It has no server, no cookies and no analytics. Everything is worked out in the visitor's own browser.

## What it does

The page is laid out as: a **verdict** ("Advertisers can easily track this browser" / "partly protected" / "well protected"), a **privacy checkup** with fixes for the visitor's own browser, the **full list of details** any site can read, and **links to take control** of ad profiles at Google, Meta, Amazon, Microsoft and TikTok.

**Automatically, on page load (nothing leaves the browser):**
- Reads the details any site can see without asking: device, browser, screen, time zone, languages, privacy settings.
- Builds a fingerprint ID from canvas rendering, graphics card and installed fonts, the same techniques trackers use to follow people who clear cookies.
- Runs three checkup items:
  - **Ad blocker**: a local "bait" element that blockers hide.
  - **Fingerprint protection**: draws a solid colour on a canvas and reads it back. Brave, Firefox (resist fingerprinting) and Safari's advanced protection add noise, so the pixels no longer match.
  - **"Do not sell my data" signal**: reads Global Privacy Control.
- Shows step-by-step fixes for the visitor's browser (Chrome, Edge, Firefox, Safari, Brave, Samsung Internet, Opera; iPhone and Android variants). See `site/js/advice.js`.
- Counts every request the page makes to other servers, so visitors can verify the "nothing leaves your browser" claim.

**When the visitor chooses:**
- **Ad and tracking servers check.** Tries to reach 12 well-known ad and tracking servers and reports which are blocked. A neutral control request runs first. If that also fails, the visitor is told the results are unreliable instead of being told they are protected.
- **Real ad slot** (off by default, hidden until configured). Shows an ad served by Google Ad Manager. Needs your own ad unit. See [Live ad slot](#live-ad-slot).
- **Save results.** Copy a text summary or download a JSON data file.

Design, writing and accessibility standards, plus the sources for every privacy fact and setting path, are in `.claude/skills/ad-mirror-design/SKILL.md`. Read it before changing the page.

## Run locally

```sh
node scripts/serve.mjs        # http://127.0.0.1:8080, with the production security headers
npm install                   # once, for the tests
npx playwright install chromium firefox webkit
npm test                      # SCREENSHOTS=some-dir npm test also saves screenshots
```

## Deploy to GitHub Pages

1. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow in `.github/workflows/pages.yml` runs the tests, then publishes the `site/` folder.
3. The site appears at `https://shantanunaik23.github.io/AdvertCheck/`.

For a fork, change `repoUrl` in `site/js/config.js` so the footer links to your copy of the source code.

## Security

| Measure | Where |
|---|---|
| Strict Content-Security-Policy: own scripts and styles only, no inline code, no `eval`, outside connections limited to the probe list | `<meta>` tag in `site/index.html` |
| No third-party scripts, fonts or images. System fonts only, so no font host learns about visits | `site/css/styles.css` |
| All page text is set with `textContent`, never `innerHTML`, so values read from the browser cannot inject markup | `site/js/main.js` |
| Probe requests send no cookies and no referrer | `site/js/probe.js` |
| Nothing is stored in cookies or local storage | whole site |
| GitHub Actions workflow uses least-privilege permissions, and tests must pass before deploy | `.github/workflows/pages.yml` |

The CSP is generated from `site/js/config.js` by `node scripts/build.mjs`. CI fails if they are out of sync, so a server cannot be contacted unless it is listed in the config.

**GitHub Pages limits.** Pages cannot send custom HTTP headers, so these protections from `site/_headers` are not active there: `frame-ancestors` (stops other sites embedding the page), `Permissions-Policy`, `Cross-Origin-Opener-Policy` and `X-Frame-Options`. To get them, deploy the same `site/` folder to Cloudflare Pages or Netlify, which read `_headers` automatically.

## Privacy and the law

- The fingerprint and signals are computed and shown to the visitor only. They are never stored or sent, which is the point of the page.
- The server check sends requests to ad companies, which reveals the visitor's IP address to them. For this reason it only runs when the visitor clicks. Keep `autoRunLiveProbe: false` unless you add a consent step. EU guidance (EDPB Guidelines 2/2023) treats reading device information as in scope of the ePrivacy cookie rules, so take legal advice before adding any storage, analytics or automatic third-party requests.

## Live ad slot

Off by default and **experimental: not yet tested against a live ad unit.**

1. Create an ad unit in Google Ad Manager.
2. Set `adSlot: { adUnitPath: '/<network-code>/<unit>', size: [300, 250] }` in `site/js/config.js`.
3. Run `node scripts/build.mjs`. This adds Google's servers to the CSP.
4. Test locally and watch the browser console for CSP violations. Google's ad scripts load from several hosts, so the list in `site/js/adslot.js` may need extending.
5. Add a consent step before enabling it for EU and UK visitors, since it loads Google's ad scripts.

It shows ads from your own Ad Manager account and the exchanges connected to it, not every network that profiles the visitor.

## Known limits

- Reachability is judged per server. Some blockers allow a server but block specific paths, so a server can show as reachable while the blocker still stops some of its ads.
- The ad-blocker bait test can miss blockers that do not hide elements by class name.
- The fingerprint ID shows how identifiable a browser is, not how unique. For uniqueness statistics, see EFF's [Cover Your Tracks](https://coveryourtracks.eff.org/), which compares against a database of visitors.
- The fingerprint protection check only detects browsers that add noise to canvas reads. Firefox's Strict mode blocks known fingerprinting scripts without adding noise, so it can still show as "Not protected".
- Browser detection for the fix steps uses the user agent and client hints. Less common browsers fall back to general advice.

## Project layout

```
site/                 published to GitHub Pages
  index.html          page structure and the SVG icon set
  favicon.svg
  css/styles.css      design tokens (light and dark) and layout
  js/config.js        servers the page may contact, feature switches
  js/signals.js       what the browser reveals, browser detection, fingerprint protection test
  js/advice.js        step-by-step fixes per browser
  js/probe.js         ad blocker and server checks
  js/adslot.js        optional live ad slot
  js/main.js          renders the page
  _headers            full security headers for Cloudflare Pages / Netlify
scripts/build.mjs     generates the CSP from config
scripts/serve.mjs     local server with production headers
tests/page.test.mjs   browser tests (Playwright: Chromium, Firefox, WebKit; axe accessibility)
.claude/skills/       design standards and researched facts for this project
```
