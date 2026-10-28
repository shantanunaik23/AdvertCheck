import { test, expect } from './fixtures';

test('loads, starts its background worker and opens the welcome page once', async ({ context, extensionId }) => {
  expect(extensionId).toMatch(/^[a-p]{32}$/);
  const welcome =
    context.pages().find((p) => p.url().endsWith('/welcome.html')) ?? (await context.waitForEvent('page'));
  await expect(welcome).toHaveURL(`chrome-extension://${extensionId}/welcome.html`);
  await expect(welcome.getByRole('heading', { level: 1 })).toHaveText('Ad Mirror is installed');
});

test('extension pages cannot make network requests', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/welcome.html`);
  // Check that the CSP is what stops it, not just a missing network.
  const directive = await page.evaluate(async () => {
    const violation = new Promise<string>((resolve) => {
      document.addEventListener('securitypolicyviolation', (e) => {
        resolve(e.effectiveDirective);
      });
    });
    await fetch('https://example.com/').catch(() => undefined);
    return violation;
  });
  expect(directive).toBe('connect-src');
});
