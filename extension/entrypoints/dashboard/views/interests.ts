import { computeInterests, type Interest } from '../../../src/insights/interests';
import { el, plural } from '../../../src/ui/dom';
import { emptyState, viewHead, type View } from './context';

const STRENGTH: Record<Interest['strength'], string> = { light: 'Light', medium: 'Medium', strong: 'Strong' };

export const interests: View = ({ events }) => {
  const head = viewHead(
    'What advertisers could guess',
    'An estimate of the interests ad companies could link to you, worked out from what this browser recorded. It is not what any company actually holds, and they also use data from apps, accounts and shops that They Spy cannot see.',
  );
  const list = computeInterests(events);
  if (!list.length) {
    return [
      head,
      emptyState(
        'spark',
        'Not enough yet',
        'Interests appear as you search, shop and browse. Check back in a few days.',
      ),
    ];
  }

  const cards = list.map((i) => {
    const ev = i.evidence;
    const evidence = [
      ev.searches ? plural(ev.searches, 'search', 'searches') : null,
      ev.sites ? plural(ev.sites, 'site') : null,
      ev.actions ? plural(ev.actions, 'thing a site reported', 'things sites reported') : null,
      ev.adClicks ? plural(ev.adClicks, 'ad click') : null,
    ].filter((x): x is string => x !== null);
    return el(
      'article',
      { class: 'card interest' },
      el(
        'div',
        { class: 'interest-head' },
        el('h2', {}, i.name),
        el(
          'span',
          { class: 'strength', 'data-strength': i.strength },
          el('span', { class: 'strength-bars', 'aria-hidden': 'true' }, el('span'), el('span'), el('span')),
          STRENGTH[i.strength],
        ),
      ),
      el('p', { class: 'small muted' }, 'Based on'),
      el('div', { class: 'evidence' }, ...evidence.map((e) => el('span', { class: 'chip' }, e))),
      i.examples.length
        ? el('p', { class: 'small' }, `For example: ${i.examples.map((x) => `“${x}”`).join(', ')}`)
        : null,
      i.sensitive
        ? el(
            'p',
            { class: 'small tonal' },
            'Health information is sensitive. In the UK and EU, data protection law gives it extra protection.',
          )
        : null,
    );
  });

  return [
    head,
    el('div', { class: 'cards' }, ...cards),
    el('p', { class: 'small muted' }, 'Strength is an estimate, labelled light, medium or strong.'),
  ];
};
