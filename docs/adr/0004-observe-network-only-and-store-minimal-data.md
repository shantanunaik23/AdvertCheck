# 4. Observe network requests only, and store the minimum

Date: 2026-10-28 · Status: accepted

## Context

The extension records actions that lead to personalised ads. It could read page content (content scripts) or only watch network requests. Chrome reports a request to an extension only if it has host access to both the requested URL and the page that made it, so broad host access is needed either way.

## Decision

- Version 1 uses `webRequest` observation only: no content scripts, no `scripting`, no `web_accessible_resources`, no `externally_connectable`.
- Request bodies are read only for endpoints that carry the event name in the body (GA4, TikTok), parsed in memory and discarded.
- Stored per record: time, page site (registrable domain), company, category, event name, and for searches the words (user can turn this off). Product name or category only when a site sent it to an ad company. A boolean when hashed contact details were sent; never the hash.
- Never stored: full URLs, paths, page content, cookies, IDs, request bodies.
- Default retention 30 days, adjustable; pause, per-site exclusion, export and delete-all in settings. Private windows are excluded unless the user enables the extension there.
- The extension pages' Content Security Policy blocks all network connections.

## Consequences

- A hostile web page has no extension code in its process to attack.
- Some signals (ads displayed, cookie banner choices) need content scripts and are deferred to a later version with their own decision record.
- The data on disk is small, short-lived and low in detail, which limits harm if someone else reads it.
