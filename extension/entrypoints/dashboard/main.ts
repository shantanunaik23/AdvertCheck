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
import { timeline } from './views/timeline';

const ROUTES: { id: string; label: string; icon: IconName; view: View }[] = [
  { id: 'overview', label: 'Overview', icon: 'eye', view: overview },
  { id: 'companies', label: 'Companies', icon: 'building', view: companies },
  { id: 'timeline', label: 'Timeline', icon: 'clock', view: timeline },
  { id: 'interests', label: 'Interests', icon: 'spark', view: interests },
  { id: 'patterns', label: 'Patterns', icon: 'grid', view: patterns },
  { id: 'settings', label: 'Settings', icon: 'settings', view: settings },
];

const nav = document.getElementById('nav');
const main = document.getElementById('view');
document.getElementById('brand-mark')?.append(icon('logo'));
document.getElementById('privacy-chip')?.prepend(icon('lock'));

function current() {
  const id = location.hash.slice(1);
  return ROUTES.find((r) => r.id === id) ?? ROUTES[0];
}

async function render(moveFocus = false) {
  const route = current();
  if (!route || !nav || !main) return;
  nav.replaceChildren(
    ...ROUTES.map((r) =>
      el('a', { href: `#${r.id}`, ...(r === route && { 'aria-current': 'page' }) }, icon(r.icon), r.label),
    ),
  );
  const [events, s] = await Promise.all([eventsSince(0), settingsItem.getValue()]);
  const ctx: Ctx = { events, settings: s, refresh: () => render() };
  main.replaceChildren(...(await route.view(ctx)));
  document.title = `${route.label} · Ad Mirror`;
  if (moveFocus) main.focus();
}

window.addEventListener('hashchange', () => {
  void render(true);
});
// Show new records when the user comes back to the tab.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void render();
});
void render();
