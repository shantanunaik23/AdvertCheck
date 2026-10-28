// On-page alert feed (ADR 0005). An unlisted script, so it carries none of
// WXT's content-script wrapper (which signals the page and watches
// navigation). The background registers it as a content script only while
// the user has "Show alerts on websites" switched on. It only renders what the
// background sends about this tab: it never reads the page, listens to page
// events or makes network requests. Text is set with text nodes only.

import type { FeedItem, FeedMessage } from '../src/feed';

const STYLES = `
:host { all: initial; }
.root {
  --bg: #ffffff; --ink: #1f1f1f; --ink-2: #444746; --line: #dfe3ea; --chip: #f0f4f9;
  --primary: #0b57d0; --on-primary: #ffffff; --warn: #ffdcb5; --on-warn: #2c1600;
  --bad: #f9dedc; --on-bad: #410e0b;
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
  font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  color: var(--ink); color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  .root {
    --bg: #1b1c1d; --ink: #e3e3e3; --ink-2: #c4c7c5; --line: #333537; --chip: #2a2b2d;
    --primary: #a8c7fa; --on-primary: #062e6f; --warn: #5c3800; --on-warn: #ffdcb5;
    --bad: #8c1d18; --on-bad: #f9dedc; color-scheme: dark;
  }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
button { font: inherit; cursor: pointer; border: 0; }
button:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.pill {
  display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px 0 12px;
  border-radius: 999px; background: var(--primary); color: var(--on-primary);
  font-weight: 600; box-shadow: 0 2px 10px rgb(0 0 0 / 0.25);
}
.panel {
  width: min(340px, calc(100vw - 32px)); max-height: min(60vh, 520px);
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--bg); border: 1px solid var(--line); border-radius: 20px;
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.22);
}
.head { display: flex; align-items: center; gap: 8px; padding: 12px 8px 12px 16px; border-bottom: 1px solid var(--line); }
.title { flex: 1; font-weight: 700; font-size: 15px; }
.icon-btn {
  width: 36px; height: 36px; border-radius: 50%; background: transparent; color: var(--ink-2);
  font-size: 18px; line-height: 36px; text-align: center;
}
.icon-btn:hover { background: var(--chip); }
.body { overflow-y: auto; padding: 12px 16px; display: grid; gap: 10px; }
.basics { padding: 10px 12px; border-radius: 12px; background: var(--chip); }
.basics .sent li { background: var(--bg); }
.list { list-style: none; }
.rest { color: var(--ink-2); font-size: 13px; }
.item { padding: 10px 0; border-bottom: 1px solid var(--line); }
.item:last-child { border-bottom: 0; }
.item.new { animation: flash 1.2s ease-out; }
@keyframes flash { from { background: var(--warn); } to { background: transparent; } }
.who { font-weight: 700; margin-bottom: 6px; }
.got { color: var(--ink-2); font-size: 13px; margin: 2px 0 6px; }
.sent { list-style: none; display: flex; flex-wrap: wrap; gap: 4px; }
.sent li { padding: 2px 10px; border-radius: 999px; background: var(--chip); font-size: 12.5px; }
.sent li.told { background: var(--warn); color: var(--on-warn); font-weight: 600; }
.sent li.email { background: var(--bad); color: var(--on-bad); font-weight: 600; }

.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.foot { padding: 8px 16px 12px; font-size: 12px; color: var(--ink-2); border-top: 1px solid var(--line); }
@media (prefers-reduced-motion: reduce) { .item.new { animation: none; } }
`;

const MINIMISED_KEY = 'feedMinimised';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** "Amazon, Google and 2 other ad companies" (unknown companies arrive as "An ad company"). */
function namesOf(items: FeedItem[]): string {
  const brands = [...new Set(items.map((i) => i.who).filter((w) => w !== 'An ad company'))];
  const others = items.length - items.filter((i) => i.who !== 'An ad company').length;
  const parts = [...brands];
  if (others) {
    const word = others === 1 ? 'ad company' : 'ad companies';
    parts.push(`${String(others)} ${brands.length ? 'other ' : ''}${word}`);
  }
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1) ?? ''}`;
}

// Messages come from our own background script, but check their shape anyway.
function isItems(value: unknown): value is FeedItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (i: unknown) =>
        typeof i === 'object' &&
        i !== null &&
        typeof (i as FeedItem).who === 'string' &&
        Array.isArray((i as FeedItem).sent) &&
        (i as FeedItem).sent.every((s) => typeof s === 'string'),
    )
  );
}

export default defineUnlistedScript({
  main() {
    if (window.top !== window) return;

    const host = document.createElement('ad-mirror-feed');
    const shadow = host.attachShadow({ mode: 'open' });
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(STYLES);
      shadow.adoptedStyleSheets = [sheet];
    } catch {
      shadow.append(el('style', '', STYLES));
    }
    const root = el('div', 'root');
    // A permanent live region, so screen readers hear updates even though the
    // panel itself is redrawn.
    const status = el('p', 'sr');
    status.setAttribute('role', 'status');
    const view = el('div');
    root.append(status, view);
    shadow.append(root);

    let items: FeedItem[] = [];
    const seen = new Set<string>();
    let minimised = false;
    let closed = false;

    const render = () => {
      if (closed || !items.length) {
        view.replaceChildren();
        return;
      }
      const count = `${String(items.length)} ${items.length === 1 ? 'company' : 'companies'} got data from this page`;
      if (status.textContent !== count) status.textContent = count;
      if (minimised) {
        const pill = el('button', 'pill', `Ad Mirror · ${String(items.length)}`);
        pill.setAttribute('aria-label', `${count}. Show details`);
        pill.setAttribute('aria-expanded', 'false');
        pill.addEventListener('click', () => {
          minimised = false;
          void browser.storage.local.set({ [MINIMISED_KEY]: false });
          render();
        });
        view.replaceChildren(pill);
        return;
      }

      const panel = el('section', 'panel');
      panel.setAttribute('aria-label', 'Ad Mirror: who got your data on this page');
      const head = el('div', 'head');
      const title = el('h2', 'title', count);
      const min = el('button', 'icon-btn', '–');
      min.setAttribute('aria-label', 'Minimise');
      min.setAttribute('aria-expanded', 'true');
      min.addEventListener('click', () => {
        minimised = true;
        void browser.storage.local.set({ [MINIMISED_KEY]: true });
        render();
      });
      const close = el('button', 'icon-btn', '×');
      close.setAttribute('aria-label', 'Close for this page');
      close.addEventListener('click', () => {
        closed = true;
        render();
      });
      head.append(title, min, close);

      // The first three entries of every item are the basic data any contacted
      // company gets (BASIC_DATA in src/feed.ts). Say that once, then list only
      // the companies that were told more, most revealing first.
      const basics = items[0]?.sent.slice(0, 3) ?? [];
      const extra = (i: FeedItem) => i.sent.slice(3);
      const told = items
        .filter((i) => extra(i).length)
        .sort((a, b) => Number(b.email) - Number(a.email) || extra(b).length - extra(a).length);
      const onlyBasics = items.filter((i) => !extra(i).length);

      const body = el('div', 'body');
      const basicsBox = el('div', 'basics');
      const basicsList = el('ul', 'sent');
      for (const b of basics) basicsList.append(el('li', '', b));
      basicsBox.append(el('p', 'got', items.length === 1 ? 'It got:' : 'All of them got:'), basicsList);
      body.append(basicsBox);

      if (told.length) {
        const list = el('ol', 'list');
        for (const item of told.slice(0, 20)) {
          const key = `${item.companyId}|${String(item.sent.length)}`;
          const li = el('li', seen.has(key) ? 'item' : 'item new');
          seen.add(key);
          const sent = el('ul', 'sent');
          for (const s of extra(item))
            sent.append(el('li', s === 'Your email address (in code)' ? 'email' : 'told', s));
          li.append(el('p', 'who', `${item.who} was also told:`), sent);
          list.append(li);
        }
        body.append(list);
      }
      if (onlyBasics.length && told.length) {
        body.append(el('p', 'rest', `${namesOf(onlyBasics)} got only the basics.`));
      } else if (onlyBasics.length) {
        body.append(el('p', 'rest', `They were ${namesOf(onlyBasics)}.`));
      }

      const foot = el('p', 'foot', 'Ad Mirror · recorded only on this device');
      panel.append(head, body, foot);
      view.replaceChildren(panel);
    };

    const update = (next: unknown) => {
      if (!isItems(next)) return;
      items = next;
      render();
    };

    browser.runtime.onMessage.addListener((message: FeedMessage, sender) => {
      if (sender.id !== browser.runtime.id || message.type !== 'ad-mirror/feed') return undefined;
      update(message.items);
      return undefined;
    });

    void browser.storage.local.get(MINIMISED_KEY).then((stored) => {
      minimised = stored[MINIMISED_KEY] === true;
      document.documentElement.append(host);
      const hello: FeedMessage = { type: 'ad-mirror/feed-hello' };
      void browser.runtime.sendMessage(hello).then(update, () => undefined);
    });
  },
});
