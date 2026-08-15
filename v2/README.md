# v2 — a minimal flashcard library

One HTML file is one deck. The deck holds its cards inline, `mount()` shuffles them, and the reader
gets one card on the screen with nothing else on it.

No build step, no dependencies, no framework: the browser loads `src/*.js` as it is.

## Using it

A deck file holds its cards and one call:

```html
<link rel="stylesheet" href="../src/flashcards.css" />

<script type="module">
  import { openDeck } from "../src/deck.js";

  openDeck([
    { key: "wasser-water", frontText: "das Wasser", backText: "water", category: "noun" },
    { key: "laufen-to-run", frontText: "laufen", frontDetails: "on foot", backText: "to run" },
  ]);
</script>
```

`openDeck()` assembles the whole thing: it picks the session, records grades against the schedule,
brings a card's mark back after a reload, sizes the progress row from the box ladder, and adds the link
out to the dictionary. There is no element to name — one HTML file is one deck, so the deck is the page;
pass `element` if you want it somewhere smaller.

It is composition, not library — `mount()` below still knows nothing about any of it, so a page that
wants a bare card and no schedule imports that instead:

```js
import { mount } from "../src/flashcards.js";

mount(document.body, cards); /* a card, five intents, and nothing else */
```

Everything after this section describes those pieces. You need none of it to write a deck.

`decks/everyday-german.html` and `decks/numbers-and-time.html` are complete examples. Serve them with
`npm run serve` from the repository root and open
<http://localhost:8000/v2/decks/everyday-german.html> — ES modules do not load over `file://`.

There are two decks rather than one because one deck's dictionary is that deck: the corner mark only
appears on each of them once the other has been opened, and the dictionary only becomes worth having
when it holds more than a single deck.

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
focus first and nothing the reader can click that takes the keyboard away. Key presses are ignored when
they are aimed at something else: a field being typed into (input, textarea, select, `contenteditable`)
or a focused control (a link with an `href`, a button). The two take different amounts: a field takes
every key, arrows included, because it uses them to move the caret; a control takes only `Enter` and
`Space`, the keys that would press it. The deck calls `preventDefault()` on what it takes, so without
that much, `Enter` on the corner link would flip the card instead of following it — but the arrows mean
nothing to a link and everything to the deck, so tapping the link and pressing Back doesn't leave you
unable to page. Call `destroy()` if you unmount a deck, or it goes on answering the keyboard.

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

`neutral` never moves a card's due date *later* than it already is. Renewing gives a card a schedule
where it had none; it must not buy a card time. Since a session studies what is due (§ The dictionary),
a plain renewal would mean that glancing at an overdue card and paging on hid it for a whole interval —
a box 5 card gone for a month for having been looked at.

Deciding which cards a sitting asks for is `session.js`'s job, not something to hand-roll per deck:

```js
import { chooseSession } from "../src/session.js";

mount(document.body, chooseSession(cards), { /* … */ });
```

`isDue` and `reviewState` are still exported for anything else you want to ask:

```js
import { isDue, reviewState } from "../src/review.js";

const due = cards.filter((card) => isDue(reviewState(card.key)));
```

Everything ends up in one storage key, `localStorage["flashcards.review"]` — independent of the card
dictionary above; the two never read each other. An entry carries the schedule and, alongside it, what
the reader said today and where the card stood before they said it (`baseBox`, `day`, `grade`), which is
what makes the rule above hold across a reload; `reviewState(key)` hands back `{ box, dueAt }` and
nothing else. An entry written before those fields existed still reads as a perfectly good schedule — it
just counts as a card not yet graded today. `decks/everyday-german.html` wires the whole thing up as the
example.

## The dictionary

Everything the reader has ever opened, studied as one deck:
<http://localhost:8000/v2/dictionary.html>. Not a list and not a table — the same card, the same keys and
gestures, the same marks, the same rules. A card is still judged with the card in front of you.

That is the whole design. `dictionary.html` is an ordinary deck file whose card list is empty, and a deck
file with no cards of its own studies the dictionary instead:

```js
import { chooseSession } from "../src/session.js";
import { allCards } from "../src/store.js";

const source = cards.length > 0 ? cards : allCards();

mount(document.body, chooseSession(source), { onGrade, gradeOf, progress });
```

Both pages end in exactly those lines, so there is one rule rather than a special page — and because it
is the same `mount()` call with the same wiring, one grade per card per day and *paging away settles it*
mean the same thing in both without a second implementation to keep in step. Grade a card in the deck,
open the dictionary, and the card is already there wearing its mark and refusing another grade today.

A deck and the dictionary ask for different things, because they mean different things. **A deck offers
all of its own cards**, up to twenty — you chose that deck, and being handed three cards out of nineteen
because the rest aren't due yet isn't what you asked for. **The dictionary offers what's due**, out of
everything you've ever opened, because "all of it" isn't a session; when nothing at all is due it falls
back to the cards closest to being due, so there's no "nothing due today" screen.

Both take their cards in the same order: most overdue first, and past those, soonest-due next. A card
you've never graded counts as due now, so a large deck leads with what you haven't seen.

The trade is that studying a deck reaches cards ahead of their schedule, and grading one there still
moves it — the schedule governs what the *dictionary* offers you, and working straight through a deck is
studying on your own terms instead. One grade per card per day is what stops that running away.

`chooseSession` **selects** rather than orders — `mount()` still shuffles what it is
handed (§ Interactions), because a fixed order studied every session teaches the order along with the
cards. Selecting is enough for what matters: you never meet a card that is not due while due ones are
waiting.

The pages link to each other with a small mark in the top corner — two overlapping cards, a picture
of what it leads to — and it is the one thing on the page that is not the card. It is the host page's
element, not the library's: `mount()` neither draws it nor knows it is there, and it sits outside the
mounted deck so a tap on it is never read as a tap on the card.

`openDeck()` adds it only when the dictionary holds a card that deck does not — `holdsMoreThan(cards)` —
and draws what it leads to: two overlapping cards for the dictionary, which is many decks at once, one
card for a deck.

The dictionary leads back to **the deck you came from**, which `openDeck()` records as it opens one.
With more than one deck there's no such thing as *the* deck to name in its markup, and the record is
always there when it's needed: a dictionary with nothing in it can't render at all, so if there's
something to come back from, some deck was opened to put it there.

"How many decks are there" isn't a question storage can answer — it records cards, not decks — but it
isn't the useful question either. What matters is whether that link would show you anything you can't
already see, and for the only deck you've ever opened it wouldn't. Where storage is blocked the
dictionary is empty on every visit, so the link stays away there too, rather than leading to a page that
can't render.

Cards are not attributed to the deck they came from. The same word can belong to several decks, so that
needs a mapping rather than a field, and nothing reads it yet.

## Layout

```text
docs/requirements.md what v2 is, statement by statement (`V2-*`)
src/flashcards.js    mount() — the only export a deck page needs
src/order.js         one deck's sequence: shuffle and a cursor that wraps
src/deck.js          openDeck() — a deck assembled; what a deck page calls
src/store.js         the local-storage card dictionary
src/review.js        Leitner review scheduling — separate from mount()
src/session.js       which cards a sitting asks for — also separate from mount()
src/storage.js       the local-storage map helpers store.js and review.js share
src/view.js          the DOM, the flip, and the slide
src/input.js         keys and swipes, mapped onto one set of intents
src/flashcards.css   all of the styling
decks/               one file per deck
dictionary.html      a deck of everything, i.e. a deck file with no cards
```

Tests live beside the modules they cover and run from the repository root with `npm test`.
