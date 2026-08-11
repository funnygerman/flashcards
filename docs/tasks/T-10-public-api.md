# T-10 — Public API, callbacks, and packaging

**Milestone:** M1 · **Depends on:** T-04 … T-09 · **Blocks:** T-31, T-32
**Requirements covered:** `LIB-6.1`, `LIB-6.2`, `LIB-6.6`–`LIB-6.13`, `LIB-9.1`–`LIB-9.3`, `LIB-9.6`,
`LIB-10.1`–`LIB-10.4`

## Goal

Close the library's public surface, wire the callbacks the application depends on, and publish the package.
This is the task the application's tasks are written against.

## Public contract

```ts
onCardShown?: (index: number) => void;
onFlip?: (index: number, side: Side) => void;
onGrade?: (index: number, grade: Grade) => void;
```

Complete public surface: the constructor, `goTo`, `getState`, `destroy`, and these three callbacks. Nothing
else.

## Acceptance criteria

1. **Given** `new FlashcardDeck("#app", cards)` with no options, **then** the deck works on defaults alone
   (`LIB-6.2`).
2. **Given** a card that becomes current, **when** it has been settled for **≥ 400 ms**, **then**
   `onCardShown` fires once with its index (`LIB-6.8`).
3. **Given** a card flipped before 400 ms elapses, **then** `onCardShown` fires immediately on the flip rather
   than waiting (`LIB-6.8`).
4. **Given** a user swiping through ten cards in under a second, **then** `onCardShown` fires only for cards
   that settled — not ten times (`LIB-6.8`).
5. **Given** a card already reported, **when** the user returns to it, **then** `onCardShown` does not fire
   again for that instance (`LIB-6.9`).
6. **Given** any flip, **then** `onFlip` fires with the side now visible (`LIB-6.10`).
7. **Given** a committed vertical gesture or `↑`/`↓`, **then** `onGrade` fires with `"easy"` or `"hard"`
   (`LIB-6.11`).
8. **Given** a callback that throws, **then** the deck keeps working and its internal state stays consistent
   (`LIB-6.12`).
9. **Given** any configuration, **then** the library renders no application-defined controls — there is no
   slot API and no host-supplied button (`LIB-6.13`).
10. **Given** the public surface, **then** it is exactly the members listed above; anything else is internal
    and `_`-prefixed (`LIB-6.6`).
11. **Given** the library at runtime, **then** it reads and writes no storage of any kind, and performs no
    network requests (`LIB-10.1`, `LIB-10.2`).
12. **Given** the package, **then** it targets the browsers in `LIB-9.1`, needs no backend and no
    authentication (`LIB-9.2`, `LIB-9.3`), and its own chrome uses logical CSS properties with the documented
    RTL arrow-key limitation (`LIB-9.6`).
13. **Given** the repository, **then** a demo page mounts the library from source with a sample deck, and the
    library README documents the full API.

## Test plan

Vitest with fake timers for the 400 ms rule and the once-per-card rule; a throwing-callback test asserting
subsequent navigation still works. Playwright for the swipe-through case with real timing. A storage-access
test that stubs `localStorage`/`sessionStorage` with throwing proxies and asserts the library never touches
them. An API-surface snapshot test that fails when a new public member appears.

## Out of scope

Anything the application does with these callbacks (T-31, T-32).
