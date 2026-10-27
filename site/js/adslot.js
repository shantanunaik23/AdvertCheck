// Optional live ad slot using Google Publisher Tag (GPT).
// Only loaded when config.adSlot is set. Experimental: written against the
// public GPT API but not yet tested with a live ad unit.
// Limitation: it shows ads from the publisher's own Ad Manager account and the
// exchanges connected to it, not every network that profiles the visitor.

const GPT_URL = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';

export function runAdSlot(slotCfg, container) {
  return new Promise((resolve) => {
    const divId = 'ad-mirror-slot';
    const holder = document.createElement('div');
    holder.id = divId;
    holder.className = 'ad-slot';
    container.appendChild(holder);

    const timer = setTimeout(() => resolve({ status: 'timeout' }), 10000);
    const script = document.createElement('script');
    script.src = GPT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => { clearTimeout(timer); resolve({ status: 'blocked' }); };
    document.head.appendChild(script);

    window.googletag = window.googletag || { cmd: [] };
    window.googletag.cmd.push(() => {
      const gt = window.googletag;
      const slot = gt.defineSlot(slotCfg.adUnitPath, slotCfg.size, divId);
      if (!slot) { clearTimeout(timer); resolve({ status: 'error' }); return; }
      slot.addService(gt.pubads());
      gt.pubads().addEventListener('slotRenderEnded', (e) => {
        if (e.slot !== slot) return;
        clearTimeout(timer);
        resolve({
          status: e.isEmpty ? 'empty' : 'filled',
          advertiserId: e.advertiserId || null,
          campaignId: e.campaignId || null,
          creativeId: e.creativeId || null,
          size: Array.isArray(e.size) ? e.size.join(' × ') : null,
        });
      });
      gt.enableServices();
      gt.display(divId);
    });
  });
}

// Extra CSP sources GPT needs. Used by scripts/build.mjs only when adSlot is set.
export const GPT_CSP = {
  'script-src': ['https://securepubads.g.doubleclick.net', 'https://pagead2.googlesyndication.com', 'https://tpc.googlesyndication.com'],
  'frame-src': ['https://*.googlesyndication.com', 'https://*.doubleclick.net'],
  'connect-src': ['https://*.doubleclick.net', 'https://pagead2.googlesyndication.com'],
  'img-src': ['https://*.googlesyndication.com', 'https://*.doubleclick.net', 'https://*.gstatic.com'],
};
