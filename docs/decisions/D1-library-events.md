# D1 — The library reports events; it renders no application controls

**Status:** accepted

## Context

The library's public API was `goTo(index)` and nothing else. Meanwhile the application needed to record which
cards a user had seen and how hard each one was. Neither was possible: the library never told the host which
card was showing, and the host had nowhere to put a control near the card.

Three ways out were considered: give the library callbacks; give the library callbacks *and* let the
application inject buttons into reserved slots around the card; or leave the library render-only and have the
application observe its DOM.

## Decision

The library gains three optional callbacks and a `getState()` method:

```ts
onCardShown?: (index: number) => void;
onFlip?: (index: number, side: "front" | "back") => void;
onGrade?: (index: number, grade: "easy" | "hard") => void;
```

It renders **no application-defined controls at all** — no slots, no save button. Grading is expressed through
interactions the library already owns: swipe up / swipe down, and the `↑` / `↓` keys.

## Consequences

- Vertical grading gestures move **into v1**. Both requirement documents previously listed them as future
  work; they are now the application's only route to difficulty data (`LIB-5.8`–`LIB-5.11`).
- Two questions had to be answered that only exist because of this decision:
  - *When does a card count as "shown"?* After it settles for ≥ 400 ms, or on flip — otherwise a fast swipe
    through ten cards reports ten views (`LIB-6.8`).
  - *How does a vertical grade gesture coexist with scrolling long card text?* The gesture axis locks on first
    movement, and vertical gestures are suppressed while the content area is genuinely scrollable and away
    from its boundary (`LIB-5.9`, `LIB-5.10`).
- The library still stores nothing. It reports interactions and forgets them (`LIB-10.2`).
- The application's own controls, if it ever needs any, live outside the library container (`APP-2.6`).

## Rejected

**Action slots.** Letting the application inject buttons the library positions and reports on would bake
application concepts into the library's layout, and would make "the library is presentation-only" false in
practice.

**Render-only.** Keeping `goTo` as the entire API would have forced the application to observe library DOM or
re-mount the deck to learn anything — coupling to internals that `APP-2.3` forbids, in exchange for a smaller
library spec.
