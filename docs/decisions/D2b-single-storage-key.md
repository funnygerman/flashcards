# D2b — All user progress lives under one `localStorage` key

**Status:** accepted (recommended by the implementer; open to revision)

## Context

[D1b](D1b-collection-is-everything-seen.md) made the collection grow to one record per card the user has ever
seen. That raised a storage-shape question: one key per card, or one key holding everything?

`localStorage` has no files and no indexes. It is a synchronous string-to-string map, and every access blocks
the main thread.

## Decision

One key, `fc.v1.progress`, holding the whole model. The in-memory copy is the source of truth; writes are
debounced and flushed on a timer and on `pagehide` / `visibilitychange`.

## Consequences

- Loading the collection is a single `getItem` plus a single `JSON.parse`, rather than enumerating thousands
  of keys and parsing each one — which is what a key-per-card layout would force on the page that needs the
  data most.
- Versioning and migration have one entry point (`APP-8.4`).
- Export/import becomes a serialization of one object, which is most of the work of that roadmap feature
  (`APP-14.2`).
- The obvious cost — every write rewrites the whole blob — is removed by the debounce. Recording a card view
  touches memory; disk is touched on a timer and when the page goes away.
- Growth needs watching, so the store warns past 1 MB (`APP-8.7`). The escape hatch is IndexedDB, which is
  asynchronous and indexed, and where one record per card becomes the right shape.

## Rejected

**One key per card** (`fc.v1.card.<id>`). Constant-time writes, but the collection page pays for it on every
load, quota overhead per key is worse, and migration and export both become iterations over an unknown key
space.

**A hybrid index plus chunks.** Solves a scaling problem this application does not have yet, at the cost of
complexity it would carry from day one.
