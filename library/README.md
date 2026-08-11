# @flashcards/library

The reusable `FlashcardDeck` presentation component. Specification:
[`docs/library/requirements.md`](../docs/library/requirements.md) (`LIB-*` requirement IDs).

**Status: types and configuration only** ([T-01](../docs/tasks/T-01-types-and-config.md)). The package exports
`Flashcard`, `DeckOptions`, `ResolvedOptions`, `TitleConfig`, `InfoConfig`, `Side`, `Grade`, and
`resolveOptions`. No DOM, no rendering, no `FlashcardDeck` class yet — those arrive across
[T-02 … T-10](../docs/tasks/README.md).

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
