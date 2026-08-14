# v2 — a minimal flashcard library

One HTML file is one deck. The deck holds its cards inline, `mount()` shuffles them, and the reader
gets one card on the screen with nothing else on it.

No build step, no dependencies, no framework: the browser loads `src/*.js` as it is.

## Using it

```html
<link rel="stylesheet" href="../src/flashcards.css" />

<script type="module">
  import { mount } from "../src/flashcards.js";

  mount(document.body, [
    { key: "wasser-water", frontText: "das Wasser", backText: "water", category: "noun" },
    { key: "laufen-to-run", frontText: "laufen", frontDetails: "on foot", backText: "to run" },
  ]);
</script>
```

`decks/everyday-german.html` is a complete example. Serve it with `npm run serve` from the repository
root and open <http://localhost:8000/v2/decks/everyday-german.html> — ES modules do not load over
`file://`.

Once this is on `main` it is published at
<https://funnygerman.github.io/flashcards/v2/decks/everyday-german.html>, and linked from the site root.

### Cards

```js
{
  key: "wasser-water",       // the card's identity in local storage; opaque to the library
  frontText: "das Wasser",
  frontDetails: "…",         // optional
  backText: "water",
  backDetails: "…",          // optional
  category: "noun",          // optional
}
```

### `mount(element, cards, options?)`

Returns `{ destroy() }`. Options:

| | |
|---|---|
| `onGrade(card, level)` | `"harder"` or `"easier"` on an explicit grade; `"neutral"` when the reader pages past a card without grading it, so a forgotten card is still reported |
| `progress` | `{ steps, of(card) }` — draws a column of `steps` squares beside the card, the bottom `of(card)` of them filled; omit it for a bare card |
| `storage` | where cards are remembered; defaults to `localStorage` |
| `random` | the shuffle's source of randomness; defaults to `Math.random` |

## Interactions

| | Key | Gesture |
|---|---|---|
| Flip the card | `Space` / `Enter` | tap or click |
| Next card | `→` | swipe left to right |
| Previous card | `←` | swipe right to left |
| Not known well enough | `↑` | swipe up |
| Known well enough | `↓` | swipe down |

The deck wraps in both directions, so it never runs out.

Grading keeps the card in place and marks it: the border thickens on the edge the gesture went towards,
top for *not known well enough*, bottom for *known well enough*. Repeating a grade the card already
carries does nothing — the mark is already there and `onGrade` is not called again. Grading the other
way replaces it and does count, including changing back. Moving to another card clears the mark.

A card left ungraded when the reader pages past it is still reported, once, as `onGrade(card, "neutral")`
— so a card the reader simply forgot to grade isn't silently indistinguishable from one they never saw.

Keys are bound to the document, not to a focusable card: one page is one deck, so there is nothing to
focus first and nothing the reader can click that takes the keyboard away. Key presses are ignored
while the reader is typing into an input, a textarea, a select, or anything `contenteditable`.
Call `destroy()` if you unmount a deck, or it goes on answering the keyboard.

## Card size

Unchanged from the old library's `LIB-4.3`–`LIB-4.12`: a **4:3** card, as wide as 75 % of the viewport
allows, capped at 900 px, and never taller than 75 % of the viewport in portrait or 88 % in landscape.
Type is a fraction of the card's own width — `0.085` for the text, `0.05` for the details.

Where the deck is the page, the stylesheet owns the page box too: the document is exactly the visible
viewport and nothing scrolls, so a phone's address bar stays put under a vertical swipe and a swipe down
cannot turn into a pull-to-refresh. A deck mounted into a smaller container leaves its host's page alone.

The difference is that CSS computes it, in one `min()` on `--fc-card-w`, instead of a JavaScript sizing
engine with a throttled resize listener. The numbers come out the same: 900×675 on a 1280×800 desktop,
292×219 on a 390×844 phone. Only the old integer-pixel rounding is gone — CSS sizes to the subpixel.

## Progress indicator

A column of squares to the left of the card, filled from the bottom, showing how far along the card in
front of the reader is — without the library knowing what "along" means. `progress: { steps, of(card) }`
draws `steps` squares and fills the bottom `of(card)` of them; leave `progress` out entirely for the bare
card v2 has always had.

```js
import { mount } from "../src/flashcards.js";
import { reviewState } from "../src/review.js";

mount(document.body, cards, {
  progress: { steps: 7, of: (card) => reviewState(card.key).box + 1 },
});
```

The library draws a count out of a count — it never sees a box or a schedule, the same way it never sees
what `category` means (§ Cards). `review.js`'s box is one way to feed it; anything that reduces to a
number works. The `+ 1` above is that deck's own mapping (box is 0-indexed, the dots are a count), not
the library's.

It re-reads `of(card)` at exactly two moments — a new card arriving, and a grade being recorded — clamped
into `0..steps` either time, so a card with no data yet or a host returning something out of range still
draws a sane column.

This isn't the position-in-deck indicator v2 deliberately doesn't have; it says how well the reader knows
*this* card, not where they are in the session. It's designed to be reused by a future dictionary-view
row, not just this single-card view, which is why it stayed generic rather than Leitner-shaped.

## Local storage

Every card the reader opens is written to `localStorage["flashcards.cards"]`, keyed by `key`, and is
loaded from there on the next visit — card content is assumed not to change. This is the groundwork for
a later dictionary view; it holds no grade and no schedule.

## Review scheduling

Not part of `mount()` — the library never stores a grade or computes a schedule (see `onGrade` above).
`src/review.js` is a separate module a deck page can wire up itself:

```js
import { mount } from "../src/flashcards.js";
import { recordGrade } from "../src/review.js";

mount(document.body, cards, {
  onGrade: (card, level) => recordGrade(card.key, level),
});
```

It's a Leitner system: a card sits in a box, `easier` promotes it one box towards a longer interval,
`harder` sends it back to the first box due immediately — no partial credit, no smaller step back.
`neutral` neither promotes nor demotes; it just renews the card's current interval from now, so a card
that is only ever paged past still gets a schedule instead of staying permanently, indistinguishably
due. Box intervals are `[0, 1, 2, 4, 8, 16, 32]` days, fixed. Leitner rather than a continuous model like
SM-2 or FSRS, because the grade here is at most three outcomes, never a five-point quality — and Leitner
is the classic scheduler for exactly that kind of signal; it also needs no dependency.

```js
import { isDue, reviewState } from "../src/review.js";

const due = cards.filter((card) => isDue(reviewState(card.key)));
```

For a large deck, cap how many cards a session asks for at once, prioritizing the most overdue: `mount()`
already shuffles whatever it's given, so sorting by `dueAt` only decides *which* cards make the cut, not
the order they're studied in.

```js
const SESSION_LIMIT = 20;

const today = cards
  .filter((card) => isDue(reviewState(card.key)))
  .sort((a, b) => reviewState(a.key).dueAt - reviewState(b.key).dueAt)
  .slice(0, SESSION_LIMIT);

mount(document.body, today.length > 0 ? today : cards, { /* … */ });
```

Everything ends up in one storage key, `localStorage["flashcards.review"]`, as `{ [key]: { box, dueAt } }`
— independent of the card dictionary above; the two never read each other. `decks/everyday-german.html`
wires it up as the example.

## Layout

```text
docs/requirements.md what v2 is, statement by statement (`V2-*`)
src/flashcards.js    mount() — the only export a deck page needs
src/deck.js          shuffle and a cursor that wraps
src/store.js         the local-storage card dictionary
src/review.js        Leitner review scheduling — separate from mount()
src/storage.js       the local-storage map helpers store.js and review.js share
src/view.js          the DOM, the flip, and the slide
src/input.js         keys and swipes, mapped onto one set of intents
src/flashcards.css   all of the styling
decks/               one file per deck
```

Tests live beside the modules they cover and run from the repository root with `npm test`.
