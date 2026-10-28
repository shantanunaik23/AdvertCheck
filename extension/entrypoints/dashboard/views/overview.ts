import { computeInterests } from '../../../src/insights/interests';
import { summariseCompanies, totals } from '../../../src/insights/summary';
import { avatar, el, icon, plural } from '../../../src/ui/dom';
import { emptyState, retentionText, sectionTitle, viewHead, type View } from './context';

export const overview: View = ({ events, settings }) => {
  const head = viewHead(
    'Your ad mirror',
    `What ad companies learned about you while you browsed with this browser, over ${retentionText(settings.retentionDays)}. Everything here is stored only on this device.`,
  );
  if (!events.length) {
    return [
      head,
      emptyState(
        'eye',
        'Nothing recorded yet',
        'Browse as you normally do. They Spy records quietly in the background; come back later to see what it found.',
      ),
      limits(),
    ];
  }

  const t = totals(events);
  const stat = (value: number, label: string) =>
    el(
      'div',
      { class: 'stat' },
      el('span', { class: 'stat-value' }, value.toLocaleString('en-GB')),
      el('span', { class: 'stat-label' }, label),
    );
  const stats = el(
    'div',
    { class: 'stats' },
    stat(t.companies, 'ad and tracking companies saw you'),
    stat(t.sites, 'sites shared your visit'),
    stat(t.told, 'things sites told advertisers you did'),
    stat(t.adClicks, 'ads clicked'),
    stat(t.searches, 'searches'),
  );

  const companies = summariseCompanies(events).slice(0, 5);
  const companyCard = el(
    'section',
    { class: 'card' },
    sectionTitle('Who saw you most', { href: '#companies', label: 'All companies' }),
    el(
      'ul',
      { class: 'rows' },
      ...companies.map((c) =>
        el(
          'li',
          { class: 'row' },
          avatar(c.name),
          el('span', {}, el('strong', {}, c.name)),
          el('span', { class: 'small muted' }, `on ${plural(c.sites.length, 'site')}`),
        ),
      ),
    ),
  );

  const interests = computeInterests(events).slice(0, 4);
  const interestCard = el(
    'section',
    { class: 'card' },
    sectionTitle('What advertisers could guess', { href: '#interests', label: 'All interests' }),
    interests.length
      ? el(
          'ul',
          { class: 'rows' },
          ...interests.map((i) =>
            el(
              'li',
              { class: 'row' },
              icon('spark'),
              el('span', {}, i.name),
              el('span', { class: 'chip chip-primary' }, i.strength.charAt(0).toUpperCase() + i.strength.slice(1)),
            ),
          ),
        )
      : el('p', { class: 'muted' }, 'Not enough yet. Interests appear as you search, shop and browse.'),
  );

  const nodes: Node[] = [head, stats];
  if (t.identityShared) {
    const sites = [...new Set(events.filter((e) => e.kind === 'reported' && e.identityShared).map((e) => e.site))];
    nodes.push(
      el(
        'section',
        { class: 'card alert-card' },
        el('div', { class: 'section-title' }, el('h2', {}, 'Sites that sent your email or phone number'), icon('mail')),
        el(
          'p',
          {},
          `${plural(sites.length, 'site')} sent your contact details to ad companies in scrambled (hashed) form. Ad companies use this to match you to your account with them, even without cookies.`,
        ),
        el('div', { class: 'site-list' }, ...sites.slice(0, 12).map((s) => el('span', { class: 'chip chip-bad' }, s))),
      ),
    );
  }
  nodes.push(el('div', { class: 'cards' }, companyCard, interestCard), limits());
  return nodes;
};

function limits(): HTMLElement {
  return el(
    'section',
    { class: 'card' },
    sectionTitle('What They Spy cannot see'),
    el(
      'ul',
      { class: 'rows' },
      ...[
        'Data shops send to ad companies from their own servers, out of the browser’s sight.',
        'Tracking hidden on a site’s own address, if it does not use a known format.',
        'What you do in apps on your phone.',
        'What ad companies do with the data once they have it.',
      ].map((text) => el('li', { class: 'row' }, icon('info'), el('span', { class: 'muted' }, text), el('span'))),
    ),
  );
}
