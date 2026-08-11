# T-31 — Deck page (release 1.0)

**Milestone:** M3 · **Depends on:** T-10, T-21, T-30 · **Blocks:** T-33
**Requirements covered:** `APP-1.1`–`APP-1.4`, `APP-1.7`, `APP-5.6`, `APP-11.1`–`APP-11.4`

## Goal

The whole of release 1.0: open a deck by URL, shuffle it, and render it through the library.

## Public contract

Route `#/deck/<deck-id>` → `loadDeck` → shuffle → `new FlashcardDeck(container, cards, options)`.

## Acceptance criteria

1. **Given** `#/deck/everyday-german`, **then** the deck loads and its cards render (`APP-1.4`).
2. **Given** a new deck session, **then** the cards are shuffled (`APP-11.1`).
3. **Given** an open session, **then** the order stays stable for its duration (`APP-11.2`).
4. **Given** a reload in the same tab, **then** the order is preserved, because the seed lives in
   `sessionStorage` per deck; **given** a new tab or a later visit, **then** the order differs (`APP-11.3`).
5. **Given** a seed, **then** the shuffle is a seeded Fisher–Yates and is reproducible from that seed
   (`APP-11.3`).
6. **Given** deck metadata, **then** `title`/`cover` map to the library's title configuration and
   `description`/`info` to its information panel (`APP-5.5`).
7. **Given** the first mount of a deck in a browsing session, **then** the title screen is shown; **given** a
   later mount in the same session, **then** it is not — tracked in `sessionStorage` by the application, never
   by the library (`APP-5.6`, `LIB-4.24`).
8. **Given** release 1.0, **then** the page does **not** subscribe to `onGrade`, and grading gestures work
   while changing nothing (`APP-1.7`).
9. **Given** release 1.0, **then** no progress is written anywhere.
10. **Given** an unknown deck id, **then** the not-found view renders (`APP-7.6`).
11. **Given** a slow or failed content fetch, **then** a loading state and then an error state render, with a
    retry.

## Test plan

Vitest for the seeded shuffle: same seed reproduces the order, different seeds diverge, and every card appears
exactly once. Playwright end-to-end: load the demo deck, assert a card is visible, swipe, flip, reload and
assert order stability, then assert that `localStorage` is still empty after a full session.

## Out of scope

Recording anything the user does — that is T-32 in release 1.1.
