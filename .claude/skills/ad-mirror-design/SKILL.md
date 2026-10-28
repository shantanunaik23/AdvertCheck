---
name: ad-mirror-design
description: Design, content and quality standards for the Ad Mirror website, plus researched facts about ad tracking and per-browser privacy settings (verified October 2026). Use before changing anything in site/ (layout, styles, wording, new sections or features), when writing privacy advice or claims about tracking, and before shipping, as a review checklist.
---

# Ad Mirror design standards

Ad Mirror shows ordinary people how advertisers see them and what to do about it. The bar is a product a large company (Google, Apple, GOV.UK) would ship: anyone can use it on a phone, in a minute, with no jargon, and every claim on it is true.

Read `HANDOFF.md` for the product plan and `README.md` for how the code works. This skill covers how to design and write for it.

## 1. Product principles

1. **Verdict first, details second.** Open with one plain answer ("Advertisers can easily track this browser"), then the few facts behind it, then the full technical list. Never open with a data table.
2. **Every problem comes with a fix.** If the page shows a risk, it shows the fix for *the visitor's own browser*, in steps they can follow now. A finding with no action is noise.
3. **Honest over impressive.** Only claim what the page measured. Say "estimate" where it is one. If a check could not run reliably, say so rather than guessing (see the offline handling in `probe.js`). Never present a "susceptibility" or "psychological" score.
4. **Prove the privacy promise.** The page must never leak a visit: no third-party scripts, fonts, images, analytics or storage. The live outside-request counter in the header must stay accurate.
5. **Consent before contact.** Anything that reveals the visitor's IP to a third party runs only on a click, with the consequence stated next to the button (EDPB Guidelines 2/2023).
6. **Hide what isn't ready.** Unconfigured or unfinished features (the live ad slot, the extension) must not appear as broken or "coming soon" cards. One line in the footer about what's next is enough.

## 2. Writing (content design)

Based on GOV.UK content design and the University of Reading research behind it, and NN/g progressive disclosure.

- Aim for a **reading age of 9**: short common words, sentences under 20 words, one idea per sentence. Plain English helps experts too: they read faster.
- **Front-load**: the first 2–3 words of a heading, button or row carry the meaning ("Ad blocker: not found", not "We checked whether an ad blocker...").
- Address the reader as **"you"**, the product as **"we"** sparingly, active voice.
- Define a technical term once, in the words people use: "device fingerprint: an ID built from your device's details, which stays the same when you clear cookies". Prefer the plain label in the UI ("How your device draws images") and keep the technical name in the expandable detail.
- Buttons say what happens: "Run the check", "Copy summary". Not "Submit", "Go", "Learn more".
- Status text is a full answer, not a code: "Blocked: your browser stopped it", not "ERR".
- Numbers as numerals ("3 of 12"). Dates as "16 February 2025".
- No fear-mongering and no exclamation marks. State the fact and the fix calmly.
- UK English spelling (the owner is in the UK), but avoid region-only terms.

## 3. Information architecture

Two levels of disclosure at most (NN/g: more than two levels makes people get lost).

1. **Hero + result card**: headline, one-sentence promise, verdict, 4 plain facts (device, browser, location clue, language), fingerprint ID with a one-line explanation.
2. **Privacy checkup**: one row per check (status icon + title + one-line result). Each row expands to "How to fix this in <your browser>". The server check lives here with its consent text and button.
3. **What any website can see**: the full signal list, grouped in cards. Each row shows the label, value and how identifying it is. The "why it matters" text is behind a native `<details>`.
4. **Take control of your ad profile**: one card per platform (Google, Meta, Amazon, Microsoft, TikTok) with the same three actions where available: see your interests, download your data, turn off personalised ads. Plus industry opt-outs and phone settings.
5. **Save your results**, then **FAQ** (trust questions), then a footer with the request counter and source link.

## 4. Visual system

Material 3 inspired: calm, white, tonal surfaces, rounded shapes, one accent. Do not copy Google branding or logos. The page must not look like it *is* Google.

- **Fonts**: system stack only (`system-ui, -apple-system, "Segoe UI", Roboto, ...`). Web fonts would leak visits to a font host.
- **Colour**: tokens on `:root`, redefined under `prefers-color-scheme: dark`. Neutral surfaces (`--bg`, `--container`, `--container-high`), ink (`--ink`, `--ink-2`), one primary (blue), and three status pairs (good/warn/bad, each a text colour plus a container). Text contrast at least 4.5:1, large text and UI parts at least 3:1, in both themes.
- **Status is never colour alone** (WCAG 1.4.1): always an icon *and* a word.
- **Shape**: 12px small parts, 16–20px cards, 28px hero card, fully rounded (pill) buttons and chips.
- **Spacing**: 4px grid. Section padding 64–96px desktop, 48px phone. Max content width about 1120px; text blocks max about 65 characters.
- **Icons**: inline SVG `<symbol>` sprite in `index.html`, referenced with `<use href="#i-name">`. Stroke icons, 24px, `currentColor`. No icon fonts and no external icon files.
- **Elevation**: tonal surfaces, not heavy shadows. At most a subtle 1px shadow on the hero card.
- **Motion**: subtle (150–250ms ease) on expand and hover only. Everything stops under `prefers-reduced-motion`.

## 5. Accessibility: WCAG 2.2 AA minimum

- Semantic HTML first: landmarks, one `h1`, ordered headings, lists, `<details>`/`<summary>` for disclosure, `<button>` for actions, `<a>` for navigation.
- Touch targets at least 24×24px (2.5.8 AA). Aim for 44–48px on primary controls.
- Visible focus on everything, never hidden behind sticky UI (2.4.11).
- Live results announced with `aria-live="polite"`; don't move focus unexpectedly.
- Works at 320px wide and at 200% zoom with no horizontal scroll (1.4.10 reflow).
- External links say they open in a new tab (visually-hidden text or an icon with a label).
- Automated check: `@axe-core/playwright` runs in `tests/page.test.mjs` and must report no violations, in light and dark.

## 6. Performance budget

Core Web Vitals "good" thresholds (still current in 2026, 75th percentile): **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.**

- No frameworks and no build step for the page. HTML + JS + CSS under 40 KB gzipped (about 25 KB after the October 2026 redesign). Measure with `cat site/index.html site/js/*.js site/css/*.css | gzip -9 | wc -c`.
- Reserve space for values that load late (min-heights, placeholder text) so nothing jumps (CLS).
- Fingerprint work (canvas, fonts) runs after first paint; never block rendering on it.

## 7. Security rules (do not break)

- DOM built with `textContent` / `createElement` only. Never `innerHTML`.
- No inline scripts, no inline `style` attributes (CSP blocks them). SVG presentation attributes are fine.
- Every outside server is listed in `site/js/config.js`; `node scripts/build.mjs` regenerates the CSP. CI fails on drift.
- External links: `rel="noopener noreferrer"` and `target="_blank"`, https only.
- No cookies, localStorage, or analytics.

## 8. Verified facts (checked 28 October 2026)

Re-check before relying on these after mid-2027. Sources are listed at the end.

**Tracking landscape**
- Google allowed advertisers on its platforms to use fingerprinting and IP addresses from **16 February 2025** (announced 18–19 December 2024). The UK ICO called this "irresponsible" and said fingerprinting "could now replace the functions of third-party cookies".
- Chrome **kept third-party cookies** (announced 22 April 2025). Google retired most Privacy Sandbox technologies on **17 October 2025**. Chrome blocks third-party cookies by default only in Incognito.
- Safari 26 (iOS 26 / macOS 26, September 2025) turns on advanced fingerprinting protection for **all browsing** by default.
- Firefox removed the Do Not Track setting in version 135. Global Privacy Control (GPC) is the signal that matters now; it is legally binding in California and some other US states.

**Per-browser fixes**
- **Ad blocker**: uBlock Origin Lite is free, open source and available for Chrome, Edge, Firefox and Safari (iPhone, iPad and Mac via the App Store, since August 2025). Firefox can run the full uBlock Origin. Brave has Shields built in. Chrome for Android and Chrome/Firefox on iPhone have no extensions; suggest Firefox for Android, Brave, or Safari plus a content blocker.
- **Chrome**: Settings → Privacy and security → Third-party cookies → Block third-party cookies. No built-in fingerprint protection.
- **Edge**: Settings → Privacy, search, and services → Tracking prevention → Strict.
- **Firefox**: Settings → Privacy & Security → Enhanced Tracking Protection → Strict (blocks known fingerprinters). GPC: same page, "Tell websites not to sell or share my data".
- **Safari (iPhone/iPad)**: Settings → Apps → Safari → Advanced → Advanced Tracking and Fingerprinting Protection → All Browsing. **Mac**: Safari → Settings → Advanced → use advanced tracking and fingerprinting protection in all browsing.
- **Privacy Badger** (EFF) sends GPC in Chrome, Edge, Firefox and Opera.
- **iPhone apps**: Settings → Privacy & Security → Tracking → turn off "Allow Apps to Request to Track".
- **Android apps**: Settings → Privacy → Ads → Delete advertising ID (Android 12+; on some phones it is under Settings → Google → Ads).

**Links checked working (28 Oct 2026)**: myadcenter.google.com, takeout.google.com, facebook.com/adpreferences, accountscenter.facebook.com/info_and_permissions/dyi, amazon.com/adprefs, amazon.com/hz/privacy-central/data-requests/preview.html, account.microsoft.com/privacy/ad-settings, account.microsoft.com/privacy, tiktok.com/setting/download-your-data, youradchoices.com, youronlinechoices.com, ublockorigin.com, privacybadger.org, globalprivacycontrol.org, coveryourtracks.eff.org.

**Detecting fingerprint protection honestly**: draw a solid colour on a canvas and read the pixels back. Brave, Firefox (resist fingerprinting) and Safari's advanced protection add noise, so the pixels no longer match exactly. Plain Chrome returns them unchanged.

## 9. Review checklist before shipping

- [ ] A first-time visitor on a phone understands their verdict within 10 seconds, without scrolling past the first screen.
- [ ] Every risk shown has a fix for the visitor's browser.
- [ ] No jargon in headings, buttons or status text; technical terms only inside details.
- [ ] `npm test` passes: no console errors, no outside requests on load, axe has no violations, no horizontal scroll at 320px and 390px.
- [ ] Screenshots checked by eye in light and dark, desktop and phone.
- [ ] Every new external link opened and confirmed working; dated facts re-verified.
- [ ] `node scripts/build.mjs --check` passes.

## Sources

- GOV.UK content design: https://www.gov.uk/guidance/content-design/what-is-content-design
- NN/g, Progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- W3C, What's new in WCAG 2.2: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- Core Web Vitals thresholds: https://web.dev/articles/vitals
- ICO response to Google's fingerprinting policy: https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2024/12/our-response-to-google-s-policy-change-on-fingerprinting/
- Privacy Sandbox retirement: https://privacysandbox.google.com/blog/update-on-plans-for-privacy-sandbox-technologies
- Safari 26 fingerprinting protection: https://9to5mac.com/2025/09/01/security-bite-my-favorite-privacy-features-in-ios-26/
- Firefox GPC: https://support.mozilla.org/en-US/kb/global-privacy-control
- uBlock Origin browser support: https://ublockorigin.com/
- uBlock Origin Lite on Safari: https://www.neowin.net/news/ublock-origin-lite-launches-on-apple-safari/
- Mobile ad IDs (EFF): https://www.eff.org/deeplinks/2022/05/how-disable-ad-id-tracking-ios-and-android-and-why-you-should-do-it-now
- Edge tracking prevention: https://learn.microsoft.com/en-us/microsoft-edge/web-platform/tracking-prevention
