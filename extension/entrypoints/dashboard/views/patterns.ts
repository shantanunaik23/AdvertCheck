import { computePatterns, READY_DAYS, READY_ENGAGEMENTS } from '../../../src/insights/patterns';
import { topicById } from '../../../src/insights/topics';
import { el, plural } from '../../../src/ui/dom';
import { DAY_NAMES } from '../../../src/ui/format';
import { emptyState, sectionTitle, viewHead, type View } from './context';

export const patterns: View = ({ events }) => {
  const head = viewHead(
    'Your patterns',
    'When and where you click ads and do the things sites report to advertisers. This is a mirror of your own habits, not a score.',
  );
  const p = computePatterns(events);

  if (!p.ready) {
    const progress = Math.min(1, Math.max(p.daysCovered / READY_DAYS, p.engagements / READY_ENGAGEMENTS));
    const bar = el('div', {
      class: 'progress',
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': String(Math.round(progress * 100)),
      'aria-label': 'Data collected',
    });
    const fill = el('span');
    fill.style.width = `${String(Math.round(progress * 100))}%`;
    bar.append(fill);
    return [
      head,
      el(
        'section',
        { class: 'card' },
        sectionTitle('Not enough data yet'),
        el(
          'p',
          { class: 'muted' },
          `Patterns appear after ${String(READY_DAYS)} days or ${String(READY_ENGAGEMENTS)} ad clicks and reported actions, so they reflect real habits rather than one busy afternoon. So far: ${plural(p.daysCovered, 'day')} and ${plural(p.engagements, 'action')}.`,
        ),
        bar,
      ),
    ];
  }

  if (!p.engagements) {
    return [
      head,
      emptyState(
        'grid',
        'No ad clicks or reported actions yet',
        'Patterns show once you click ads or shops report what you do.',
      ),
    ];
  }

  const max = Math.max(1, ...p.grid.flat());
  const cells: Node[] = [
    el('span'),
    ...Array.from({ length: 24 }, (_, h) => el('span', { class: 'hour-label' }, h % 6 === 0 ? String(h) : '')),
  ];
  // Monday first, as most people read a week.
  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    cells.push(el('span', {}, (DAY_NAMES[day] ?? '').slice(0, 3)));
    for (let h = 0; h < 24; h++) {
      const n = p.grid[day]?.[h] ?? 0;
      const level = n === 0 ? 0 : Math.ceil((n / max) * 4);
      cells.push(
        el('span', {
          class: 'heat',
          'data-level': String(level),
          title: `${DAY_NAMES[day] ?? ''} ${String(h)}:00 – ${plural(n, 'action')}`,
        }),
      );
    }
  }

  const bars = (rows: { label: string; count: number }[]) => {
    const top = Math.max(1, ...rows.map((r) => r.count));
    return el(
      'ul',
      { class: 'bar-list' },
      ...rows.slice(0, 6).map((r) => {
        const bar = el('span', { class: 'bar' });
        bar.style.width = `${String(Math.round((r.count / top) * 100))}%`;
        return el(
          'li',
          {},
          el('span', {}, r.label),
          el('span', {}, bar),
          el('span', { class: 'small muted' }, String(r.count)),
        );
      }),
    );
  };

  const nodes: Node[] = [head];
  nodes.push(
    el(
      'section',
      { class: 'card' },
      sectionTitle('When you engage'),
      p.busiest
        ? el(
            'p',
            {},
            `${p.busiest.label} stand out: ${String(Math.round(p.busiest.share * 100))}% of your ad clicks and reported actions happen then.`,
          )
        : el('p', { class: 'muted' }, 'No single part of the week stands out.'),
      el(
        'div',
        { class: 'heatmap', role: 'img', 'aria-label': 'Ad clicks and reported actions by day and hour' },
        ...cells,
      ),
    ),
  );

  const byTopic = p.adClicksByTopic.map((t) => ({ label: topicById(t.topicId)?.name ?? t.topicId, count: t.count }));
  const byPlatform = p.adClicksByPlatform.map((t) => ({ label: t.platform, count: t.count }));
  if (byTopic.length || byPlatform.length) {
    nodes.push(
      el(
        'div',
        { class: 'cards' },
        byTopic.length
          ? el('section', { class: 'card' }, sectionTitle('Ads you click, by topic'), bars(byTopic))
          : null,
        byPlatform.length
          ? el('section', { class: 'card' }, sectionTitle('Ads you click, by platform'), bars(byPlatform))
          : null,
      ),
    );
  }
  return nodes;
};
