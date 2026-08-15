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
| `gradeOf(card)` | the grade this card already carries — `"harder"`, `"easier"`, or `null` — from before the deck was mounted; such a card arrives marked and settled (§ Interactions) |
| `progress` | `{ steps, of(card) }` — draws a column of `steps` squares in the card's corner, the bottom `of(card)` of them filled; omit it for a bare card |
| `storage` | where cards are remembered; defaults to `localStorage` |
| `random` | the shuffle's source of randomness; defaults to `Math.random` |

## Interactions

| | Key | Gesture |
|---|---|---|
| Flip the card | `Space` / `Enter` | tap or click |
| Next card | `→` | swipe right to left |
| Previous card | `←` | swipe left to right |
| Known well enough | `↑` | swipe up |
| Not known well enough | `↓` | swipe down |

`next` exits to the left and the next card arrives from the right — the card drags away in the direction
swiped, and `→` follows the same motion, arriving from ahead the way paging forward usually looks.
`previous` mirrors it. The deck wraps in both directions, so it never runs out.

Grading keeps the card in place and marks it: the border thickens on the edge the gesture went towards —
top for *known well enough* (swipe up), bottom for *not known well enough* (swipe down). Repeating a
grade the card already carries does nothing; grading the other way replaces it and counts, including
changing back to one it carried a moment ago. A card that has never been graded starts, and stays,
ungraded until it actually is.

**Paging away settles it.** The reader can say anything they like about a card, and change their mind as
often as they like, for as long as it's in front of them — what it carries when they leave is the answer.
Its mark reappears exactly as left if they page back to it, but grading it again is dropped the same way
a repeat is. Otherwise "I know this one" would be worth however many times they cared to page back to
it, and against a schedule (§ Review scheduling) that walks a card up the boxes with no recall in
between. `gradeOf(card)` is the other half: hand the library a grade a card already carries — from a
deck's own storage, from before a page reload — and it arrives wearing its mark and equally settled.

A card left ungraded when the reader pages past it is still reported, once, as `onGrade(card, "neutral")`
— so a card the reader simply forgot to grade isn't silently indistinguishable from one they never saw.
That isn't an opinion, so it settles nothing: grade the card properly later and it still counts.

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

A row of squares along the card's bottom edge, filled from the left, showing how far along the card in
front of the reader is — without the library knowing what "along" means. `progress: { steps, of(card) }`
draws `steps` squares and fills the first `of(card)` of them; leave `progress` out entirely for the bare
card v2 has always had.

```js
import { mount } from "../src/flashcards.js";
import { BOX_COUNT, reviewState } from "../src/review.js";

mount(document.body, cards, {
  progress: { steps: BOX_COUNT - 1, of: (card) => reviewState(card.key).box },
});
```

The library draws a count out of a count — it never sees a box or a schedule, the same way it never sees
what `category` means (§ Cards). `review.js`'s box is one way to feed it; anything that reduces to a
number works. Reading the box as the count outright is that deck's own mapping, not the library's — and
`steps` is one square per box above the first rather than a conventional round number, so every real
grade moves the display by one square; a coarser scale could compress two different grades onto the same
count and make one of them look like nothing happened. One fewer square than there are boxes, because
the box *is* the count: a card in box 0 fills none of them, which is what a card you've never got right
should look like. The row was seven squares of `box + 1` first, which left every never-graded and every
just-failed card showing one filled square — progress where there was none.

`BOX_COUNT - 1` rather than a literal, so the ladder in `review.js` stays the only place the number of
boxes is decided — change it there and the row resizes with it. The arithmetic lives in the deck, not in
`mount()`: the library never learns what a box is, and importing `review.js` to find out is exactly the
dependency the split exists to avoid.

Squares rather than stars: `★`/`☆` were tried and reverted after testing on a real phone. At a size that
actually read as a star shape they were too big for the row, and any count other than the culturally
fixed five read as a broken rating widget rather than a plain count — undoing the exact thing the `steps`
choice above exists to protect. A square carries no such expectation, so five of them is just five, and
not a five-star rating.

It re-reads `of(card)` at exactly two moments — a grade being recorded, and one card being exchanged for
another, in the same off-screen frame as that card's content and mark — clamped into `0..steps` either
time, so a card with no data yet or a host returning something out of range still draws a sane row.
Reading it *after* the slide instead, which is what it used to do, left the arriving card sitting there
for a fifth of a second wearing the previous card's count before it snapped: the page turn looked like
it had regraded the card. Bottom rather than beside or across the middle of the card: a 4:3 card has far more
spare width around a short word than spare height, so a row along the bottom stays clear even of a word
long enough to wrap across most of the card.

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
import { gradedToday, recordGrade } from "../src/review.js";

mount(document.body, cards, {
  onGrade: (card, level) => recordGrade(card.key, level),
  gradeOf: (card) => gradedToday(card.key),
});
```

It's a Leitner system: a card sits in a box, `easier` promotes it one box towards a longer interval,
`harder` sends it back to the first box due immediately — no partial credit, no smaller step back, and no
gentler treatment for a card in a high box, because a card the reader couldn't recall isn't a month-away
card however it earned that box. `neutral` neither promotes nor demotes; it just renews the card's
current interval from now, so a card that is only ever paged past still gets a schedule instead of
staying permanently, indistinguishably due. There are six boxes and their intervals are
`[0, 1, 3, 7, 14, 30]` days, fixed — a day, a few days, a week, a fortnight, a month — so climbing the
whole ladder takes five correct days spread across twenty-five. An entry stored in the seventh box of
the ladder this replaced reads as the top box of this one, rather than starting the card over.
Leitner rather than a continuous model like SM-2 or FSRS, because the grade here is at most three
outcomes, never a five-point quality — and Leitner is the classic scheduler for exactly that kind of
signal; it also needs no dependency.

**One grade per card per day**, however many times it's given. A grade applies to the box the card stood
in before the day's *first* grade, not to whatever an earlier grade the same day already made of it, so
a second grade replaces the first instead of stacking on it — easier, then harder, then easier leaves a
card in box 3 in box 4, exactly where saying `easier` once would have left it. Changing one's mind used
to be destructive (that sequence landed the card in box 1, *below* where it started), and grading,
reloading the page and grading again used to promote twice with no recall in between. `gradedToday(key)`
is what closes the loop in the other direction: pass it as `gradeOf` and a card graded before the reload
comes back wearing its mark, so what the reader sees and what the schedule will accept agree. The day is
the reader's own calendar day, in their own time zone. `neutral` doesn't spend it.

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

Everything ends up in one storage key, `localStorage["flashcards.review"]` — independent of the card
dictionary above; the two never read each other. An entry carries the schedule and, alongside it, what
the reader said today and where the card stood before they said it (`baseBox`, `day`, `grade`), which is
what makes the rule above hold across a reload; `reviewState(key)` hands back `{ box, dueAt }` and
nothing else. An entry written before those fields existed still reads as a perfectly good schedule — it
just counts as a card not yet graded today. `decks/everyday-german.html` wires the whole thing up as the
example.

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
