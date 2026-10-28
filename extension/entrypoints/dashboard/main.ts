import '../../src/ui/base.css';
import './style.css';
import { eventsSince } from '../../src/store/db';
import { settingsItem } from '../../src/store/settings';
import { el, icon, type IconName } from '../../src/ui/dom';
import { companies } from './views/companies';
import type { Ctx, View } from './views/context';
import { interests } from './views/interests';
import { overview } from './views/overview';
import { patterns } from './views/patterns';
import { settings } from './views/settings';
import { simple } from './views/simple';
import { timeline } from './views/timeline';

// Advanced mode: every detail, in sections. Simple mode shows one page.
const ROUTES: { id: string; label: string; icon: IconName; view: View }[] = [
  { id: 'overview', label: 'Overview', icon: 'eye', view: overview },
  { id: 'companies', label: 'Companies', icon: 'building', view: companies },
  { id: 'timeline', label: 'Timeline', icon: 'clock', view: timeline },
  { id: 'interests', label: 'Interests', icon: 'spark', view: interests },
  { id: 'patterns', label: 'Patterns', icon: 'grid', view: patterns },
  { id: 'settings', label: 'Settings', icon: 'settings', view: settings },
];

const layout = document.getElementById('layout');
const nav = document.getElementById('nav');
const main = document.getElementById('view');
const advancedSwitch = document.getElementById('advanced') as HTMLInputElement | null;
document.getElementById('brand-mark')?.append(icon('logo'));
document.getElementById('privacy-chip')?.prepend(icon('lock'));

function current() {
  const id = location.hash.slice(1);
  return ROUTES.find((r) => r.id === id) ?? ROUTES[0];
}

async function render(moveFocus = false) {
  if (!layout || !nav || !main) return;
  const [events, s] = await Promise.all([eventsSince(0), settingsItem.getValue()]);
  const ctx: Ctx = { events, settings: s, refresh: () => render() };
  if (advancedSwitch) advancedSwitch.checked = s.advanced;
  layout.classList.toggle('simple', !s.advanced);

  if (!s.advanced) {
    nav.replaceChildren();
    main.replaceChildren(...(await simple(ctx)));
    document.title = 'Your week in ads · They Spy';
  } else {
    const route = current();
    if (!route) return;
    nav.replaceChildren(
      ...ROUTES.map((r) =>
        el('a', { href: `#${r.id}`, ...(r === route && { 'aria-current': 'page' }) }, icon(r.icon), r.label),
      ),
    );
    main.replaceChildren(...(await route.view(ctx)));
    document.title = `${route.label} · They Spy`;
  }
  if (moveFocus) main.focus();
}

advancedSwitch?.addEventListener('change', () => {
  void settingsItem.getValue().then(async (s) => {
    await settingsItem.setValue({ ...s, advanced: advancedSwitch.checked });
    if (advancedSwitch.checked) history.replaceState(null, '', '#overview');
    await render(true);
  });
});
window.addEventListener('hashchange', () => {
  void render(true);
});
// Show new records when the user comes back to the tab.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void render();
});
void render();
