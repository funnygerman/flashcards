# T-00 — Scaffold and tooling

**Milestone:** M0 · **Depends on:** — · **Blocks:** every other task
**Requirements covered:** `APP-17.1`, `APP-17.2`, `APP-17.3`, `APP-17.4`, `APP-17.6`

## Goal

Create the workspace, build, and test infrastructure. No product code.

## Public contract

```text
package.json          npm workspaces: library, app
library/              @flashcards/library — tsc → ESM + .d.ts
app/                  application — tsc → ESM, import map in index.html
content/              authoring sources (empty for now)
.github/workflows/ci.yml
```

Commands, at the repository root:

| Command | Does |
|---|---|
| `npm run build` | builds library, then app |
| `npm run test` | Vitest across both workspaces |
| `npm run test:e2e` | Playwright |
| `npm run lint` | ESLint + `tsc --noEmit` |
| `npm run dev` | `tsc --watch` plus a static server |

## Acceptance criteria

1. **Given** a clean clone, **when** `npm install && npm run build` runs, **then** both workspaces compile and
   `library/dist/index.js` and `library/dist/index.d.ts` exist.
2. **Given** the built output, **when** `app/index.html` is served over HTTP, **then** the import map resolves
   `@flashcards/library` and the page loads with no console errors.
3. **Given** the repository, **when** `npm run lint` runs, **then** it exits zero.
4. **Given** a push, **when** CI runs, **then** build, lint, unit tests, and Playwright all execute.
5. **Given** `app/index.html` opened via `file://`, **then** failing is acceptable and documented
   (`APP-17.6`).

## Test plan

One placeholder Vitest test per workspace and one Playwright test that loads the page, purely to prove the
harnesses run in CI.

## Out of scope

Any library or application behaviour. The GitHub Pages workflow is T-33.
