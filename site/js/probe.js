// Ad and tracker checks.
// baitTest() is local only. liveProbe() contacts third-party servers and must
// only run when config.autoRunLiveProbe is on or the visitor asks for it.

// Ad blockers hide elements whose class names look like ads. A bait element
// that collapses tells us a cosmetic filter is active. No network involved.
export function baitTest() {
  return new Promise((resolve) => {
    const bait = document.createElement('div');
    // probe-bait (styles.css) parks it off-screen; the rest are ad-like names.
    bait.className = 'probe-bait ad ads adsbox ad-banner ad-placeholder pub_300x250 textads banner-ads';
    bait.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bait);
    // Give cosmetic filters time to apply.
    setTimeout(() => {
      const style = getComputedStyle(bait);
      const hidden = bait.offsetHeight === 0 || style.display === 'none' || style.visibility === 'hidden';
      bait.remove();
      resolve({ blockerDetected: hidden });
    }, 300);
  });
}

// Resolves 'reachable' when any HTTP response comes back (no-cors responses
// are opaque, so status codes are invisible to us), 'blocked' when the browser,
// an extension or DNS filtering stops the request, and 'timeout' otherwise.
async function check(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    await fetch(url, {
      mode: 'no-cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    return { status: 'reachable', ms: Math.round(performance.now() - started) };
  } catch (err) {
    return { status: err && err.name === 'AbortError' ? 'timeout' : 'blocked', ms: Math.round(performance.now() - started) };
  } finally {
    clearTimeout(timer);
  }
}

export async function liveProbe(cfg, onResult) {
  const control = await check(cfg.control.url, cfg.probeTimeoutMs);
  if (control.status !== 'reachable') {
    return { trusted: false, control, results: [] };
  }
  const results = await Promise.all(cfg.probes.map(async (p) => {
    const r = await check(p.url, cfg.probeTimeoutMs);
    const result = { ...p, host: new URL(p.url).host, ...r };
    if (onResult) onResult(result);
    return result;
  }));
  return { trusted: true, control, results };
}

// Counts requests this page has made to other servers, using the browser's
// own record. Lets visitors verify the "nothing leaves your browser" claim.
export function thirdPartyRequests() {
  try {
    return performance.getEntriesByType('resource')
      .map((e) => new URL(e.name, location.href))
      .filter((u) => u.origin !== location.origin && u.protocol.startsWith('http'))
      .map((u) => u.host);
  } catch {
    return [];
  }
}
