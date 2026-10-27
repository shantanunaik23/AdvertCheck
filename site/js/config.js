// Single source of truth for every server this page may contact.
// scripts/build.mjs reads this file to generate the Content-Security-Policy,
// so a host that is not listed here is blocked by the browser.

export const config = {
  // Public repository, shown as "Read the source code" in the footer.
  repoUrl: null,

  // The live ad-network check sends requests to third parties, which reveals
  // the visitor's IP address to them. Keep this false so it runs only after
  // the visitor clicks. Turn it on only if your consent banner covers it.
  autoRunLiveProbe: false,

  // How long to wait for each server before calling the result inconclusive.
  probeTimeoutMs: 4000,

  // A neutral server that blockers do not target. If it fails too, the
  // visitor is offline or behind a firewall and the results are not trusted.
  control: {
    name: 'Cloudflare CDN (control)',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css',
  },

  // Well-known ad and tracking scripts. Reachability is judged per host, so a
  // changed path still gives a valid answer.
  probes: [
    { name: 'Google AdSense', kind: 'Ad network', url: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js' },
    { name: 'Google Ad Manager', kind: 'Ad network', url: 'https://securepubads.g.doubleclick.net/tag/js/gpt.js' },
    { name: 'Amazon Ads', kind: 'Ad network', url: 'https://c.amazon-adsystem.com/aax2/apstag.js' },
    { name: 'Microsoft Advertising', kind: 'Ad network', url: 'https://bat.bing.com/bat.js' },
    { name: 'Criteo', kind: 'Retargeting', url: 'https://static.criteo.net/js/ld/publishertag.js' },
    { name: 'Outbrain', kind: 'Sponsored content', url: 'https://widgets.outbrain.com/outbrain.js' },
    { name: 'Meta Pixel', kind: 'Social pixel', url: 'https://connect.facebook.net/en_US/fbevents.js' },
    { name: 'TikTok Pixel', kind: 'Social pixel', url: 'https://analytics.tiktok.com/i18n/pixel/events.js' },
    { name: 'X (Twitter) Pixel', kind: 'Social pixel', url: 'https://static.ads-twitter.com/uwt.js' },
    { name: 'Google Analytics', kind: 'Analytics', url: 'https://www.google-analytics.com/analytics.js' },
    { name: 'Google Tag Manager', kind: 'Analytics', url: 'https://www.googletagmanager.com/gtm.js' },
    { name: 'Comscore', kind: 'Analytics', url: 'https://sb.scorecardresearch.com/beacon.js' },
  ],

  // Optional: show a real ad served to this browser. Needs your own Google Ad
  // Manager ad unit. Experimental: not yet tested against a live ad unit.
  // Example: { adUnitPath: '/1234567/ad_mirror_probe', size: [300, 250] }
  adSlot: null,
};
