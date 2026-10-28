import type { StoredEvent } from '../../../src/store/db';
import type { Settings } from '../../../src/store/settings';
import { el, icon, type IconName } from '../../../src/ui/dom';

export interface Ctx {
  events: StoredEvent[];
  settings: Settings;
  /** Reloads data and redraws the current view. */
  refresh: () => Promise<void>;
}

export type View = (ctx: Ctx) => Node[] | Promise<Node[]>;

export function viewHead(title: string, intro: string): HTMLElement {
  return el('div', { class: 'view-head' }, el('h1', {}, title), el('p', {}, intro));
}

export function emptyState(iconName: IconName, title: string, text: string): HTMLElement {
  return el(
    'div',
    { class: 'card empty' },
    icon(iconName),
    el('p', { class: 'setting-title' }, title),
    el('p', {}, text),
  );
}

export function sectionTitle(title: string, link?: { href: string; label: string }): HTMLElement {
  return el(
    'div',
    { class: 'section-title' },
    el('h2', {}, title),
    link ? el('a', { href: link.href, class: 'small' }, link.label) : null,
  );
}

export function retentionText(days: number): string {
  return days === 365 ? 'the last year' : `the last ${String(days)} days`;
}
