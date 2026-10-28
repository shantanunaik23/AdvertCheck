import { summariseCompanies } from '../../../src/insights/summary';
import { avatar, el, plural } from '../../../src/ui/dom';
import { ACTION_LABELS, dayOf, describe } from '../../../src/ui/format';
import { emptyState, retentionText, viewHead, type View } from './context';

export const companies: View = ({ events, settings }) => {
  const list = summariseCompanies(events);
  const head = viewHead(
    'Who knows about you',
    `Every ad and tracking company that saw you over ${retentionText(settings.retentionDays)}, with the sites where it saw you and what those sites told it.`,
  );
  if (!list.length) return [head, emptyState('building', 'No companies yet', 'Companies appear here as you browse.')];

  const items = list.map((c) => {
    const counts = new Map<string, number>();
    for (const t of c.told) counts.set(ACTION_LABELS[t.action], (counts.get(ACTION_LABELS[t.action]) ?? 0) + 1);
    const details = el(
      'details',
      { class: 'company' },
      el(
        'summary',
        {},
        avatar(c.name),
        el(
          'div',
          {},
          el('p', {}, el('strong', {}, c.name)),
          el(
            'div',
            { class: 'company-meta' },
            el('span', { class: 'small muted' }, `Saw you on ${plural(c.sites.length, 'site')}`),
            ...[...counts].map(([label, n]) => el('span', { class: 'chip chip-warn' }, `${label} ×${String(n)}`)),
            c.identityShared ? el('span', { class: 'chip chip-bad' }, 'Got your email or phone') : null,
          ),
        ),
        el('span', { class: 'small muted' }, `Last: ${dayOf(c.lastSeen)}`),
      ),
      el(
        'div',
        { class: 'company-body' },
        el('p', { class: 'small muted' }, 'Sites'),
        el('div', { class: 'site-list' }, ...c.sites.slice(0, 40).map((s) => el('span', { class: 'chip' }, s))),
        c.told.length ? el('p', { class: 'small muted' }, 'What sites told it') : null,
        c.told.length
          ? el(
              'ul',
              { class: 'rows' },
              ...c.told
                .slice(-20)
                .reverse()
                .map((t) => el('li', { class: 'small told' }, describe(t))),
            )
          : null,
      ),
    );
    return el('li', {}, details);
  });

  return [
    head,
    el('p', { class: 'muted' }, `${plural(list.length, 'company', 'companies')}, most widespread first.`),
    el('section', { class: 'card' }, el('ul', { class: 'rows' }, ...items)),
  ];
};
