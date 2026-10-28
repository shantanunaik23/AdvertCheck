import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import globals from 'globals';
import autoImports from './.wxt/eslint-auto-imports.mjs';

export default defineConfig(
  { ignores: ['.output/', '.wxt/', 'node_modules/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  // Mozilla's rule set: no innerHTML, outerHTML, insertAdjacentHTML or document.write.
  noUnsanitized.configs.recommended,
  autoImports,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.name='eval']", message: 'eval is not allowed.' },
        { selector: "NewExpression[callee.name='Function']", message: 'new Function is not allowed.' },
      ],
      // Network access is blocked by CSP; this makes intent explicit in review.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'The extension must not make network requests.' },
        { name: 'XMLHttpRequest', message: 'The extension must not make network requests.' },
        { name: 'WebSocket', message: 'The extension must not make network requests.' },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', 'scripts/**', 'tests/e2e/**', '*.config.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-globals': 'off' },
  },
  { files: ['**/*.js', '**/*.mjs'], extends: [tseslint.configs.disableTypeChecked] },
);
