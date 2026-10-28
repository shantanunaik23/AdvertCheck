import '../../src/ui/base.css';
import './style.css';
import { companyName } from '../../src/classify/companies';
import { eventsSince, type StoredEvent } from '../../src/store/db';
import { settingsItem } from '../../src/store/settings';
import { tabsItem } from '../../src/store/tabs';
import type { ReportedEvent } from '../../src/types';
import { LEVEL_TEXT, trackingLevel } from '../../src/insights/simple';
import { whoList } from '../../src/ui/who';
import { ACTION_LABELS, toldPhrase } from '../../src/ui/format';
import { avatar, el, icon, plural } from '../../src/ui/dom';

const app = document.getElementById('app');

function openDashboard(hash = '') {
  void browser.tabs.create({ url: browser.runtime.getURL(`/dashboard.html${hash}`) }).then(() => {
    window.close();
  });
}

async function render() {
  if (!app) return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const [settings, tabs] = await Promise.all([settingsItem.getValue(), tabsItem.getValue()]);
  const page = tab?.id === undefined ? undefined : tabs[tab.id];

  const head = el(
    'header',
    { class: 'popup-head' },
    el('span', { class: 'brand' }, el('span', { class: 'brand-mark' }, icon('logo')), 'They Spy'),
    el('span', { class: 'chip chip-good' }, icon('lock'), 'On this device only'),
  );

  const body: Node[] = [];
  if (settings.paused) {
    const resume = el('button', { class: 'btn btn-tonal', type: 'button' }, icon('play'), 'Resume');
    resume.addEventListener('click', () => {
      void settingsItem.setValue({ ...settings, paused: false }).then(render);
    });
    body.push(el('div', { class: 'banner', role: 'status' }, 'Recording is paused', resume));
  }

  if (!page) {
    body.push(
      el(
        'div',
        { class: 'empty' },
        icon('eye'),
        el('h1', { class: 'setting-title' }, 'Nothing recorded on this page'),
        el('p', { class: 'small' }, 'They Spy only watches websites, and only pages you open after installing it.'),
      ),
    );
  } else if (settings.excludedSites.includes(page.site)) {
    const include = el('button', { class: 'btn btn-outlined', type: 'button' }, 'Record this site again');
    include.addEventListener('click', () => {
      const excludedSites = settings.excludedSites.filter((s) => s !== page.site);
      void settingsItem.setValue({ ...settings, excludedSites }).then(render);
    });
    body.push(
      el(
        'div',
        {},
        el('h1', { class: 'page-site' }, page.site),
        el('p', { class: 'page-count' }, 'You turned off recording on this site.'),
      ),
      include,
    );
  } else {
    const told = (await eventsSince(page.startedAt)).filter(
      (e): e is Extract<StoredEvent, ReportedEvent> =>
        e.kind === 'reported' && e.site === page.site && e.action !== 'page_view',
    );
    if (!settings.advanced) {
      body.push(...simplePage(page.site, page.companies, told));
    } else {
      body.push(...advancedPage(page.site, page.companies, told));
    }
  }

  const dashboard = el(
    'button',
    { class: 'btn', type: 'button' },
    settings.advanced ? 'Open your dashboard' : 'See your week in ads',
    icon('arrow'),
  );
  dashboard.addEventListener('click', () => {
    openDashboard();
  });
  const foot = el(
    'footer',
    { class: 'popup-foot' },
    dashboard,
    el('p', { class: 'private-note' }, icon('lock'), 'Recorded on this device only. Nothing is sent anywhere.'),
  );

  app.replaceChildren(el('div', { class: 'popup' }, head, ...body, foot));
}

/** One headline, a traffic light and plain sentences. */
function simplePage(site: string, companies: string[], told: ReportedEvent[]): Node[] {
  const level = trackingLevel(companies.length);
  const n = companies.length;
  const nodes: Node[] = [
    el(
      'div',
      { class: 'headline' },
      el('span', { class: `level level-${level}` }, LEVEL_TEXT[level]),
      el(
        'h1',
        {},
        n === 0
          ? 'No ad companies spotted here'
          : `${plural(n, 'ad company is', 'ad companies are')} watching you here`,
      ),
      el('p', { class: 'muted' }, `on ${site}`),
    ),
  ];
  if (n) nodes.push(el('p', { class: 'who' }, whoList(companies)));
  const things = [...new Set(told.map((t) => toldPhrase(t)))];
  if (things.length) {
    nodes.push(
      el(
        'div',
        { class: 'told-box' },
        el('p', {}, el('strong', {}, 'This site told them you:')),
        el('ul', {}, ...things.slice(0, 4).map((t) => el('li', {}, t))),
      ),
    );
  }
  if (told.some((t) => t.identityShared)) {
    nodes.push(
      el(
        'p',
        { class: 'email-warning' },
        icon('mail'),
        'This site also handed your email address to advertisers (scrambled, but they can still use it).',
      ),
    );
  }
  return nodes;
}

/** Every company, with labels for what each was told. */
function advancedPage(site: string, companies: string[], told: ReportedEvent[]): Node[] {
  const nodes: Node[] = [];
  nodes.push(
    el(
      'div',
      {},
      el('h1', { class: 'page-site' }, site),
      el(
        'p',
        { class: 'page-count' },
        companies.length
          ? `${plural(companies.length, 'ad or tracking company', 'ad and tracking companies')} saw this visit.`
          : 'No ad or tracking companies seen on this visit yet.',
      ),
    ),
  );
  if (companies.length) {
    const rows = companies.map((id) => {
      const name = companyName(id);
      const mine = told.filter((t) => t.companyId === id);
      const shared = mine.some((t) => t.identityShared);
      const labels = [...new Set(mine.map((t) => ACTION_LABELS[t.action]))];
      return el(
        'li',
        { class: 'row' },
        avatar(name),
        el(
          'div',
          {},
          el('p', { class: 'company-name' }, name),
          labels.length || shared
            ? el(
                'div',
                { class: 'company-told' },
                ...labels.map((l) => el('span', { class: 'chip chip-warn' }, `Told: ${l}`)),
                shared ? el('span', { class: 'chip chip-bad' }, 'Got your email or phone (scrambled)') : null,
              )
            : el('p', { class: 'small muted' }, 'Saw your visit'),
        ),
        el('span'),
      );
    });
    nodes.push(el('ul', { class: 'rows', 'aria-label': 'Companies that saw this visit' }, ...rows));
  }
  return nodes;
}

void render();
