# Security policy

They Spy is a privacy tool, so security problems matter even when they look small.

## Reporting a vulnerability

Please report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue.

Include what you found, how to reproduce it, and which part is affected (website or extension, and which browser). You should get a reply within 7 days.

## What we treat as a vulnerability

- Anything that sends a visitor's or user's data off their device without their action.
- Script injection into the website or into extension pages.
- A way for a web page to read or change the extension's stored data or settings.
- An extension permission or network access beyond what `extension/scripts/check-manifest.mjs` allows.

## Supported versions

Only the latest published version of the website and the extension receives fixes.

## Known accepted advisories

| Advisory | Package | Why it is accepted |
|---|---|---|
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) (low) | `deepmerge`, via Mozilla's `web-ext` linter | Development tool only, never shipped. It merges the linter's own configuration, not outside input. No patched version exists yet. |

`shell-quote` is pinned to 1.12.0 in the root `package.json` to fix [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) in `web-ext`'s Firefox launcher. CI fails on any advisory in packages that ship inside the extension.
