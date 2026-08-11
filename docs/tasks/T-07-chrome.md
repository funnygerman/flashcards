# T-07 — Arrows, indicators, and `goTo`

**Milestone:** M1 · **Depends on:** T-03 · **Blocks:** T-10
**Requirements covered:** `LIB-4.15`–`LIB-4.18`, `LIB-5.18`, `LIB-5.19`, `LIB-6.3`, `LIB-6.4`

## Goal

The navigation affordances outside the card, and the programmatic navigation they share.

## Public contract

```ts
goTo(index: number, options?: { animate?: boolean }): void;
getState(): { index: number; side: Side; count: number };
```

## Acceptance criteria

1. **Given** any deck, **then** indicators sit below the card and never overlay it (`LIB-4.15`).
2. **Given** `n ≤ dotLimit` cards, **then** dots are shown; **given** more, **then** a `3 / 42` counter is
   shown instead (`LIB-4.16`).
3. **Given** exactly one card, **then** indicators are hidden and both arrows are disabled (`LIB-4.17`).
4. **Given** an empty deck, **then** an empty-state message renders, no gestures are bound, nothing throws,
   and `goTo` is a no-op (`LIB-4.18`).
5. **Given** the arrow buttons, **then** they sit outside the card and navigate one card per activation
   (`LIB-5.18`).
6. **Given** `←` / `→`, **then** they navigate (`LIB-5.19`).
7. **Given** the first card, **then** the previous arrow is disabled; **given** the last, the next arrow is —
   there is no wrap (`LIB-5.4`).
8. **Given** `goTo(-5)` or `goTo(999)`, **then** the index is clamped to the valid range (`LIB-6.3`).
9. **Given** `goTo(n)` with no options, **then** it does not animate (`LIB-6.3`).
10. **Given** any point in time, **then** `getState()` reports the current index, visible side, and card count
    (`LIB-6.4`).

## Test plan

jsdom for indicator mode switching either side of `dotLimit`, the one-card and zero-card cases, clamping, and
`getState`. Playwright for arrow clicks and keyboard navigation against a real rendered deck.

## Out of scope

Focus movement on navigation, and the accessible names of these controls — both are T-08.
