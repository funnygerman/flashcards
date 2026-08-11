# T-06 — Gesture engine (navigation and grading)

**Milestone:** M1 · **Depends on:** T-03 · **Blocks:** T-10
**Requirements covered:** `LIB-5.1`–`LIB-5.11`, `LIB-5.16`, `LIB-5.17`

## Goal

Drive the card track from pointer input on two axes: horizontal navigation that feels like a photo gallery,
and vertical grading. The decision logic is a pure state machine so it can be tested without a browser.

## Public contract

```ts
type GestureEvent =
  | { type: "down"; x: number; y: number; t: number }
  | { type: "move"; x: number; y: number; t: number }
  | { type: "up";   x: number; y: number; t: number };

type GestureOutcome =
  | { kind: "idle" }
  | { kind: "dragging"; axis: "x" | "y"; offset: number }
  | { kind: "navigate"; direction: -1 | 1 }
  | { kind: "grade"; grade: Grade }
  | { kind: "snapBack" }
  | { kind: "tap" };

export function reduceGesture(state: GestureState, event: GestureEvent, ctx: GestureContext): [GestureState, GestureOutcome];
```

## Acceptance criteria

1. **Given** pointer input, **then** it is handled through Pointer Events alone — there is no separate mouse
   and touch path (`LIB-5.1`).
2. **Given** a horizontal drag, **then** the whole track follows the pointer in real time and the adjacent
   card becomes progressively visible (`LIB-5.2`).
3. **Given** an adjacent card revealed mid-gesture, **then** it shows whichever face it is currently on
   (`LIB-5.3`).
4. **Given** the last card, **when** the user drags further, **then** there is no wrap-around and resistance
   is applied with coefficient `friction` (`LIB-5.4`, `LIB-5.5`).
5. **Given** a horizontal drag of `< swipeThreshold` of card width, **when** released, **then** the outcome is
   `snapBack`; **at or above** it, `navigate` (`LIB-5.6`).
6. **Given** a committed horizontal gesture, **then** no flip occurs (`LIB-5.7`).
7. **Given** first movement where `|dx| > |dy|`, **then** the axis locks to `x`; otherwise to `y`; and the
   lock does not change for the rest of the gesture (`LIB-5.9`).
8. **Given** a committed upward gesture, **then** the outcome is `grade: "easy"`; downward, `grade: "hard"`;
   below `gradeThreshold` of card height, `snapBack` with no event (`LIB-5.8`, `LIB-5.11`).
9. **Given** a card whose content area is scrollable and not at the relevant scroll boundary, **when** the
   user drags vertically, **then** no grade gesture starts and the content scrolls; `touch-action` is `none`
   on the card and `pan-y` on a scrollable content area (`LIB-5.10`).
10. **Given** a mouse drag on desktop, **then** it does not navigate, and text selection works normally
    (`LIB-5.16`, `LIB-5.17`).

## Test plan

Vitest drives `reduceGesture` through recorded event sequences: threshold boundaries either side of the commit
point, axis-lock cases including a diagonal drag, edge resistance arithmetic, and a tap. Playwright covers the
real thing on a touch-emulated device: gallery tracking, snap-back, grade gestures, and the scroll-vs-grade
case using a deliberately long card.

## Out of scope

What happens to a grade once emitted — the library stores nothing (`LIB-10.2`). Callback wiring is T-10.
