# 2. Build the extension with WXT and TypeScript

Date: 2026-10-28 · Status: accepted

## Context

The extension must ship to Chrome, Edge and Firefox (desktop and Android) from one codebase. Chrome uses a service worker background; Firefox uses an event page. Firefox reviewers rebuild bundled extensions from source and require a reproducible build. The website itself is plain JavaScript with no build step.

Options: plain JavaScript with hand-written manifests per browser; WXT (MIT, about 10,600 GitHub stars, active in October 2026); Plasmo; extension.js.

## Decision

Use WXT with TypeScript in strict mode and a vanilla DOM UI. WXT generates per-browser manifests, provides the `browser` API across browsers, produces store zips including the Firefox source zip, and integrates with Vitest and a fake browser API for unit tests.

Do not use `webextension-polyfill` (archived July 2026).

## Consequences

- One build step and a set of dev dependencies; the shipped extension contains only our code plus `tldts` and `idb`.
- Firefox submissions need the source zip and build instructions, which WXT and the README provide.
- The website stays build-free; shared design tokens are copied into the extension at build time.
