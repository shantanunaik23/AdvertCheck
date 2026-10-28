// The simple view: a handful of plain answers for anyone, whatever their
// confidence with technology. Everything else is in Advanced mode.

import { weekSummary } from '../../../src/insights/simple';
import { who, whoList } from '../../../src/ui/who';
import { settingsItem } from '../../../src/store/settings';
import { el, icon, plural } from '../../../src/ui/dom';
import { toldPhrase } from '../../../src/ui/format';
import { alertsSwitch, deleteControls, type View } from './context';

const CHECKUP = 'https://shantanunaik23.github.io/AdvertCheck/#checkup';

const link = (href: string, text: string) =>
  el(
    'a',
    { href, target: '_blank', rel: 'noopener noreferrer' },
    text,
    el('span', { class: 'visually-hidden' }, ' (opens in a new tab)'),
  );

export const simple: View = (ctx) => {
  const s = weekSummary(ctx.events, Date.now());
  const head = el(
    'div',
    { class: 'view-head' },
    el('h1', {}, 'Your week in ads'),
    el('p', {}, 'What advertisers learned about you online in the last 7 days. This stays on this computer.'),
  );

  const nodes: Node[] = [head];

  if (!s.companies) {
    nodes.push(
      el(
        'section',
        { class: 'card empty' },
        icon('eye'),
        el('h2', {}, 'Nothing to show yet'),
        el('p', {}, 'Use the internet as you normally do. Come back in a day or two to see what advertisers learned.'),
      ),
    );
  } else {
    nodes.push(
      el(
        'section',
        { class: 'card answer' },
        el('p', { class: 'big-number' }, String(s.companies)),
        el(
          'h2',
          {},
          s.companies === 1
            ? 'advertising company watched what you did online'
            : 'advertising companies watched what you did online',
        ),
        el('p', {}, `They include ${whoList(s.companyIds)}.`),
      ),
    );

    if (s.emailSites.length) {
      nodes.push(
        el(
          'section',
          { class: 'card answer alert-card' },
          el('h2', {}, icon('mail'), `${plural(s.emailSites.length, 'website')} gave advertisers your email address`),
          el(
            'p',
            {},
            'They sent it in a coded form. Advertisers use it to link what you do on these websites to your accounts with them.',
          ),
          el(
            'div',
            { class: 'site-list' },
            ...s.emailSites.slice(0, 8).map((site) => el('span', { class: 'chip' }, site)),
          ),
        ),
      );
    }

    nodes.push(
      el(
        'section',
        { class: 'card answer' },
        el('h2', {}, 'What shops told advertisers'),
        s.told.length
          ? el(
              'ul',
              { class: 'told-list' },
              ...[...new Map(s.told.map((e) => [`${e.site}|${e.companyId}|${toldPhrase(e)}`, e])).values()].map((e) =>
                el(
                  'li',
                  {},
                  icon('cart'),
                  el('span', {}, el('strong', {}, e.site), ` told ${who(e.companyId)} you ${toldPhrase(e)}`),
                ),
              ),
            )
          : el('p', { class: 'muted' }, 'No shops told advertisers what you did this week.'),
      ),
    );

    nodes.push(
      el(
        'section',
        { class: 'card answer' },
        el('h2', {}, 'What advertisers probably think you like'),
        s.interests.length
          ? el(
              'div',
              { class: 'interest-chips' },
              ...s.interests.map((i) => el('span', { class: 'chip chip-primary' }, i.name)),
            )
          : el('p', { class: 'muted' }, 'Not enough yet to guess.'),
        el(
          'p',
          { class: 'small muted' },
          'This is our best guess, from the websites you visit and what you search for.',
        ),
      ),
    );
  }

  nodes.push(
    el(
      'section',
      { class: 'card answer' },
      el('h2', {}, 'What you can do'),
      el(
        'ol',
        { class: 'steps' },
        el(
          'li',
          {},
          el('strong', {}, 'Block ads and trackers. '),
          'A free ad blocker stops most of this. ',
          link('https://ublockorigin.com/', 'Get uBlock Origin Lite'),
        ),
        el(
          'li',
          {},
          el('strong', {}, 'Turn off personalised ads. '),
          link('https://myadcenter.google.com/', 'Google'),
          ' and ',
          link('https://www.facebook.com/adpreferences/', 'Meta'),
          ' let you switch them off.',
        ),
        el(
          'li',
          {},
          el('strong', {}, 'Check your browser. '),
          link(CHECKUP, 'Take the free privacy checkup'),
          ' for step-by-step help.',
        ),
      ),
    ),
  );

  const { button: deleteBtn, confirmRow } = deleteControls(ctx);
  const pause = el(
    'button',
    { class: 'btn btn-outlined', type: 'button' },
    icon(ctx.settings.paused ? 'play' : 'pause'),
    ctx.settings.paused ? 'Start recording again' : 'Pause recording',
  );
  pause.addEventListener('click', () => {
    void settingsItem.setValue({ ...ctx.settings, paused: !ctx.settings.paused }).then(ctx.refresh);
  });
  nodes.push(
    el(
      'section',
      { class: 'controls' },
      ctx.settings.paused ? el('p', { class: 'banner-paused', role: 'status' }, 'Recording is paused.') : null,
      el('div', { class: 'card' }, alertsSwitch(ctx)),
      el('div', { class: 'actions-row' }, pause, deleteBtn),
      confirmRow,
      el('p', { class: 'small muted' }, 'Want every detail? Turn on Advanced mode at the top of the page.'),
    ),
  );

  return nodes;
};
