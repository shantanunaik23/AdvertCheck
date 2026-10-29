// Fails if a built manifest asks for anything beyond the reviewed set in
// docs/adr/0004. Changing permissions means updating this file in review.
// Run after `npm run build`.

import { readFile } from 'node:fs/promises';

const expected = {
  permissions: ['alarms', 'scripting', 'storage', 'webRequest'],
  host_permissions: ['<all_urls>'],
  absent: [
    'content_scripts',
    'web_accessible_resources',
    'externally_connectable',
    'optional_permissions',
    'optional_host_permissions',
  ],
  csp: /connect-src 'none'/,
};

let failed = false;
for (const target of ['chrome-mv3', 'firefox-mv3']) {
  const manifest = JSON.parse(await readFile(new URL(`../.output/${target}/manifest.json`, import.meta.url), 'utf8'));
  const problems = [];
  const same = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  if (!same(manifest.permissions, expected.permissions))
    problems.push(`permissions are ${JSON.stringify(manifest.permissions)}`);
  if (!same(manifest.host_permissions, expected.host_permissions))
    problems.push(`host_permissions are ${JSON.stringify(manifest.host_permissions)}`);
  for (const key of expected.absent) if (key in manifest) problems.push(`unexpected "${key}"`);
  if (!expected.csp.test(manifest.content_security_policy?.extension_pages ?? ''))
    problems.push('CSP no longer blocks network connections');
  if (problems.length) {
    failed = true;
    console.error(`${target}: ${problems.join('; ')}`);
  } else {
    console.log(`${target}: permissions and CSP match the reviewed set.`);
  }
}
// The on-page feed (ADR 0005) must not signal the page or touch the network.
for (const target of ['chrome-mv3', 'firefox-mv3']) {
  const feed = await readFile(new URL(`../.output/${target}/feed.js`, import.meta.url), 'utf8');
  const banned = ['postMessage', 'dispatchEvent', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'innerHTML'].filter((s) =>
    feed.includes(s),
  );
  if (banned.length) {
    failed = true;
    console.error(`${target}: feed.js uses ${banned.join(', ')}`);
  } else {
    console.log(`${target}: feed.js does not signal the page or use the network.`);
  }
}
process.exit(failed ? 1 : 0);
