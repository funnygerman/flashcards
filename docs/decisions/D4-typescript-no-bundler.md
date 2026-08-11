# D4 — TypeScript compiled by `tsc`, no bundler

**Status:** accepted

## Context

Neither requirement document mentioned an implementation language, build tooling, or tests, yet both were
written using TypeScript interfaces. The options ranged from plain ES modules with JSDoc types and no build at
all, through `tsc` alone, to a full Vite toolchain.

## Decision

TypeScript, compiled by `tsc` to plain ES modules. No bundler. The library ships ESM plus `.d.ts` and a
standalone stylesheet. npm workspaces hold `library/` and `app/`; the application resolves
`@flashcards/library` through an **import map** in `index.html`.

Tests: Vitest with jsdom for logic, Playwright for gestures, keyboard, and accessibility.

## Consequences

- The library is one dependency-free class with no assets. `tsc` output is readable, debuggable in the browser
  without source maps gymnastics, and needs no build configuration to explain.
- Import maps are what make this work without a bundler, and they are supported across the entire target
  baseline (`LIB-9.1`, Safari 16.4+). Bare specifiers resolve in the browser.
- The dev loop is `tsc --watch` plus any static server — two terminals and no hot reload. `file://` is not
  supported, which the original draft already assumed.
- Not bundling for production does not cost the test story: Vitest is a test runner choice, independent of how
  the application ships.
- A content build step exists regardless (`APP-6.5`), so "no build step at all" was never actually on the
  table.
- **Revisit if:** a service worker or PWA is added, or the module count grows enough that per-module fetching
  becomes wasteful. Migrating to Vite is cheap precisely because the source is already ESM and TypeScript.

## Rejected

**Plain ESM JavaScript with JSDoc.** Less machinery, but the gesture state machine and the sizing math are the
two places in this project where a compiler earns its keep, and both are being written from scratch.

**Vite from the start.** Dev server and hot reload are real conveniences, but they buy little for a
dependency-free library and a two-page application, and they put a build tool between the author and the
output for the whole life of the project.
