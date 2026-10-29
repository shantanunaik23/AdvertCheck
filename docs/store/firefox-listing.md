# Firefox Add-ons (AMO) listing

Copy each field into the AMO submission form at https://addons.mozilla.org/developers/addon/submit/.

## Upload

- **Distribution:** On this site (listed on addons.mozilla.org)
- **Add-on file:** `extension/.output/they-spy-extension-<version>-firefox.zip`
- **Platforms:** Firefox and Firefox for Android (the manifest sets `gecko_android`)
- **Source code:** Yes. Upload `extension/.output/they-spy-extension-<version>-sources.zip`. The build is bundled by Vite, so reviewers need the sources.

## Describe your add-on

**Name:** They Spy

**Add-on URL:** they-spy

**Summary** (max 250 characters):

> See what websites tell ad companies about you: what you viewed, what you put in your basket, and who got told. Everything stays on your device. Nothing is ever sent anywhere.

**Description:**

> Ever looked at a pair of trainers and then seen them follow you round the web? They Spy shows you why.
>
> As you browse, websites quietly tell ad companies like Google, Facebook, TikTok and Amazon what you're doing. They Spy watches for those messages and shows them back to you in plain English.
>
> **What you'll see**
> - Your week in ads: which ad companies heard about you, and from which sites
> - What sites told them: you viewed a product, added it to your basket, reached checkout or handed over your email
> - "This ad followed you": when you click an ad for something you looked at on that site in the last 30 days
> - Advanced mode: every company, the interests ad companies might guess from your browsing, and your patterns. These are estimates, and labelled that way.
> - Optional alerts on websites (off by default): a small note telling you who just learned what
>
> **Your data stays with you**
> - Everything is stored on your device. The extension can't connect to the internet at all: its security policy blocks it.
> - It doesn't read the pages you visit. It only looks at the requests your browser sends to ad companies.
> - It never keeps full web addresses, cookies, IDs or page content.
> - Records are deleted after 30 days (you can change this). Pause it, exclude sites, export or delete everything whenever you like.
> - No accounts, no analytics, no ads.
>
> **Why it needs access to all websites**
> Ad companies' code runs on almost every site. To spot what a site tells them, They Spy has to see your browser's requests on every site. It only reads the parts that say which company was told what.
>
> Free and open source (MIT): https://github.com/shantanunaik23/AdvertCheck

**Categories:** Privacy & Security (Firefox); Privacy & Security (Android)

**Tags:** privacy, tracking, ads, anti-tracking, shopping

**Support email:** (your choice; not filled in here)
**Support website:** https://github.com/shantanunaik23/AdvertCheck/issues
**Homepage:** https://shantanunaik23.github.io/AdvertCheck/

**Licence:** MIT License

**This add-on has a privacy policy:** Yes. Paste the text below.

## Privacy policy

> They Spy does not collect, send or share any data.
>
> Everything the extension records stays on your device, in your browser's own storage. The extension's security policy blocks all network connections, so it cannot send anything to us or anyone else. We have no server.
>
> What it stores on your device: the time, the site you were on (for example example.com), which ad company it told, what kind of event it was (for example "added to basket"), a product name or category if the site sent one to the ad company, and search words unless you turn that off. It notes whether a site sent your hashed email, but never stores the hash.
>
> What it never stores: full web addresses, page content, cookies, IDs or the content of requests.
>
> Records are deleted after 30 days by default. You can change this, pause recording, exclude sites, export your records or delete them all in Settings. Removing the extension deletes everything.

## Notes to reviewer

> Build from source (Node.js 24, npm 11; Windows, macOS or Linux):
>
>     npm ci                # from the root of the sources zip
>     cd extension
>     npm run build         # output in extension/.output/firefox-mv3
>
> `extension/README.md` has the same steps. The build is deterministic from package-lock.json.
>
> Why the permissions:
> - webRequest + <all_urls>: to see which ad and tracking servers each page contacts. Request bodies are read only for known ad and analytics endpoints (src/classify/pixels.ts, for example GA4 and TikTok) to get the event name, parsed in memory, then discarded (src/requestBody.ts).
> - storage: settings and records, on the device only (IndexedDB).
> - alarms: deletes old records on a schedule.
> - scripting: only if the user turns on "Show alerts on websites" (off by default). It injects entrypoints/feed.ts, which shows a small overlay and does not read the page.
>
> No remote code, no network access (extension_pages CSP has connect-src 'none'), no analytics. data_collection_permissions is set to "none".
>
> Tracker data comes from AdGuard companiesdb (CC BY-SA 4.0), bundled at build time in extension/data/trackers.json. See THIRD_PARTY_NOTICES.md.

## Screenshots

AMO wants at least one, 1280×800 or similar. Take them from the popup and the dashboard after a few minutes of browsing on shopping sites.
