// On-page alerts (ADR 0005). An unlisted script, so it carries none of WXT's
// content-script wrapper (which signals the page and watches navigation).
// The background registers it as a content script only while the user has
// "Show alerts on websites" switched on. It only renders what the background
// sends about this tab: it never reads the page, listens to page events or
// makes network requests. Text is set with text nodes only.
//
// Shopping moments (and a site giving away your email) pop up as alerts with
// a line on why they matter. Everything else waits behind a small button.

import type { FeedItem, FeedMessage, Highlight } from '../src/feed';

const STYLES = `
:host { all: initial; }
.root {
  --bg: #ffffff; --ink: #1f1f1f; --ink-2: #444746; --line: #dfe3ea; --chip: #f0f4f9;
  --primary: #0b57d0; --on-primary: #ffffff; --warn: #ffdcb5; --on-warn: #2c1600;
  --bad: #f9dedc; --on-bad: #410e0b; --accent: #8a4f00; --accent-bad: #b3261e;
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
  font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  color: var(--ink); color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  .root {
    --bg: #1b1c1d; --ink: #e3e3e3; --ink-2: #c4c7c5; --line: #333537; --chip: #2a2b2d;
    --primary: #a8c7fa; --on-primary: #062e6f; --warn: #5c3800; --on-warn: #ffdcb5;
    --bad: #8c1d18; --on-bad: #f9dedc; --accent: #ffb95c; --accent-bad: #f2b8b5; color-scheme: dark;
  }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
button { font: inherit; cursor: pointer; border: 0; color: inherit; }
button:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.toasts { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.toast {
  width: min(340px, calc(100vw - 32px)); display: grid; grid-template-columns: 1fr auto; gap: 4px 8px;
  padding: 14px 8px 14px 16px; border-radius: 16px; background: var(--bg); border: 1px solid var(--line);
  border-left: 6px solid var(--accent); box-shadow: 0 4px 24px rgb(0 0 0 / 0.22);
  animation: slide 220ms ease-out;
}
.toast.email { border-left-color: var(--accent-bad); }
@keyframes slide { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
.toast-title { font-weight: 700; font-size: 15px; }
.toast-why { grid-column: 1; color: var(--ink-2); }
.toast-more { grid-column: 1; justify-self: start; margin-top: 4px; background: none; color: var(--primary); font-weight: 600; text-decoration: underline; padding: 2px 0; }
.toast .icon-btn { grid-row: 1 / span 2; grid-column: 2; align-self: start; }
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
.who { font-weight: 700; margin-bottom: 6px; }
.got { color: var(--ink-2); font-size: 13px; margin: 2px 0 6px; }
.sent { list-style: none; display: flex; flex-wrap: wrap; gap: 4px; }
.sent li { padding: 2px 10px; border-radius: 999px; background: var(--chip); font-size: 12.5px; }
.sent li.told { background: var(--warn); color: var(--on-warn); font-weight: 600; }
.sent li.email { background: var(--bad); color: var(--on-bad); font-weight: 600; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.foot { padding: 8px 16px 12px; font-size: 12px; color: var(--ink-2); border-top: 1px solid var(--line); }
@media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
`;

/** How long an alert stays up, unless the pointer or keyboard focus is on it. */
const TOAST_MS = 12_000;
const MAX_TOASTS = 2;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconButton(symbol: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', 'icon-btn', symbol);
  b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

/** "Amazon, Google and 2 other ad companies" (unknown companies arrive as "An ad company"). */
function namesOf(items: FeedItem[]): string {
  const brands = [...new Set(items.map((i) => i.who).filter((w) => w !== 'An ad company'))];
  const others = items.filter((i) => i.who === 'An ad company').length;
  const parts = [...brands];
  if (others)
    parts.push(`${String(others)} ${brands.length ? 'other ' : ''}${others === 1 ? 'ad company' : 'ad companies'}`);
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1) ?? ''}`;
}

const watching = (n: number) => `${String(n)} ${n === 1 ? 'ad company is' : 'ad companies are'} watching this page`;

// Messages come from our own background script, but check their shape anyway.
function isItems(value: unknown): value is FeedItem[] {
  const isText = (s: unknown) => typeof s === 'string';
  return (
    Array.isArray(value) &&
    value.every((i: unknown) => {
      const item = i as Partial<FeedItem> | null;
      return (
        typeof item === 'object' &&
        item !== null &&
        isText(item.who) &&
        Array.isArray(item.sent) &&
        item.sent.every(isText) &&
        Array.isArray(item.highlights) &&
        item.highlights.every((h: Partial<Highlight>) => isText(h.id) && isText(h.title) && isText(h.why))
      );
    })
  );
}

export default defineUnlistedScript({
  main() {
    if (window.top !== window) return;

    const host = document.createElement('they-spy-feed');
    const shadow = host.attachShadow({ mode: 'open' });
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(STYLES);
      shadow.adoptedStyleSheets = [sheet];
    } catch {
      shadow.append(el('style', '', STYLES));
    }
    const root = el('div', 'root');
    // A permanent live region, so screen readers hear alerts even though the
    // rest is redrawn.
    const status = el('p', 'sr');
    status.setAttribute('role', 'status');
    const toasts = el('div', 'toasts');
    const view = el('div');
    root.append(status, toasts, view);
    shadow.append(root);

    let items: FeedItem[] = [];
    let open = false;
    let closed = false;
    const shown = new Set<string>();

    const render = () => {
      if (closed || !items.length) {
        view.replaceChildren();
        return;
      }
      const count = watching(items.length);
      if (!open) {
        const pill = el('button', 'pill', `They Spy · ${String(items.length)}`);
        pill.setAttribute('aria-label', `${count}. Show details`);
        pill.setAttribute('aria-expanded', 'false');
        pill.addEventListener('click', () => {
          open = true;
          render();
        });
        view.replaceChildren(pill);
        return;
      }

      const panel = el('section', 'panel');
      panel.setAttribute('aria-label', 'They Spy: who is watching this page');
      const head = el('div', 'head');
      const min = iconButton('–', 'Minimise', () => {
        open = false;
        render();
      });
      min.setAttribute('aria-expanded', 'true');
      head.append(
        el('h2', 'title', count),
        min,
        iconButton('×', 'Close for this page', () => {
          closed = true;
          render();
        }),
      );

      // The first three entries of every item are the basics any contacted
      // company gets (BASIC_DATA in src/feed.ts). Say that once, then list only
      // the companies that know more, most revealing first.
      const basics = items[0]?.sent.slice(0, 3) ?? [];
      const extra = (i: FeedItem) => i.sent.slice(3);
      const knowMore = items
        .filter((i) => extra(i).length)
        .sort((a, b) => Number(b.email) - Number(a.email) || extra(b).length - extra(a).length);
      const onlyBasics = items.filter((i) => !extra(i).length);

      const body = el('div', 'body');
      const basicsBox = el('div', 'basics');
      const basicsList = el('ul', 'sent');
      for (const b of basics) basicsList.append(el('li', '', b));
      basicsBox.append(el('p', 'got', items.length === 1 ? 'It gets:' : 'Every one of them gets:'), basicsList);
      body.append(basicsBox);

      if (knowMore.length) {
        const list = el('ol', 'list');
        for (const item of knowMore.slice(0, 20)) {
          const sent = el('ul', 'sent');
          for (const s of extra(item)) sent.append(el('li', s.startsWith('Your email') ? 'email' : 'told', s));
          const li = el('li', 'item');
          li.append(el('p', 'who', `${item.who} also knows:`), sent);
          list.append(li);
        }
        body.append(list);
      }
      if (onlyBasics.length) {
        body.append(
          el(
            'p',
            'rest',
            knowMore.length ? `${namesOf(onlyBasics)} just got the basics.` : `They are ${namesOf(onlyBasics)}.`,
          ),
        );
      }

      panel.append(head, body, el('p', 'foot', 'They Spy · kept only on this device'));
      view.replaceChildren(panel);
    };

    const showToast = (h: Highlight) => {
      const toast = el('div', h.kind === 'email' ? 'toast email' : 'toast');
      toast.setAttribute('role', 'group');
      toast.setAttribute('aria-label', h.title);
      const remove = () => {
        clearTimeout(timer);
        toast.remove();
      };
      let timer = setTimeout(remove, TOAST_MS);
      // Stay up while someone is reading or using it (WCAG 2.2.1).
      const hold = () => {
        clearTimeout(timer);
      };
      const release = () => {
        timer = setTimeout(remove, TOAST_MS);
      };
      toast.addEventListener('mouseenter', hold);
      toast.addEventListener('focusin', hold);
      toast.addEventListener('mouseleave', release);
      toast.addEventListener('focusout', release);

      const more = el('button', 'toast-more', 'See who else is watching');
      more.addEventListener('click', () => {
        open = true;
        remove();
        render();
      });
      toast.append(
        el('p', 'toast-title', h.title),
        iconButton('×', 'Dismiss', remove),
        el('p', 'toast-why', h.why),
        more,
      );
      toasts.append(toast);
      while (toasts.children.length > MAX_TOASTS) toasts.firstElementChild?.remove();
      status.textContent = h.title;
    };

    const update = (next: unknown) => {
      if (!isItems(next)) return;
      items = next;
      // Pop up shopping moments not seen yet on this page, newest last.
      const fresh = items.flatMap((i) => i.highlights).filter((h) => !shown.has(h.id));
      for (const h of fresh) shown.add(h.id);
      if (!closed) for (const h of fresh.slice(-MAX_TOASTS)) showToast(h);
      render();
    };

    browser.runtime.onMessage.addListener((message: FeedMessage, sender) => {
      if (sender.id !== browser.runtime.id || message.type !== 'they-spy/feed') return undefined;
      update(message.items);
      return undefined;
    });

    document.documentElement.append(host);
    const hello: FeedMessage = { type: 'they-spy/feed-hello' };
    void browser.runtime.sendMessage(hello).then(update, () => undefined);
  },
});
