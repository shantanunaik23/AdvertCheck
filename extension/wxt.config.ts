import { defineConfig } from 'wxt';

// Permissions and CSP are deliberately minimal; see docs/adr/0004.
// scripts/check-manifest.mjs fails the build if they change without review.
export default defineConfig({
  manifestVersion: 3,
  // Vite's modulepreload polyfill calls fetch(); every supported browser has
  // native modulepreload, so leave it out of a no-network extension.
  vite: () => ({ build: { modulePreload: { polyfill: false } } }),
  // Firefox reviewers rebuild from the sources zip, so it must include the
  // workspace root's package.json and lockfile. The website is left out.
  zip: {
    sourcesRoot: '..',
    // An explicit allowlist, so nothing unexpected is uploaded to a store.
    includeSources: ['package.json', 'package-lock.json', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'extension/**'],
  },
  manifest: ({ browser }) => ({
    name: 'Ad Mirror',
    description: 'See what websites tell advertisers about you. Everything stays on your device.',
    homepage_url: 'https://shantanunaik23.github.io/AdvertCheck/',
    permissions: ['webRequest', 'storage', 'alarms', 'scripting'],
    // Chrome reports a request only if the extension can access both the
    // tracker and the page that made it, so access to all sites is needed.
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      // Extension pages may not connect anywhere: nothing leaves the device.
      extension_pages:
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'ad-mirror@shantanunaik23.github.io',
          strict_min_version: '142.0',
          // Firefox's data consent: the extension collects nothing.
          data_collection_permissions: { required: ['none'] },
        },
        gecko_android: { strict_min_version: '142.0' },
      },
    }),
  }),
});
