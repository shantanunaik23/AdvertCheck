import '../../src/ui/base.css';
import './style.css';
import { settingsItem, type Settings } from '../../src/store/settings';
import { ALERTS_TEXT, ALERTS_TITLE } from '../../src/ui/alerts';
import { el, icon, type IconName } from '../../src/ui/dom';

const ALL_SITES = { origins: ['<all_urls>'] };
const app = document.getElementById('app');

const list = (cls: string, mark: IconName, items: string[]) =>
  el('ul', { class: cls }, ...items.map((t) => el('li', {}, icon(mark), el('span', {}, t))));

async function render() {
  if (!app) return;
  const settings = await settingsItem.getValue();
  // Firefox can install without site access; without it nothing is recorded.
  const hasAccess = await browser.permissions.contains(ALL_SITES);

  const hero = el(
    'header',
    { class: 'hero' },
    el('span', { class: 'brand' }, el('span', { class: 'brand-mark' }, icon('logo')), 'They Spy'),
    el('h1', {}, 'They Spy is installed'),
    el(
      'p',
      {},
      'Websites quietly tell ad companies what you look at and buy, so they can follow you around and get you spending. They Spy shows you who’s watching and what they know. It all stays on this device.',
    ),
  );

  const nodes: Node[] = [hero];

  if (!hasAccess) {
    const allow = el('button', { class: 'btn', type: 'button' }, 'Allow access to websites');
    allow.addEventListener('click', () => {
      void browser.permissions.request(ALL_SITES).then(render);
    });
    nodes.push(
      el(
        'section',
        { class: 'card access', role: 'alert' },
        el('strong', {}, 'One more step: They Spy cannot see any websites yet.'),
        el('p', {}, 'Your browser asks you to allow this separately. Without it, nothing is recorded.'),
        allow,
      ),
    );
  }

  nodes.push(
    el(
      'div',
      { class: 'three' },
      el(
        'section',
        { class: 'card yes' },
        el('h2', {}, icon('eye'), 'What it keeps an eye on'),
        list('', 'check', [
          'Which ad and tracking companies see each site you visit',
          'What sites tell them you did, like adding something to your basket',
          'Ads you click',
          'What you search for (you can turn this off below)',
        ]),
      ),
      el(
        'section',
        { class: 'card no' },
        el('h2', {}, icon('lock'), 'What it never keeps'),
        list('', 'x', [
          'Full web addresses or page content',
          'Passwords, messages or form contents',
          'Your email or phone number, even when sites send them',
          'Anything in private windows, unless you allow it',
        ]),
      ),
      el(
        'section',
        { class: 'card yes' },
        el('h2', {}, icon('shield'), 'Where it goes: nowhere'),
        list('', 'check', [
          'It’s stored only in this browser',
          'They Spy can’t connect to the internet at all',
          'Records are deleted after 30 days, or sooner if you choose',
          'You can pause, export or delete everything at any time',
        ]),
      ),
    ),
  );

  // Each switch saves on top of the latest settings, so one does not undo another.
  const save = (change: Partial<Settings>) =>
    settingsItem.getValue().then((latest) => settingsItem.setValue({ ...latest, ...change }));

  const words = el('input', { type: 'checkbox', role: 'switch', id: 'words', 'aria-describedby': 'words-text' });
  words.checked = settings.recordSearchWords;
  words.addEventListener('change', () => {
    void save({ recordSearchWords: words.checked });
  });
  const alerts = el('input', { type: 'checkbox', role: 'switch', id: 'alerts', 'aria-describedby': 'alerts-text' });
  alerts.checked = settings.showAlerts;
  alerts.addEventListener('change', () => {
    void save({ showAlerts: alerts.checked });
  });
  nodes.push(
    el(
      'section',
      { class: 'card' },
      el(
        'label',
        { class: 'switch', for: 'words' },
        el('span', { class: 'setting-title' }, 'Keep the words I search for'),
        words,
      ),
      el(
        'p',
        { class: 'small muted', id: 'words-text' },
        'Searches are one of the biggest clues advertisers use. Keeping the words shows you exactly what they could learn. Turn this off to record only that you searched.',
      ),
    ),
    el(
      'section',
      { class: 'card' },
      el('label', { class: 'switch', for: 'alerts' }, el('span', { class: 'setting-title' }, ALERTS_TITLE), alerts),
      el('p', { class: 'small muted', id: 'alerts-text' }, ALERTS_TEXT),
    ),
  );

  nodes.push(
    el(
      'section',
      { class: 'explain' },
      el('h2', {}, 'About the warning when you installed'),
      el(
        'p',
        {},
        'Your browser said They Spy can ',
        el('span', { class: 'warning-quote' }, '“read and change all your data on all websites”'),
        '. Browsers only let an extension see a request to an ad company if it can see the website that made it, so that wording is unavoidable.',
      ),
      el(
        'p',
        {},
        'In practice They Spy only watches which servers each page contacts. It never changes pages, never reads what you type, and cannot send anything anywhere. Its code is public for anyone to check.',
      ),
    ),
  );

  const open = el('button', { class: 'btn', type: 'button' }, 'Open your dashboard', icon('arrow'));
  open.addEventListener('click', () => {
    location.href = browser.runtime.getURL('/dashboard.html');
  });
  nodes.push(
    el(
      'div',
      { class: 'next' },
      open,
      el('p', { class: 'small muted' }, 'Or just browse as usual. The toolbar button shows what each page shares.'),
    ),
  );

  app.replaceChildren(el('div', { class: 'welcome' }, ...nodes));
}

void render();
