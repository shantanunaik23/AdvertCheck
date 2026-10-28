import { siteOf } from '../../../src/classify/site';
import { eventsSince } from '../../../src/store/db';
import { RETENTION_CHOICES, settingsItem, type Settings } from '../../../src/store/settings';
import { el, icon } from '../../../src/ui/dom';
import { alertsSwitch, deleteControls, sectionTitle, viewHead, type Ctx, type View } from './context';

const REPO = 'https://github.com/shantanunaik23/AdvertCheck';

function save(ctx: Ctx, change: Partial<Settings>) {
  void settingsItem.setValue({ ...ctx.settings, ...change }).then(ctx.refresh);
}

function toggle(
  id: string,
  title: string,
  text: string,
  checked: boolean,
  onChange: (v: boolean) => void,
): HTMLElement {
  const input = el('input', { type: 'checkbox', role: 'switch', id, 'aria-describedby': `${id}-text` });
  input.checked = checked;
  input.addEventListener('change', () => {
    onChange(input.checked);
  });
  return el(
    'div',
    { class: 'setting' },
    el('label', { class: 'switch', for: id }, el('span', { class: 'setting-title' }, title), input),
    el('p', { class: 'small muted', id: `${id}-text` }, text),
  );
}

export const settings: View = (ctx) => {
  const s = ctx.settings;

  const recording = el(
    'section',
    { class: 'card' },
    sectionTitle('Recording'),
    toggle(
      'rec',
      'Record while I browse',
      s.paused
        ? 'Paused. Nothing new is recorded; what is already here is kept.'
        : 'On. They Spy records in the background.',
      !s.paused,
      (on) => {
        save(ctx, { paused: !on });
      },
    ),
    toggle(
      'words',
      'Keep the words I search for',
      'When off, They Spy only notes that you searched, for example “searched Google”, without the words.',
      s.recordSearchWords,
      (on) => {
        save(ctx, { recordSearchWords: on });
      },
    ),
    alertsSwitch(ctx, 'alerts-advanced'),
  );

  const retention = el('select', { id: 'retention' });
  for (const days of RETENTION_CHOICES) {
    const opt = el('option', { value: String(days) }, days === 365 ? '1 year' : `${String(days)} days`);
    opt.selected = days === s.retentionDays;
    retention.append(opt);
  }
  retention.addEventListener('change', () => {
    save(ctx, { retentionDays: Number(retention.value) });
  });

  const siteInput = el('input', { type: 'text', id: 'exclude', placeholder: 'e.g. mybank.co.uk', autocomplete: 'off' });
  const addBtn = el('button', { class: 'btn btn-tonal', type: 'submit' }, 'Add');
  const status = el('p', { class: 'small muted', role: 'status' });
  const form = el('form', { class: 'inline-form' }, siteInput, addBtn);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const raw = siteInput.value.trim();
    const site = raw ? siteOf(/^https?:\/\//.test(raw) ? raw : `https://${raw}`) : null;
    if (!site?.includes('.')) {
      status.textContent = 'Enter a website address, like mybank.co.uk.';
      return;
    }
    if (!s.excludedSites.includes(site)) save(ctx, { excludedSites: [...s.excludedSites, site].sort() });
  });
  const excluded = s.excludedSites.length
    ? el(
        'ul',
        { class: 'rows' },
        ...s.excludedSites.map((site) => {
          const remove = el(
            'button',
            { class: 'btn btn-text', type: 'button', 'aria-label': `Record ${site} again` },
            'Remove',
          );
          remove.addEventListener('click', () => {
            save(ctx, { excludedSites: s.excludedSites.filter((x) => x !== site) });
          });
          return el('li', { class: 'row' }, icon('lock'), el('span', {}, site), remove);
        }),
      )
    : el('p', { class: 'small muted' }, 'None. You can also turn a site off from the toolbar button.');

  const keeping = el(
    'section',
    { class: 'card' },
    sectionTitle('Keeping data'),
    el(
      'div',
      { class: 'setting' },
      el('label', { class: 'setting-title', for: 'retention' }, 'Delete records older than'),
      el('div', { class: 'actions-row' }, retention),
      el('p', { class: 'small muted' }, 'Older records are deleted automatically once a day.'),
    ),
    el(
      'div',
      { class: 'setting' },
      el('label', { class: 'setting-title', for: 'exclude' }, 'Sites not to record'),
      el(
        'p',
        { class: 'small muted' },
        'For example your bank or doctor. Nothing is recorded while you are on these sites.',
      ),
      form,
      status,
      excluded,
    ),
  );

  const exportBtn = el('button', { class: 'btn btn-outlined', type: 'button' }, icon('download'), 'Download my data');
  exportBtn.addEventListener('click', () => {
    void eventsSince(0).then((events) => {
      const data = { exported: new Date().toISOString(), settings: s, events };
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = el('a', { href: url, download: `they-spy-${data.exported.slice(0, 10)}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    });
  });

  const { button: deleteBtn, confirmRow } = deleteControls(ctx);

  const yours = el(
    'section',
    { class: 'card' },
    sectionTitle('Your data'),
    el(
      'p',
      { class: 'small muted' },
      `${ctx.events.length.toLocaleString('en-GB')} records, stored only in this browser on this device.`,
    ),
    el('div', { class: 'actions-row' }, exportBtn, deleteBtn),
    confirmRow,
  );

  const link = (href: string, text: string) => el('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);
  const about = el(
    'section',
    { class: 'card' },
    sectionTitle('About'),
    el(
      'p',
      { class: 'small' },
      `They Spy ${browser.runtime.getManifest().version}. Open source under the MIT licence. `,
      link(REPO, 'Read the code'),
    ),
    el(
      'p',
      { class: 'small muted' },
      'Tracker and company data from ',
      link('https://github.com/AdguardTeam/companiesdb', 'AdGuard companiesdb'),
      ' (CC BY-SA 4.0), built on WhoTracks.me. Tracking request formats adapted from ',
      link('https://github.com/MisterPhilip/omnibug', 'Omnibug'),
      ' (MIT).',
    ),
  );

  return [
    viewHead('Settings', 'Control what They Spy records and how long it keeps it.'),
    recording,
    keeping,
    yours,
    about,
  ];
};
