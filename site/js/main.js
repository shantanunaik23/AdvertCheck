import { config } from './config.js';
import { collectSignals, LEVELS } from './signals.js';
import { baitTest, liveProbe, thirdPartyRequests } from './probe.js';
import { BROWSER_NAMES, fixFor } from './advice.js';

const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

// Builds elements with textContent only, so nothing read from the browser is
// ever interpreted as HTML.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

// References a symbol from the sprite in index.html.
function icon(name, cls = 'icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function externalLink(label, href, cls) {
  return el('a', { href, target: '_blank', rel: 'noopener noreferrer', ...(cls ? { class: cls } : {}) },
    el('span', {}, label),
    el('span', { class: 'visually-hidden' }, ' (opens in a new tab)'),
    icon('external', 'icon icon-sm'));
}

const state = {
  signals: null,
  summary: null,
  bait: null,
  live: null,
  adSlot: null,
  // Outcome of each checkup item: true (protected), false, or undefined (not run).
  checks: { blocker: undefined, servers: undefined, fingerprint: undefined, gpc: undefined },
};

function browserName() {
  return state.summary ? BROWSER_NAMES[state.summary.family] : 'your browser';
}

function adviceContext() {
  const s = state.summary || {};
  return { family: s.family || 'other', os: s.os || '' };
}

// Checkup rows

const CHECK_ICONS = { pass: 'shield-check', fail: 'alert', partial: 'partial', info: 'info', pending: 'pending' };

function renderFix(fix) {
  const steps = fix.steps.map((step) => el('li', {},
    el('span', { class: 'step-text' },
      el('span', {}, step.text),
      step.link ? externalLink(step.link.label, step.link.href, 'step-link') : null)));
  return el('details', { class: 'fix' },
    el('summary', {}, el('span', {}, `How to fix this in ${browserName()}`), icon('chevron', 'icon chevron')),
    el('div', { class: 'fix-body' },
      fix.intro ? el('p', {}, fix.intro) : null,
      el('ol', { class: 'fix-steps' }, ...steps)));
}

function setCheck(id, { status, label, text, fix }) {
  const card = $(id);
  card.dataset.state = status;
  card.querySelector('.check-icon').replaceChildren(icon(CHECK_ICONS[status]));
  card.querySelector('.check-label').textContent = label;
  card.querySelector('.check-status').textContent = text;
  card.querySelector('.fix-slot').replaceChildren(...(fix ? [renderFix(fix)] : []));
}

function renderBlockerCheck() {
  const found = state.bait.blockerDetected;
  state.checks.blocker = found;
  setCheck('check-blocker', found
    ? { status: 'pass', label: 'Protected', text: 'Found. Something hid our test ad.' }
    : { status: 'fail', label: 'Not protected', text: 'Not found. Ads and trackers can load on every site you visit.', fix: fixFor('blocker', adviceContext()) });
}

function renderFingerprintCheck() {
  const { scrambled, highReadable, highTotal } = state.summary;
  const protectedNow = scrambled || state.summary.family === 'brave';
  state.checks.fingerprint = protectedNow;
  setCheck('check-fingerprint', protectedNow
    ? { status: 'pass', label: 'Protected', text: 'Your browser scrambles the image test that trackers use, so your fingerprint keeps changing.' }
    : { status: 'fail', label: 'Not protected', text: `Your browser gave us ${highReadable} of ${highTotal} fingerprint details, unchanged. Trackers can use them to recognise you.`, fix: fixFor('fingerprint', adviceContext()) });
}

function renderGpcCheck() {
  const on = state.summary.gpc;
  state.checks.gpc = on;
  setCheck('check-gpc', on
    ? { status: 'pass', label: 'On', text: 'On. Your browser asks every site not to sell or share your data.' }
    : { status: 'fail', label: 'Off', text: 'Off. Sites are not asked to stop selling or sharing your data.', fix: fixFor('gpc', adviceContext()) });
}

// Verdict at the top of the page

function updateVerdict() {
  const results = Object.values(state.checks).filter((v) => v !== undefined);
  if (!results.length) return;
  const passed = results.filter(Boolean).length;
  const total = results.length;
  const serversRun = state.checks.servers !== undefined;
  const level = passed === total ? 'good' : passed === 0 ? 'bad' : 'warn';
  const titles = {
    bad: 'Advertisers can easily track this browser',
    warn: 'This browser is only partly protected',
    good: 'This browser is well protected',
  };
  const icons = { bad: 'alert', warn: 'partial', good: 'shield-check' };
  let detail = level === 'good'
    ? `It passed all ${total} checks. Sites can still see the basic details below.`
    : `It passed ${passed} of ${total} privacy checks. The checkup below shows how to fix each one in ${browserName()}, in a few minutes.`;
  if (!serversRun) detail += ' Run the server check for a full result.';

  const verdict = $('verdict');
  verdict.dataset.level = level;
  $('verdict-icon').replaceChildren(icon(icons[level]));
  $('verdict-title').textContent = titles[level];
  $('verdict-detail').textContent = detail;
  $('verdict-cta').firstElementChild.textContent = level === 'good' ? 'See your checkup' : 'See how to fix this';
}

// Summary facts

function deviceLabel(s) {
  const names = { iOS: 'iPhone', iPadOS: 'iPad', macOS: 'Mac', ChromeOS: 'Chromebook' };
  if (names[s.os]) return names[s.os];
  if (s.os === 'Android') return s.mobile ? 'Android phone' : 'Android device';
  return `${s.osLabel} ${s.mobile ? 'phone or tablet' : 'computer'}`;
}

function renderSummary({ summary }) {
  $('fact-device').textContent = deviceLabel(summary);
  $('fact-browser').textContent = summary.browser;
  $('fact-place').textContent = summary.place ? `${summary.place} time zone` : 'Not available';
  $('fact-language').textContent = summary.language || 'Not available';
  $('summary-id').textContent = summary.fingerprintId;
  $('browser-name').textContent = browserName();

  const phone = summary.os === 'Android' ? 'phone-android' : (summary.os === 'iOS' || summary.os === 'iPadOS') ? 'phone-ios' : null;
  if (phone) $(phone).querySelector('.tag').hidden = false;
}

// Full signal list

const GROUP_ICONS = {
  'Your device': 'device', 'Your browser': 'browser', 'Where you are': 'pin', 'Privacy settings': 'lock', Fingerprint: 'fingerprint',
};

function levelChip(level) {
  return el('span', { class: `level level-${level}` },
    el('span', { class: 'bars', 'aria-hidden': 'true' }, el('span'), el('span'), el('span')),
    el('span', { class: 'visually-hidden' }, 'Identifies you: '),
    LEVELS[level]);
}

function renderSignals({ signals }) {
  const root = $('signal-groups');
  root.replaceChildren();
  const groups = [...new Set(signals.map((s) => s.group))];
  for (const group of groups) {
    const rows = signals.filter((s) => s.group === group).map((s) => el('li', { class: 'row' },
      el('details', {},
        el('summary', {},
          el('span', { class: 'row-main' },
            el('span', { class: 'row-label' }, s.label),
            el('span', { class: 'row-value' }, s.value)),
          levelChip(s.level),
          icon('chevron', 'icon chevron')),
        el('div', { class: 'row-why' },
          el('p', {}, s.why),
          s.technical ? el('p', { class: 'row-tech' }, `Technical name: ${s.technical}`) : null))));
    root.append(el('section', { class: 'group' },
      el('h3', {}, icon(GROUP_ICONS[group] || 'info'), group),
      el('ul', { class: 'rows' }, ...rows)));
  }
}

// Server check (runs only on request)

function renderProbe(result) {
  const labels = { reachable: 'Reachable', blocked: 'Blocked', timeout: 'No answer' };
  const icons = { reachable: 'x', blocked: 'check', timeout: 'pending' };
  $('probe-list').append(el('li', { class: 'probe', 'data-state': result.status },
    el('span', { class: 'probe-name' }, result.name),
    el('span', { class: 'probe-kind' }, `${result.kind} · ${result.host}`),
    el('span', { class: `chip chip-${result.status}` }, icon(icons[result.status]), labels[result.status])));
}

async function runLive() {
  const button = $('live-run');
  button.disabled = true;
  $('live-run-text').textContent = 'Checking…';
  $('probe-list').replaceChildren();
  $('probe-list').hidden = false;
  const out = await liveProbe(config, renderProbe);
  state.live = out;
  $('live-intro').hidden = true;

  if (!out.trusted) {
    $('probe-list').hidden = true;
    setCheck('check-servers', {
      status: 'info',
      label: 'Could not check',
      text: 'We could not reach our neutral test server either, so you may be offline or behind a strict firewall. The results would not be reliable. Check your connection and reload the page to try again.',
    });
  } else {
    const blocked = out.results.filter((r) => r.status === 'blocked').length;
    const total = out.results.length;
    // Treat the browser as protected when it blocks at least three in four.
    const pass = blocked / total >= 0.75;
    state.checks.servers = pass;
    const text = blocked === total
      ? `${total} of ${total} servers were blocked. Ad networks cannot load on the pages you visit.`
      : blocked === 0
        ? `0 of ${total} servers were blocked. Ad networks can load and track you on most sites.`
        : `${blocked} of ${total} servers were blocked. The rest can load ads and track you.`;
    setCheck('check-servers', {
      status: pass ? 'pass' : blocked === 0 ? 'fail' : 'partial',
      label: pass ? 'Protected' : blocked === 0 ? 'Not protected' : 'Partly protected',
      text,
      fix: blocked === total ? null : fixFor('servers', adviceContext()),
    });
    updateVerdict();
  }
  updateAudit();
}

async function runAdSlot() {
  if (!config.adSlot) return;
  $('adslot-card').hidden = false;
  $('adslot-meta').textContent = 'Live · contacts Google Ad Manager';
  $('adslot-body').textContent = 'Loading an ad picked for your browser…';
  const { runAdSlot: run } = await import('./adslot.js');
  const result = await run(config.adSlot, $('adslot-box'));
  state.adSlot = result;
  const messages = {
    filled: `An ad was served${result.size ? ` (${result.size})` : ''}. Advertiser ID ${result.advertiserId ?? 'not shared'}.`,
    empty: 'The ad network chose not to show you an ad this time.',
    blocked: 'Your browser blocked the ad network, so no ad could load.',
    timeout: 'The ad network did not answer in time.',
    error: 'The ad slot is not set up correctly.',
  };
  $('adslot-body').textContent = messages[result.status];
  updateAudit();
}

// Request counter in the header and footer

function updateAudit() {
  const hosts = [...new Set(thirdPartyRequests())];
  const n = hosts.length;
  const badge = $('audit-badge');
  $('audit-text').textContent = n === 0 ? 'Nothing has left your browser' : `${n} server${n === 1 ? '' : 's'} contacted, at your request`;
  badge.dataset.state = n === 0 ? 'clean' : 'contacted';
  $('audit-detail').textContent = n === 0
    ? 'This page has contacted 0 other servers.'
    : `This page has contacted ${n} other server${n === 1 ? '' : 's'}, because you ran the server check: ${hosts.join(', ')}.`;
}

// Save results

function reportText() {
  const s = state.summary;
  const yesNo = (v) => (v === undefined ? 'not run' : v ? 'protected' : 'not protected');
  const lines = ['They Spy results', `Date: ${new Date().toISOString().slice(0, 10)}`, ''];
  if (s) {
    lines.push(`Result: ${$('verdict-title').textContent}`, `Device: ${deviceLabel(s)}`, `Browser: ${s.browser}`, `Fingerprint ID: ${s.fingerprintId}`, '');
  }
  lines.push('Privacy checkup:',
    `  Ad blocker: ${yesNo(state.checks.blocker)}`,
    `  Ad and tracking servers: ${yesNo(state.checks.servers)}`,
    `  Fingerprint protection: ${yesNo(state.checks.fingerprint)}`,
    `  Do-not-sell signal: ${state.checks.gpc === undefined ? 'not run' : state.checks.gpc ? 'on' : 'off'}`, '');
  lines.push('What websites can see:');
  for (const sig of state.signals || []) lines.push(`  ${sig.group} / ${sig.label}: ${sig.value} (${LEVELS[sig.level]})`);
  if (state.live && state.live.trusted) {
    lines.push('', 'Ad and tracking servers:');
    for (const r of state.live.results) lines.push(`  ${r.name} (${r.host}): ${r.status}`);
  }
  return lines.join('\n');
}

function setupReport() {
  const status = $('report-status');
  $('copy-report').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(reportText());
      status.textContent = 'Copied to your clipboard.';
    } catch {
      status.textContent = 'Your browser blocked copying. Use Download data file instead.';
    }
  });
  $('download-report').addEventListener('click', () => {
    const data = { date: new Date().toISOString(), summary: state.summary, checks: state.checks, signals: state.signals, adBlocker: state.bait, servers: state.live, adSlot: state.adSlot };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = el('a', { href: url, download: `they-spy-${data.date.slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Downloaded. The file is a JSON data file you can open in any text editor.';
  });
}

async function start() {
  $('probe-count').textContent = String(config.probes.length);
  if (config.repoUrl && /^https:\/\//.test(config.repoUrl)) {
    $('source-link').href = config.repoUrl;
    $('source-link').hidden = false;
  }
  $('live-run').addEventListener('click', runLive);
  setupReport();

  const collected = await collectSignals();
  state.signals = collected.signals;
  state.summary = collected.summary;
  renderSummary(collected);
  renderSignals(collected);
  renderFingerprintCheck();
  renderGpcCheck();

  state.bait = await baitTest();
  renderBlockerCheck();
  updateVerdict();
  updateAudit();

  if (config.autoRunLiveProbe) runLive();
  runAdSlot();
}

start();
