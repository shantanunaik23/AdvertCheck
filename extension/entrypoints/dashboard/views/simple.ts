// The simple view: a handful of plain answers for anyone, whatever their
// confidence with technology. Everything else is in Advanced mode.

import { weekSummary } from '../../../src/insights/simple';
import { who, whoList } from '../../../src/ui/who';
import { settingsItem } from '../../../src/store/settings';
import { el, icon, plural } from '../../../src/ui/dom';
import { toldPhrase } from '../../../src/ui/format';
import { alertsSwitch, deleteControls, type View } from './context';

const FTC =
  'https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-surveillance-pricing-study-indicates-wide-range-personal-data-used-set-individualized-consumer';
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
    el(
      'p',
      {},
      'Here’s what ad companies picked up about you online in the last 7 days. It all stays on this computer.',
    ),
  );

  const nodes: Node[] = [head];

  if (!s.companies) {
    nodes.push(
      el(
        'section',
        { class: 'card empty' },
        icon('eye'),
        el('h2', {}, 'Nothing to show yet'),
        el('p', {}, 'Browse like you normally would. Come back in a day or two to see who’s been watching.'),
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
          s.companies === 1 ? 'ad company was keeping tabs on you' : 'ad companies were keeping tabs on you',
        ),
        el('p', {}, `They include ${whoList(s.companyIds)}.`),
      ),
    );

    if (s.emailSites.length) {
      nodes.push(
        el(
          'section',
          { class: 'card answer alert-card' },
          el(
            'h2',
            {},
            icon('mail'),
            `${plural(s.emailSites.length, 'website')} handed your email address to advertisers`,
          ),
          el(
            'p',
            {},
            'It was scrambled first, but that doesn’t stop them using it. They match it to your account with them, so they can follow you even if you clear your cookies.',
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
        el('h2', {}, 'What shops told advertisers about you'),
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
          : el('p', { class: 'muted' }, 'No shops passed on what you did this week. Nice.'),
      ),
    );

    nodes.push(
      el(
        'section',
        { class: 'card answer' },
        el('h2', {}, 'What they think you’re into'),
        s.interests.length
          ? el(
              'div',
              { class: 'interest-chips' },
              ...s.interests.map((i) => el('span', { class: 'chip chip-primary' }, i.name)),
            )
          : el('p', { class: 'muted' }, 'Not enough to go on yet.'),
        el(
          'p',
          { class: 'small muted' },
          'Our best guess, from the sites you visit and what you search for. This is the picture they use to decide which ads to show you.',
        ),
      ),
    );
  }

  nodes.push(
    el(
      'section',
      { class: 'card answer' },
      el('h2', {}, 'How this gets you to spend'),
      el(
        'ul',
        { class: 'learn' },
        el(
          'li',
          {},
          el('strong', {}, 'Ads that follow you. '),
          'Look at something once and ads for it can chase you round the web for weeks, until you give in.',
        ),
        el(
          'li',
          {},
          el('strong', {}, 'Basket reminders. '),
          'Leave something in your basket and expect ads, and often emails, nudging you to finish buying.',
        ),
        el(
          'li',
          {},
          el('strong', {}, 'Good timing, for them. '),
          'The more they know, the better they get at showing you ads when you’re most likely to buy.',
        ),
        el(
          'li',
          {},
          el('strong', {}, 'Prices made for you. '),
          'The US consumer regulator found that details like your location and browsing history can be used to charge different people different prices for the same thing. ',
          link(FTC, 'Read the FTC’s findings'),
        ),
      ),
    ),
  );

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
          link('https://www.facebook.com/adpreferences/', 'Facebook'),
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
