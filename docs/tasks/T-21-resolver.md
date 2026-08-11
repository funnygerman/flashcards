# T-21 — Deck definitions and card resolver

**Milestone:** M2 · **Depends on:** T-20 · **Blocks:** T-31, T-32
**Requirements covered:** `APP-2.1`, `APP-2.2`, `APP-2.4`, `APP-2.5`, `APP-5.1`–`APP-5.5`

## Goal

The runtime data layer: fetch generated content, and turn identifiers into the `Flashcard[]` the library
consumes.

## Public contract

```ts
export async function loadDeck(deckId: string): Promise<ResolvedDeck>;
export async function resolveCards(ids: string[]): Promise<{ cards: AppCard[]; missing: string[] }>;

interface AppCard extends Flashcard { id: string }
interface ResolvedDeck { meta: DeckMeta; cards: AppCard[] }
```

## Acceptance criteria

1. **Given** a deck id, **when** `loadDeck` runs, **then** it fetches exactly one generated file and returns
   metadata plus cards in deck order (`APP-2.1`, `APP-6.9`).
2. **Given** the returned cards, **then** each carries an `id` alongside the library's own fields, and the
   library ignores it (`APP-2.4`, `LIB-2.5`).
3. **Given** a resolved array, **then** its order is stable and index-addressable, so the application can map
   a library index back to an identifier (`APP-2.5`).
4. **Given** a list of identifiers where some no longer exist, **when** `resolveCards` runs, **then** the
   known cards are returned and the unknown ones are reported in `missing` rather than throwing (`APP-9.9`
   depends on this).
5. **Given** a deck, **then** it holds references only — no card content is duplicated in a deck file
   (`APP-5.1`, `APP-4.3`).
6. **Given** deck metadata, **then** `title`, `description`, `cover`, and `info` are exposed for the caller to
   map into library configuration (`APP-5.3`, `APP-5.5`).
7. **Given** deck metadata, **then** none of it is merged into the `Flashcard` objects (`APP-5.4`).
8. **Given** a failed fetch or malformed JSON, **then** a typed error is returned that the caller can render,
   not an unhandled rejection.
9. **Given** the resolver, **then** it depends on nothing from the library beyond the `Flashcard` type
   (`APP-2.2`).

## Test plan

Vitest with a stubbed `fetch`: happy path, partial resolution with missing ids, network failure, malformed
JSON, and an assertion that deck metadata never leaks into card objects.

## Out of scope

Shuffling (T-31), progress (T-22), and any UI.
