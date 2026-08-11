# T-05 — Flip interaction

**Milestone:** M1 · **Depends on:** T-04 · **Blocks:** T-10
**Requirements covered:** `LIB-4.35`, `LIB-4.36`, `LIB-5.12`–`LIB-5.15`, `LIB-5.20`, `LIB-5.22`

## Goal

Flip a card between its faces on tap, click, or key — without stealing the gesture from text selection or from
a swipe.

## Public contract

Internal: `_flip(index)`. Emits `onFlip` (wired in T-10).

## Acceptance criteria

1. **Given** a card, **when** it is tapped or clicked, **then** it flips (`LIB-5.12`).
2. **Given** a pointer press, **when** it is released, **then** the flip commits only if total movement is
   `< 8 px` **and** duration is `< 500 ms` **and** `window.getSelection()` is collapsed (`LIB-5.13`).
3. **Given** a user dragging across the card to select text, **when** the pointer is released, **then** no
   flip occurs and the selection survives (`LIB-5.13`, `LIB-5.17`).
4. **Given** a long-press text selection on touch, **then** any pending flip is cancelled (`LIB-5.15`).
5. **Given** a card flipped to its back, **when** the user navigates away and returns, **then** it is still on
   its back (`LIB-5.14`).
6. **Given** a focused card, **when** `Enter` or `Space` is pressed, **then** it flips (`LIB-5.20`).
7. **Given** `Space` used to flip, **then** the page does not scroll — `preventDefault()` is called
   (`LIB-5.22`).
8. **Given** a flip, **then** it animates as `rotateY` over 300 ms; **given** `prefers-reduced-motion: reduce`,
   **then** the face changes instantly with no transition (`LIB-4.35`, `LIB-4.36`).

## Test plan

Playwright for the pointer rules — a real drag-select release asserting no flip, a quick tap asserting a flip,
a slow press asserting no flip — plus keyboard cases and a `prefers-reduced-motion` emulation run. jsdom
covers per-card flip-state persistence across navigation.

## Out of scope

The swipe gesture itself and the flip-vs-swipe arbitration on the horizontal axis, which belong to T-06.
