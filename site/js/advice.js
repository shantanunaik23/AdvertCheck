// Step-by-step fixes for the visitor's own browser.
// Paths and products verified October 2026; see the they-spy-design skill
// for sources. Each fix is { intro?, steps: [{ text, link? }] }.

export const BROWSER_NAMES = {
  chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox', safari: 'Safari', brave: 'Brave',
  samsung: 'Samsung Internet', opera: 'Opera', other: 'your browser',
};

const LINKS = {
  ubol: { label: 'Get uBlock Origin Lite', href: 'https://ublockorigin.com/' },
  ubo: { label: 'Get uBlock Origin for Firefox', href: 'https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/' },
  badger: { label: 'Get Privacy Badger', href: 'https://privacybadger.org/' },
  firefox: { label: 'Get Firefox', href: 'https://www.mozilla.org/firefox/' },
  brave: { label: 'Get Brave', href: 'https://brave.com/' },
};

function platform({ os }) {
  if (os === 'iOS' || os === 'iPadOS') return 'ios';
  if (os === 'Android') return 'android';
  return 'desktop';
}

function adBlocker(ctx) {
  const where = platform(ctx);
  if (ctx.family === 'brave') {
    return { steps: [
      { text: 'Brave blocks ads with its built-in Shields. Tap or click the lion icon in the address bar.' },
      { text: 'Make sure Shields are up, and set trackers and ads blocking to Aggressive for stronger protection.' },
    ] };
  }
  if (where === 'ios') {
    return {
      intro: 'On iPhone and iPad, ad blockers only work in Safari.',
      steps: [
        { text: 'Install uBlock Origin Lite from the App Store. It is free and open source.', link: LINKS.ubol },
        { text: 'Open Settings, then Apps, then Safari, then Extensions, and turn uBlock Origin Lite on.' },
        { text: 'Use Safari for browsing so the blocker can protect you.' },
      ],
    };
  }
  if (where === 'android' && ctx.family === 'samsung') {
    return { steps: [
      { text: 'Open the menu (three lines) and tap Ad blockers.' },
      { text: 'Install one of the free blockers from the list, then turn it on.' },
    ] };
  }
  if (where === 'android' && ctx.family !== 'firefox') {
    return {
      intro: 'Chrome for Android cannot run ad blockers.',
      steps: [
        { text: 'Install Firefox from the Play Store.', link: LINKS.firefox },
        { text: 'In Firefox, open the menu, tap Add-ons, and add uBlock Origin.' },
        { text: 'Or use Brave, which blocks ads without any add-ons.', link: LINKS.brave },
      ],
    };
  }
  if (ctx.family === 'firefox') {
    return { steps: [
      { text: 'Add uBlock Origin to Firefox. It is free, open source and blocks ads and trackers.', link: LINKS.ubo },
      { text: 'Select Add to Firefox, then Add. It starts working straight away.' },
    ] };
  }
  if (ctx.family === 'safari') {
    return { steps: [
      { text: 'Install uBlock Origin Lite from the Mac App Store. It is free and open source.', link: LINKS.ubol },
      { text: 'Open Safari, then Settings, then Extensions, and tick uBlock Origin Lite.' },
    ] };
  }
  const name = BROWSER_NAMES[ctx.family] || 'your browser';
  return { steps: [
    { text: 'Install uBlock Origin Lite. It is free, open source and blocks ads and trackers.', link: LINKS.ubol },
    { text: `Choose ${name} on that page, then select Add or Get. It starts working straight away.` },
  ] };
}

function servers(ctx) {
  const fix = adBlocker(ctx);
  const extra = [];
  if (ctx.family === 'edge') {
    extra.push({ text: 'For more protection, open Settings, then Privacy, search, and services, and set Tracking prevention to Strict.' });
  } else if (ctx.family === 'firefox') {
    extra.push({ text: 'For more protection, open Settings, then Privacy & Security, and set Enhanced Tracking Protection to Strict.' });
  } else if (ctx.family === 'chrome' && platform(ctx) === 'desktop') {
    extra.push({ text: 'Also open Settings, then Privacy and security, then Third-party cookies, and choose Block third-party cookies.' });
  }
  return { intro: 'An ad blocker stops your browser from contacting most of these servers.', steps: [...fix.steps, ...extra] };
}

function fingerprint(ctx) {
  const where = platform(ctx);
  if (ctx.family === 'safari' || where === 'ios') {
    return where === 'ios'
      ? { steps: [
          { text: 'Open Settings, then Apps, then Safari, then Advanced.' },
          { text: 'Tap Advanced Tracking and Fingerprinting Protection and choose All Browsing.' },
          { text: 'This protects Safari only. Other browsers on iPhone do not scramble fingerprints.' },
        ] }
      : { steps: [
          { text: 'Open Safari, then Settings, then Advanced.' },
          { text: 'Set "Use advanced tracking and fingerprinting protection" to "in all browsing".' },
        ] };
  }
  if (ctx.family === 'firefox') {
    return { steps: [
      { text: 'Open Settings, then Privacy & Security.' },
      { text: 'Under Enhanced Tracking Protection, choose Strict. This blocks known fingerprinting scripts.' },
      { text: 'If a site stops working, select the shield icon in the address bar to turn protection off for that site only.' },
    ] };
  }
  if (ctx.family === 'brave') {
    return { steps: [
      { text: 'Select the lion icon in the address bar and make sure fingerprinting is blocked.' },
    ] };
  }
  if (ctx.family === 'edge') {
    return {
      intro: 'Edge cannot scramble your fingerprint, but it can block known fingerprinting scripts.',
      steps: [
        { text: 'Open Settings, then Privacy, search, and services.' },
        { text: 'Set Tracking prevention to Strict.' },
        { text: 'For full protection, use a browser that scrambles fingerprints, such as Firefox or Brave.', link: LINKS.firefox },
      ],
    };
  }
  const name = BROWSER_NAMES[ctx.family] || 'Your browser';
  return {
    intro: `${name === 'your browser' ? 'Your browser' : name} has no setting that stops fingerprinting.`,
    steps: [
      { text: 'An ad blocker stops many fingerprinting scripts from loading, so start there.' },
      { text: 'For full protection, switch to a browser that scrambles fingerprints. Firefox and Brave are free.', link: LINKS.firefox },
    ],
  };
}

function gpc(ctx) {
  const where = platform(ctx);
  const intro = 'Sites must obey this signal in California and several other US states. Elsewhere it is a request that some sites respect.';
  if (ctx.family === 'firefox') {
    return { intro, steps: [
      { text: 'Open Settings, then Privacy & Security.' },
      { text: 'Turn on "Tell websites not to sell or share my data".' },
    ] };
  }
  if (where === 'desktop' && ['chrome', 'edge', 'opera'].includes(ctx.family)) {
    return { intro, steps: [
      { text: `${BROWSER_NAMES[ctx.family]} has no switch for this signal.` },
      { text: 'Add Privacy Badger, a free extension from the Electronic Frontier Foundation. It sends the signal for you and blocks hidden trackers.', link: LINKS.badger },
    ] };
  }
  return { intro, steps: [
    { text: 'Your browser has no switch for this signal yet.' },
    { text: 'Firefox and Brave send it for you.', link: LINKS.firefox },
  ] };
}

export function fixFor(check, ctx) {
  return { blocker: adBlocker, servers, fingerprint, gpc }[check](ctx);
}
