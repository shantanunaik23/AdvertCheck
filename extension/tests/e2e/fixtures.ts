import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const extensionPath = path.resolve(import.meta.dirname, '../../.output/chrome-mv3');

// Follows https://playwright.dev/docs/chrome-extensions: extensions need a
// persistent context and Playwright's bundled Chromium.
export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures require an object pattern.
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const id = new URL(worker.url()).host;
    // The worker is registered before its script has finished starting. The
    // welcome page opens from inside the background script after all its
    // listeners are registered, so waiting for it means the extension is ready.
    const isWelcome = (p: { url: () => string }) => p.url() === `chrome-extension://${id}/welcome.html`;
    if (!context.pages().some(isWelcome)) await context.waitForEvent('page', { predicate: isWelcome });
    await use(id);
  },
});

export const expect = test.expect;
