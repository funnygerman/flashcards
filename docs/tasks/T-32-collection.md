# T-32 — Personal collection (release 1.1)

**Milestone:** M3.1 · **Depends on:** T-10, T-21, T-22, T-30 · **Blocks:** —
**Requirements covered:** `APP-1.5`, `APP-9.1`–`APP-9.10`, `APP-10.1`

## Goal

Record what the user sees and how hard it was, and let them review that collection as a deck of its own.

## Public contract

Route `#/dictionary` → `progressStore.all()` → `resolveCards` → `new FlashcardDeck(...)`.

Recording is wired on the deck page:

```ts
onCardShown: (i) => store.recordShown(cards[i].id),
onGrade:     (i, g) => store.recordGrade(cards[i].id, g)
```

## Acceptance criteria

1. **Given** any deck session, **then** there is no save button and no explicit save action anywhere in the
   application (`APP-9.1`).
2. **Given** a card on screen for ≥ 400 ms or flipped, **then** it enters the collection (`APP-9.2`,
   `LIB-6.8`).
3. **Given** a card entering the collection, **then** `seenCount` increments and `lastSeen` updates
   (`APP-9.3`).
4. **Given** a grade gesture, **then** `grade` is set for that card, replacing any previous value
   (`APP-9.4`).
5. **Given** the stored collection, **then** it holds identifiers and progress only, never card content
   (`APP-9.5`).
6. **Given** a card first seen in one deck, **then** it appears in the collection independently of that deck
   (`APP-9.6`).
7. **Given** `#/dictionary`, **then** stored identifiers resolve to `Flashcard[]` and mount as an ordinary
   deck (`APP-9.7`).
8. **Given** the collection view, **then** it can be ordered by last seen or by grade, defaulting to most
   recently seen first (`APP-9.8`).
9. **Given** identifiers whose cards no longer exist, **then** they are skipped on resolve, retained in
   storage, and reported to the user as a count (`APP-9.9`).
10. **Given** an empty collection, **then** an empty state explains that cards are added by studying a deck.
11. **Given** a deck visit, **then** the deck id is recorded in `visitedDecks` (`APP-10.1`).
12. **Given** storage that is unavailable, **then** the collection page explains that progress is not being
    saved, and the rest of the application still works (`APP-8.5`).

## Test plan

Vitest for the index-to-identifier mapping and the ordering options. Playwright end-to-end: study a demo deck,
grade two cards, navigate to the collection, assert the seen cards are present with the right grades; then
delete a card from the fixture content, rebuild, and assert the missing-card count is reported while the rest
still resolve.

## Out of scope

Export/import, spaced-repetition scheduling, and the visited-decks catalog page — all roadmap.
