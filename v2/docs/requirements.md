# v2 Requirements

**Applies to:** `v2/` · **Requirement IDs:** `V2-*`

Each normative statement carries a stable ID. IDs are never reused or renumbered — a withdrawn
requirement is marked *(withdrawn)* rather than deleted. This document describes what v2 is, not the
order it was built in.

---

## 1. Purpose

**V2-1.1** v2 is a library for showing flashcards in a browser and reacting to a reader working through
them.

**V2-1.2** One HTML file is one deck. The deck holds its cards; the library holds no catalogue, no
routing, and no notion of a collection of decks.

**V2-1.3** The library is agnostic about what a card means. Language vocabulary, questions and answers,
definitions and terminology are all the same to it.

**V2-1.4** The library is responsible for presentation and interaction. It records the cards it is shown
(§6) but does not schedule, score, or interpret them.

---

## 2. Cards

**V2-2.1** A card is a flat JSON object:

```js
{
  key: "wasser-water",
  frontText: "das Wasser",
  frontDetails: "…",
  backText: "water",
  backDetails: "…",
  category: "noun",
}
```

**V2-2.2** `frontText` and `backText` are required. `frontDetails`, `backDetails` and `category` are
optional; a field with no content is not rendered rather than rendered empty.

**V2-2.3** `key` identifies the card in storage and is otherwise opaque: the library assigns it no
meaning, derives nothing from it, and never displays it.

**V2-2.4** The library assigns no meaning to `details` either. It may hold a pronunciation, an example,
a hint, or a disambiguation between two cards that share a front.

**V2-2.5** JSON is the only card format. There is no CSV, no authoring pipeline, and no build step
between a deck file and the browser.

**V2-2.6** Card content is text. It is written to the DOM as text and must never be interpreted as
markup.

---

## 3. Deck and session

**V2-3.1** `mount(element, cards, options?)` renders a deck into `element` and returns a handle with
`destroy()`.

**V2-3.2** `options` are `onGrade(card, level)`, `storage`, and `random`. `storage` and `random` exist so
the library can be tested and embedded without reaching for globals.

**V2-3.3** The deck is shuffled on mount. The caller's array is not reordered.

**V2-3.4** One card is on screen at a time.

**V2-3.5** The deck wraps in both directions: past the last card is the first, and back from the first is
the last. A session has no end and no completion screen.

**V2-3.6** Mounting an empty deck is an error, reported by throwing.

**V2-3.7** `destroy()` removes the deck's DOM and unbinds every listener it added, including the
document-level ones (§4).

---

## 4. Interactions

**V2-4.1** Five intents exist: `flip`, `next`, `previous`, `harder`, `easier`. Keyboard and pointer both
map onto this one set.

| Intent | Key | Gesture |
|---|---|---|
| `flip` | `Space`, `Enter` | tap or click |
| `next` | `→` | swipe right to left |
| `previous` | `←` | swipe left to right |
| `easier` | `↑` | swipe up |
| `harder` | `↓` | swipe down |

`next` exits to the left and arrives from the right — the swipe drags the card away in the direction
travelled, and the same motion carries over to the keyboard: pressing `→` for "forward" arrives from
ahead, the way paging forward through a sequence usually looks. `previous` is the mirror image.

**V2-4.2** A pointer gesture shorter than the swipe threshold is a tap. The threshold is 40 px.

**V2-4.3** A swipe is resolved on its dominant axis: the larger of the horizontal and vertical distance
decides which pair of intents applies.

**V2-4.4** Only the primary pointer button starts a gesture. A right- or middle-click is not an
interaction with the card.

**V2-4.5** The pointer is captured for the duration of a gesture, so a release outside the card is still
the end of that gesture and no other.

**V2-4.6** Keys are bound to the document, not to a focusable element. One page is one deck, so there is
nothing to focus first and nothing the reader can click that takes the keyboard away.

**V2-4.7** Key presses are ignored while the reader is typing into an input, a textarea, a select, or a
`contenteditable` element.

**V2-4.8** The page does not scroll or select text under a gesture.

**V2-4.9** An intent arriving while a page turn is in flight is dropped rather than queued.

---

## 5. Grading

**V2-5.1** `harder` means *not known well enough*; `easier` means *known well enough*.

**V2-5.2** Grading does not move the deck. The card stays in front of the reader.

**V2-5.3** A card carries at most one grade at a time. Grading it the other way replaces the first.

**V2-5.4** Repeating a grade the card already carries is not an event: it is dropped, and `onGrade` is
not called again.

**V2-5.5** Changing the grade is an event, including changing back to one the card carried earlier in
the same visit. Five swipes up then two swipes down then one swipe up is three events: `easier`,
`harder`, `easier`.

**V2-5.6** Moving to another card clears the grade. The next card starts ungraded, and the grade the
previous card carried is not remembered.

**V2-5.7** A grade is visible on the card for as long as it is held: the card's border thickens on the
edge the gesture went towards — the top edge for `easier` (V2-4.1's swipe up), the bottom for `harder`
(swipe down).

**V2-5.8** The mark uses no colour, so it carries in both themes and does not depend on colour vision to
be seen.

**V2-5.9** Grades reach the host page through `onGrade` only. The library itself stores no grade and
computes no schedule — see §11 for the separate module a deck page can use for that.

**V2-5.10** The on-card mark (V2-5.7) and a review schedule (§11) are independent. The mark is what the
reader currently sees on the card in front of them and resets every time the deck pages (V2-5.6); the
schedule, where a deck chooses to keep one, is what the reader saw last time and persists across visits.
Neither reads the other.

**V2-5.11** A card the reader pages past without grading is reported once, as `onGrade(card, "neutral")`,
at the moment it leaves — so a card the reader simply forgot to grade is not indistinguishable, to
whatever is listening, from a card that was never shown at all.

**V2-5.12** `neutral` never fires for a card the reader did grade during that viewing, and never fires
for the card left on screen when the deck is destroyed — only an actual page turn reports it.

---

## 6. Storage

**V2-6.1** Every card the reader opens is recorded in one storage key, `flashcards.cards`, as a
`{ [key]: card }` map.

**V2-6.2** A card the store has not seen is written to it; a card it has seen is loaded from it. Card
content is assumed not to change, so the stored copy wins.

**V2-6.3** A card without a `key` is displayed but not stored.

**V2-6.4** Storage that is absent, blocked, corrupt, or holding something that is not a card degrades to
an empty dictionary. A deck must render whether or not storage works.

**V2-6.5** An unusable entry under a card's key is replaced, so a bad write cannot break every future
visit the same way.

**V2-6.6** This dictionary is groundwork for a later dictionary view (V2-10.1). The review schedule
(§11) does not read it — it keys its own storage by the same card `key`, independently.

**V2-6.7** `storage.js` — reading and writing a `{ [key]: value }` map safely — is shared by this module
and by review.js (§11), so the two agree on what "storage is unusable" means without saying so twice.

---

## 7. Presentation

**V2-7.1** The card is the only element on the page. No header, no footer, no chrome, no controls.

**V2-7.2** No shadows, no rounded corners, no gradients.

**V2-7.3** The card's aspect ratio is 4:3 (width:height).

**V2-7.4** Card width is `min(75vw, 900px, maxH × 4/3)`, where `maxH` is 75 % of the viewport height in
portrait and 88 % in landscape. Height follows from the ratio.

**V2-7.5** Landscape begins where the viewport is at least as wide as it is tall.

**V2-7.6** Size is computed in CSS, so it follows a window resize or a device rotation without a resize
listener and without a second layout pass.

**V2-7.7** Font sizes are a fraction of the card's width, never of the viewport: `0.085` for the text and
`0.05` for the details.

**V2-7.8** Card size does not depend on how much text a card holds. A word wider than the card breaks
rather than overflowing it.

**V2-7.9** Light and dark both work, following the reader's system preference.

**V2-7.10** Where the deck is the page — its element a direct child of `body` — the library owns the
page box: the document is exactly the visible viewport and nothing scrolls. A phone's address bar
therefore cannot slide in and out from under a vertical swipe, and a swipe down cannot become a
pull-to-refresh.

**V2-7.11** A deck mounted into a smaller container leaves its host's page layout alone.

---

## 8. Animation

**V2-8.1** Flipping rotates the card about its vertical axis, showing the other face.

**V2-8.2** Paging slides the current card out one edge and the next one in from the other — left for
`next`, right for `previous` (V2-4.1), regardless of whether a key or a swipe triggered it.

**V2-8.3** Paging returns the card to its front face.

**V2-8.4** Grading animates the mark appearing, and nothing else — the card does not move.

**V2-8.5** Every animation degrades to an instant change under `prefers-reduced-motion`, and where the
Web Animations API is unavailable.

---

## 9. Code

**V2-9.1** Plain ES modules and CSS, loaded by the browser as written. No build step, no bundler, no
framework, no runtime dependency.

**V2-9.2** Each module owns one concern: order (`deck`), storage (`store`), input (`input`), the DOM and
its animations (`view`), and the wiring between them (`flashcards`).

**V2-9.3** A behaviour is expressed once. Keyboard and pointer share an intent set rather than each
carrying their own copy of what the four directions mean.

**V2-9.4** Logic that can be tested without a browser is kept free of the DOM and tested.

---

## 10. Not in v2

These are known and deliberately absent. They are listed so their absence reads as a decision.

**V2-10.1** *(implemented — see §11)* Review scheduling was deliberately absent from v2 at first, with
`onGrade` as the seam it would attach to. §11 describes what was built there.

**V2-10.2** A dictionary view over everything the reader has seen, with sorting and category filters.

**V2-10.3** Position indicators, a title screen, an info panel, and any configuration of the sizing
ratios or the type scale.

**V2-10.4** Text that shrinks to fit its card. Card size is independent of text length (V2-7.8), so a
card with far more text than the design assumes fills its card and may run under the category label.

**V2-10.5** Announcing the flip or the grade to a screen reader. The card is a passive element with no
live region.

---

## 11. Review scheduling

**V2-11.1** Not part of the library. `mount()` never imports this module (V2-5.9) — a deck page composes
it itself, through `onGrade`, the same way it would reach for any other host-side concern.

**V2-11.2** A Leitner system: a card sits in a box numbered 0 upward. `easier` promotes it one box;
`harder` returns it to box 0. There is no partial credit and no smaller step back — a wrong answer means
starting over.

**V2-11.3** Each box has a fixed interval, in days, before a card in it is due again: `[0, 1, 2, 4, 8,
16, 32]`, box 0 due immediately. The last box is the cap; `easier` there is recorded but does not
promote further.

**V2-11.4** Leitner, not a continuous model such as SM-2 or FSRS, because the signal this library
produces is binary — `harder` or `easier`, never a graded quality — and Leitner is the classic scheduler
built for exactly that signal. It also needs no dependency, which keeps V2-9.1 intact.

**V2-11.5** `neutral` (V2-5.11) neither promotes nor demotes: the card's box is unchanged, and its
interval is renewed from the moment it was seen. It is evidence of neither recall nor difficulty, so it
moves the schedule in neither direction — but it still writes an entry, so a card that is only ever seen
and never graded gets a schedule instead of staying permanently, indistinguishably due.

**V2-11.6** A card's schedule is `{ box, dueAt }`, one entry per card `key`, in one storage key,
`flashcards.review`, independent of the card dictionary (V2-6.6).

**V2-11.7** A card that has never been graded has no stored schedule. Reading its state returns box 0,
due now, without writing anything — a schedule is created by grading, not by looking.

**V2-11.8** A stored entry that is not a usable schedule — the wrong shape, a non-integer or
out-of-range box, a non-finite `dueAt` — is read as though the card had never been graded, and is
replaced the next time it is graded, the same posture V2-6.5 takes towards the card dictionary.

**V2-11.9** Storage that is absent, blocked, or corrupt degrades the same way it does for the card
dictionary (V2-6.4): an empty schedule, not a thrown error.

---

## 12. Progress indicator

**V2-12.1** `mount()`'s `progress` option — `{ steps, of(card) }` — draws a column of `steps` squares in
the card's bottom-left corner, the bottom `of(card)` of them filled. Omitted, the card is exactly as bare
as it always was.

**V2-12.2** The library draws a count out of a count. It has no notion of what the count means — not a
box, not a schedule, not review.js — the same way `category` (V2-2.4) is free-form data the library
displays without interpreting. A deck feeds it from whatever review state it keeps; §11's box is one
example, not the definition.

**V2-12.3** This is not the position indicator V2-10.3 excludes. A position indicator would say where the
reader is in the deck; this says how well the reader knows the one card in front of them. Both could use
dots, but they answer different questions and neither implies the other.

**V2-12.4** It sits on the card, in a corner clear of the centred text and the border mark's edges (V2-5.7)
— unlike an earlier version, which was tried beside the card instead, after text hints naming the grading
gestures directly on the card faces had been tried and reverted as overloaded. What made the corner
placement work where the text hadn't was dropping words, not moving off the card as such: a handful of
plain squares in a corner competes far less with the card's content than a line of text across it did.

**V2-12.5** The value `of(card)` returns is clamped into `0..steps` before it is drawn, so a card with no
data yet (an unclamped or missing value) does not crash the count, and out-of-range host data does not
under- or overflow the column.

**V2-12.6** The column re-reads `of(card)` — and so can change — at exactly two moments: a new card
arriving (V2-8.2), and a grade being recorded (V2-5.3). It never reads on a tick or a timer; if a host's
own data changes for a reason outside those two events, the column does not learn about it until the
next one.

**V2-12.7** The column is drawn above the card rather than inside the element that flips: it has to read
the same on either face, and must not itself flip — or mirror — when the card does.

---

## Open questions

Not requirements — decisions deferred until there is a reason to make them.

- **Should a grade survive leaving the card?** V2-5.6 says no: come back to a card and it is ungraded
  again. That mark is UI, not scheduling data — it is deliberately separate from the review schedule
  (V2-5.10), which does persist across visits.
- **Should sizing round to whole pixels?** The library it replaces computed integer pixels in
  JavaScript. CSS sizes to the subpixel, and no problem has been traced to the difference.
- **Should the Leitner box count or interval schedule be configurable?** Fixed for now (V2-11.3). Nothing
  has needed it to move yet.
