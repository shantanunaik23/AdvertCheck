# 5. Optional on-page alert feed

Date: 2026-10-28 · Status: accepted · Amends [0004](0004-observe-network-only-and-store-minimal-data.md)

## Context

The owner wants people to see, while they browse, how much data each page hands to advertisers: a feed overlaid on the page that says what was sent to whom, in plain words. ADR 0004 kept version 1 to network observation only, with no code inside web pages. An overlay needs a content script, which runs alongside the page and is the most exposed part of any extension.

## Decision

- The feed is **off by default** and turned on by the user ("Show alerts on websites").
- The content script is **registered at runtime** with `scripting.registerContentScripts` only while the setting is on, and unregistered when it is turned off. The manifest still has no `content_scripts`, so with the feature off no extension code runs in any page. This adds the `scripting` permission, which brings no extra install warning because site access is already granted.
- The content script **only renders**. It never reads the page, never listens to page events, and makes no network requests. It receives plain sentences about the current tab from the background script; the background answers only for `sender.tab.id` and never sends records from other sites (Chrome security guidance on content scripts).
- The overlay lives in a **shadow root** with its own constructed stylesheet, so the page's styles cannot change it and no extension file is exposed through `web_accessible_resources`. The shadow root is open so accessibility tools and tests can reach it; it only contains what the page itself sent.
- The script is built as a WXT *unlisted script*, not a WXT content script, so it carries none of WXT's content-script wrapper: no `window.postMessage` or `document` event announcing it, and no navigation watching. The build is checked for these signals.
- "Who" is simplified to brand names people know (Google, Facebook, TikTok…) with the rest called "an ad company". "What" is said plainly: which website you are on, your rough location, your device and browser, plus anything the site reported (e.g. "You added “Desk lamp” to your basket") and "Your email address (in code)".

## Consequences

- While the feed is on, a page can detect that an They Spy element is present. The setting says so.
- `scripts/check-manifest.mjs` now allows `scripting` and still forbids manifest content scripts and web-accessible resources.
- The feed is tested end to end in Chromium. Firefox renders it from the same code but is not yet covered by automated tests.
