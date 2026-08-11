# @flashcards/library

The reusable `FlashcardDeck` presentation component. Specification:
[`docs/library/requirements.md`](../docs/library/requirements.md) (`LIB-*` requirement IDs).

**Status: scaffold only.** The public surface arrives across
[T-01 … T-10](../docs/tasks/README.md); today this package exports a version constant so the build and test
harnesses have something real to work on.

## Design constraints

- No runtime dependencies (`LIB-9.5`).
- Presentation and interaction only — it stores nothing, not even which cards have been seen (`LIB-10.2`).
- Plain ESM plus `.d.ts`, compiled by `tsc` with no bundler
  ([D4](../docs/decisions/D4-typescript-no-bundler.md)).
- Relative imports must carry explicit `.js` extensions — `nodenext` resolution enforces this, because the
  browser loads the output directly.

## Commands

Run from the repository root:

```sh
npm run build     # tsc → dist/ (ESM + .d.ts)
npm test          # Vitest, against src/ rather than dist/
npm run lint      # ESLint + typecheck
```
