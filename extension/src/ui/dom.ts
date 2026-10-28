// DOM helpers for extension pages. Text is only ever set with text nodes, so
// nothing read from websites (product names, search words) can become markup.

type Child = Node | string | number | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// 24px stroke icons, shared with the website's icon set.
const ICONS = {
  logo: 'M12 2a6.5 8 0 1 0 0 16a6.5 8 0 1 0 0-16zM12 18v3.5M8.5 21.5h7M9.5 8l3-3M9.5 11.5l5.5-5.5',
  shield: 'M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6l7-3zM9 12l2 2 4-4',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
  cart: 'M3 4h2l2.5 11h11L21 8H6.5M9.5 20a1 1 0 1 0 0-.01M17.5 20a1 1 0 1 0 0-.01',
  click: 'M9 9l11 4-5 2-2 5-4-11zM4 4l2 2M4 10h2M10 4v2',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13zM20 20l-4.8-4.8',
  building: 'M4 21V5l8-2v18M12 9h8v12M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2M2 21h20',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2',
  spark: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  pause: 'M8 5v14M16 5v14',
  play: 'M8 5.5v13l10-6.5-10-6.5z',
  lock: 'M5 10.5h14v10H5zM8 10.5v-3a4 4 0 0 1 8 0v3',
  alert: 'M12 3.5L2.5 20h19L12 3.5zM12 9.5v4M12 17h.01',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 11v5.5M12 7.5h.01',
  external: 'M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  download: 'M12 4v11M7 10.5l5 5 5-5M5 20h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, cls = 'icon'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICONS[name]);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

/** First letter of a company name, for its avatar. */
export function avatar(name: string): HTMLElement {
  return el(
    'span',
    { class: 'avatar', 'aria-hidden': 'true' },
    name
      .replace(/^[^a-z0-9]+/i, '')
      .charAt(0)
      .toUpperCase() || '?',
  );
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
}
