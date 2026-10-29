import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

// WxtVitest provides a fake `browser` API (@webext-core/fake-browser).
export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
