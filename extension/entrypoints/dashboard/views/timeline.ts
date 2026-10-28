import type { StoredEvent } from '../../../src/store/db';
import type { AdEvent } from '../../../src/types';
import { el, icon, type IconName } from '../../../src/ui/dom';
import { dayOf, describe, timeOf } from '../../../src/ui/format';
import { emptyState, retentionText, viewHead, type View } from './context';

type Filter = 'actions' | 'ad_click' | 'search' | 'tracker';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'actions', label: 'What sites told' },
  { id: 'ad_click', label: 'Ad clicks' },
  { id: 'search', label: 'Searches' },
  { id: 'tracker', label: 'Companies that saw you' },
];

const ICONS: Record<AdEvent['kind'], IconName> = {
  tracker: 'eye',
  reported: 'cart',
  ad_click: 'click',
  search: 'search',
};
const PAGE = 200;

// Remembered while the dashboard is open, so switching views keeps the choice.
const active = new Set<Filter>(['actions', 'ad_click', 'search']);
let shown = PAGE;

function matches(e: StoredEvent): boolean {
  if (e.kind === 'reported') return active.has('actions') && e.action !== 'page_view';
  return active.has(e.kind);
}

export const timeline: View = (ctx) => {
  const head = viewHead(
    'Timeline',
    `Everything Ad Mirror recorded over ${retentionText(ctx.settings.retentionDays)}, newest first. Page visits are left out to keep it readable.`,
  );
  if (!ctx.events.length) return [head, emptyState('clock', 'Nothing yet', 'Records appear here as you browse.')];

  const filters = el(
    'div',
    { class: 'filters', role: 'group', 'aria-label': 'Show' },
    ...FILTERS.map((f) => {
      const b = el('button', { class: 'filter', type: 'button', 'aria-pressed': String(active.has(f.id)) }, f.label);
      b.addEventListener('click', () => {
        if (active.has(f.id)) active.delete(f.id);
        else active.add(f.id);
        shown = PAGE;
        void ctx.refresh();
      });
      return b;
    }),
  );

  const list = ctx.events.filter(matches).reverse();
  const days = new Map<string, StoredEvent[]>();
  for (const e of list.slice(0, shown)) {
    const day = dayOf(e.ts);
    days.set(day, [...(days.get(day) ?? []), e]);
  }

  const sections = [...days].map(([day, items]) =>
    el(
      'section',
      { class: 'day' },
      el('h2', {}, day),
      el(
        'ul',
        { class: 'rows' },
        ...items.map((e) =>
          el(
            'li',
            { class: 'event', 'data-kind': e.kind },
            el('span', { class: 'event-icon' }, icon(ICONS[e.kind])),
            el('span', {}, describe(e)),
            el('time', { class: 'event-time', datetime: new Date(e.ts).toISOString() }, timeOf(e.ts)),
          ),
        ),
      ),
    ),
  );

  const nodes: Node[] = [head, filters];
  if (!list.length) nodes.push(emptyState('clock', 'Nothing matches', 'Choose another filter above.'));
  else nodes.push(el('div', { class: 'card' }, ...sections));
  if (list.length > shown) {
    const more = el(
      'button',
      { class: 'btn btn-outlined', type: 'button' },
      `Show more (${String(list.length - shown)} left)`,
    );
    more.addEventListener('click', () => {
      shown += PAGE;
      void ctx.refresh();
    });
    nodes.push(more);
  }
  return nodes;
};
