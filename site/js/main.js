import { config } from './config.js';
import { collectSignals, LEVELS } from './signals.js';
import { baitTest, liveProbe, thirdPartyRequests } from './probe.js';

const $ = (id) => document.getElementById(id);

// Builds elements with textContent only, so nothing read from the browser is
// ever interpreted as HTML.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

const state = { signals: null, summary: null, bait: null, live: null, adSlot: null };

function renderSummary({ summary }) {
  const lang = summary.languages[0] || 'an unknown language';
  const where = summary.tz ? `in the ${summary.tz.replace(/_/g, ' ')} time zone` : 'in an unknown time zone';
  const device = summary.mobile ? 'a phone or tablet' : 'a computer';
  $('summary-sentence').textContent = `Someone on ${device} running ${summary.browser} on ${summary.os}, ${where}, reading in ${lang}.`;
  $('summary-id').textContent = summary.fingerprintId;
  $('summary-methods').textContent = `${summary.highReadable} of ${summary.highTotal}`;
}

function renderSignals({ signals }) {
  const root = $('signal-groups');
  root.replaceChildren();
  const groups = [...new Set(signals.map((s) => s.group))];
  for (const group of groups) {
    const rows = signals.filter((s) => s.group === group).map((s) => el('div', { class: 'row' },
      el('dt', {}, s.label),
      el('dd', { class: 'row-value' }, s.value),
      el('dd', { class: 'row-level' }, el('span', { class: `chip chip-${s.level}` }, LEVELS[s.level])),
      el('dd', { class: 'row-why' }, s.why),
    ));
    root.append(el('section', { class: 'group' }, el('h3', {}, group), el('dl', { class: 'rows' }, ...rows)));
  }
}

function renderBait(result) {
  const text = result.blockerDetected
    ? 'An ad blocker is active. It hid our test ad.'
    : 'No ad blocker detected. Our test ad was left visible.';
  $('bait-result').textContent = text;
  $('bait-result').dataset.state = result.blockerDetected ? 'good' : 'warn';
  $('summary-blocker').textContent = result.blockerDetected ? 'Active' : 'Not detected';
}

function renderProbe(result) {
  const label = { reachable: 'Reachable', blocked: 'Blocked', timeout: 'No answer' }[result.status];
  const item = el('li', { class: 'probe', 'data-state': result.status },
    el('span', { class: 'probe-name' }, result.name),
    el('span', { class: 'probe-kind' }, `${result.kind} · ${result.host}`),
    el('span', { class: `chip chip-${result.status}` }, label),
  );
  $('probe-list').append(item);
}

async function runLive() {
  const button = $('live-run');
  button.disabled = true;
  button.textContent = 'Checking…';
  $('probe-list').replaceChildren();
  $('probe-list').hidden = false;
  const out = await liveProbe(config, renderProbe);
  state.live = out;
  $('live-intro').hidden = true;
  $('live-meta').textContent = 'Checked just now · contacted outside servers';
  const summary = $('live-summary');
  summary.hidden = false;
  if (!out.trusted) {
    $('probe-list').hidden = true;
    summary.dataset.state = 'neutral';
    summary.textContent = 'We could not reach our neutral test server either, so you may be offline or behind a strict firewall. The results would not be reliable. Check your connection and reload the page to try again.';
  } else {
    const blocked = out.results.filter((r) => r.status === 'blocked').length;
    const total = out.results.length;
    summary.dataset.state = blocked === total ? 'good' : blocked === 0 ? 'warn' : 'neutral';
    summary.textContent = blocked === total
      ? `All ${total} servers were blocked. Ad networks cannot load on pages you visit with this browser.`
      : blocked === 0
        ? `All ${total} servers were reachable. Ad networks can load and track you on most sites.`
        : `${blocked} of ${total} servers were blocked. The rest can load ads and track you.`;
  }
  updateAudit();
}

async function runAdSlot() {
  if (!config.adSlot) return;
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

function updateAudit() {
  const hosts = [...new Set(thirdPartyRequests())];
  const n = hosts.length;
  const badge = $('audit-badge');
  badge.textContent = n === 0 ? 'Nothing leaves your browser' : `${n} outside server${n === 1 ? '' : 's'} contacted, at your request`;
  badge.dataset.state = n === 0 ? 'clean' : 'contacted';
  $('audit-detail').textContent = n === 0
    ? 'This page has contacted 0 other servers.'
    : `This page has contacted ${n} other server${n === 1 ? '' : 's'}: ${hosts.join(', ')}.`;
}

function reportText() {
  const lines = ['Ad Mirror results', `Date: ${new Date().toISOString().slice(0, 10)}`, ''];
  if (state.summary) {
    lines.push($('summary-sentence').textContent, `Fingerprint ID: ${state.summary.fingerprintId}`, '');
  }
  for (const s of state.signals || []) lines.push(`${s.group} / ${s.label}: ${s.value} (${LEVELS[s.level]})`);
  if (state.bait) lines.push('', `Ad blocker: ${state.bait.blockerDetected ? 'active' : 'not detected'}`);
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
      status.textContent = 'Your browser blocked copying. Use Download as JSON instead.';
    }
  });
  $('download-report').addEventListener('click', () => {
    const data = { date: new Date().toISOString(), summary: state.summary, signals: state.signals, adBlocker: state.bait, servers: state.live, adSlot: state.adSlot };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = el('a', { href: url, download: `ad-mirror-${data.date.slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Downloaded.';
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

  state.bait = await baitTest();
  renderBait(state.bait);
  updateAudit();

  if (config.autoRunLiveProbe) runLive();
  runAdSlot();
}

start();
