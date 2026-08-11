# T-20 — Content authoring pipeline

**Milestone:** M2 · **Depends on:** T-01 (types only) · **Blocks:** T-21
**Requirements covered:** `APP-3.1`–`APP-3.7`, `APP-4.1`–`APP-4.5`, `APP-6.1`–`APP-6.9`, `APP-15.1`–`APP-15.4`,
`APP-16.1`–`APP-16.4`

## Goal

Turn any of the three authoring formats into the single canonical runtime format, refusing to emit anything
when the content is invalid.

## Public contract

```ts
interface CardSourceAdapter {
  name: string;
  matches(path: string): boolean;
  load(path: string): Promise<SourceCard[]>;
}
```

Pipeline: `adapters → validate → emit`, run by `npm run build:content`.

```text
content/cards.csv, content/cards/**/*.{json,js}   →   data/decks/<id>.json, data/cards.json
```

## Acceptance criteria

1. **Given** each of CSV, JSON, and ESM sources, **then** an adapter loads it into the same internal shape
   (`APP-6.1`).
2. **Given** a JSON file containing a single card object, and another containing an array, **then** both load
   (`APP-6.1`).
3. **Given** all three formats present at once, **then** they are merged and validated together (`APP-6.2`).
4. **Given** an identifier failing `^[a-z0-9]+(-[a-z0-9]+)*$` or exceeding 64 characters, **then** the build
   fails naming the file and the identifier (`APP-3.4`, `APP-3.6`).
5. **Given** the same identifier in two files — including two *different formats* — **then** the build fails
   naming both sources (`APP-3.5`, `APP-3.6`).
6. **Given** a deck referencing an unknown identifier, **then** the build fails naming the deck and the
   reference (`APP-3.6`).
7. **Given** a per-card file whose name disagrees with an `id` field inside it, **then** the build fails
   (`APP-3.7`).
8. **Given** a successful build, **then** `data/decks/<id>.json` contains the deck's cards fully resolved in
   deck order, and `data/cards.json` contains every card (`APP-6.6`).
9. **Given** any validation failure, **then** **no** output files are written — the emit step is all or
   nothing (`APP-3.6`).
10. **Given** the emitted runtime files, **then** they contain no CSV and require no per-card module loading
    in the browser (`APP-6.8`).
11. **Given** a deck page, **then** rendering it requires exactly one generated file (`APP-6.9`).
12. **Given** `category` in a source, **then** it is carried through to the runtime format unchanged, with no
    filtering behaviour attached (`APP-15.4`).
13. **Given** the repository, **then** a demo deck of roughly 20 German cards exists and builds (`APP-16.4`).
14. **Given** 5,000 cards, **then** the build completes in reasonable time and the per-deck output stays a
    single file (`APP-4.5`).

## Test plan

Vitest against fixture directories: one per format, one mixed, and one fixture per failure mode asserting both
the non-zero exit and that no files were written. A golden-file test pins the emitted JSON shape. A generated
5,000-card fixture guards build time.

## Out of scope

Fetching or resolving at runtime (T-21). Deck metadata's mapping into library configuration (T-31).
