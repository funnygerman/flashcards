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

**V2-5.5** Changing the grade is an event, including changing back to one the card carried earlier, for
as long as the card is still in front of the reader. Five swipes up then two swipes down then one swipe
up is three events: `easier`, `harder`, `easier`.

**V2-5.6** Moving to another card changes what's on screen, not what any card carries: a card's grade,
once given, is remembered for the rest of the session, and its mark reappears exactly as left if the
reader pages back to it. A card that has never been graded starts, and stays, ungraded until it actually
is. (An earlier version of this library cleared the grade on every page turn; a card revisited after
being graded looked untouched, and the same swipe — repeated on a returning visit rather than the same
one V2-5.4 already covers — read as a new event each time. Against review.js's box (§11), that meant
paging away and back was, by itself, indistinguishable from a fresh correct recall: a reader (or a stray
extra keypress) could walk a card from the first box to the last in seconds, with no attempt at recall in
between.)

**V2-5.7** A grade is visible on the card for as long as it is held: the card's border thickens on the
edge the gesture went towards — the top edge for `easier` (V2-4.1's swipe up), the bottom for `harder`
(swipe down).

**V2-5.8** The mark uses no colour, so it carries in both themes and does not depend on colour vision to
be seen.

**V2-5.9** Grades reach the host page through `onGrade` only. The library itself stores no grade and
computes no schedule — see §11 for the separate module a deck page can use for that.

**V2-5.10** The on-card mark (V2-5.7) and a review schedule (§11) are independent. The mark is what the
reader has said about each card so far this session; the schedule, where a deck chooses to keep one, is
what that means for when the card comes round again. Neither reads the other — a deck that wants the
mark back after a page reload says so itself, by handing the library its own memory through `gradeOf`
(V2-5.14), which is host data reaching the library like any other.

**V2-5.11** A card the reader pages past without grading is reported once, as `onGrade(card, "neutral")`,
at the moment it leaves — so a card the reader simply forgot to grade is not indistinguishable, to
whatever is listening, from a card that was never shown at all.

**V2-5.12** `neutral` never fires for a card the reader has graded this session — including a grade given
in an earlier visit, not just the current one — and never fires for the card left on screen when the deck
is destroyed; only an actual page turn away from an ungraded card reports it.

**V2-5.13** Paging away from a card settles the grade it carries: the reader may say anything they like
about a card, and change their mind as often as they like, for as long as it is in front of them, and
what it carries when they leave it is the answer. A settled card still shows its mark when revisited,
but grading it again is not an event — the swipe is dropped exactly as a repeat of the same grade is
(V2-5.4). This is V2-5.6 one level up: a card's grade is worth what the reader said about it, once, not
once per visit — otherwise "I know this one" is worth however many times they care to page back to it.

**V2-5.14** A card can arrive already settled. `gradeOf(card)` — a host option, `null` or absent when the
host has nothing to say — is the grade the card carried before this deck was mounted, and a card the
host answers for wears its mark from the moment it appears and is settled per V2-5.13. It is asked once
per card, and never about a card this session has already seen graded. This is the seam a deck page uses
to make a grade survive a page reload (§11); the library still stores nothing itself (V2-5.9).

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

**V2-8.6** One card is exchanged for another in a single off-screen frame: its content, its mark (V2-5.7)
and the progress row around it (§12) all change together, between the two legs of the slide, with the
transitions that would otherwise ease them into place suspended. The arriving card is therefore already
itself the first time the reader sees it. (Two separate bugs said otherwise: the mark's own
`border-width` transition played over the arriving card *after* it had landed, and the progress row was
re-read only once the whole slide had finished — so paging between two cards graded differently looked
like the page turn had changed the card's grade a fifth of a second after delivering it.)

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
starting over. `harder` resets a card in a high box as completely as one in a low box: a card the reader
could not recall is not a month-away card however it earned that box, and box 0 is due immediately, so
it comes round again in the same session rather than disappearing for a week. (A gentler step down by one
box was considered and rejected on that last point. What made the reset feel punitive was not the reset:
it was a grade given by accident, or changed and then stacked on, both of which V2-11.10 fixes.)

**V2-11.3** There are six boxes, and each has a fixed interval, in days, before a card in it is due
again: `[0, 1, 3, 7, 14, 30]` — box 0 due immediately, then a day, a few days, a week, a fortnight, a
month. The last box is the cap; `easier` there is recorded but does not promote further. Climbing the
whole ladder takes five correct days spread across twenty-five.

The intervals are human units rather than a doubling sequence, and there are six boxes rather than the
seven doubling to 32 days that came first. The count changed so that the box could *be* the progress
count outright (V2-12.10) instead of the count being the box plus one; the intervals widened at the same
time so that dropping a rung would not halve the ceiling and leave a well-known card coming back twice as
often for ever.

**V2-11.4** Leitner, not a continuous model such as SM-2 or FSRS, because the signal this library
produces is binary — `harder` or `easier`, never a graded quality — and Leitner is the classic scheduler
built for exactly that signal. It also needs no dependency, which keeps V2-9.1 intact.

**V2-11.5** `neutral` (V2-5.11) neither promotes nor demotes: the card's box is unchanged, and its
interval is renewed from the moment it was seen. It is evidence of neither recall nor difficulty, so it
moves the schedule in neither direction — but it still writes an entry, so a card that is only ever seen
and never graded gets a schedule instead of staying permanently, indistinguishably due.

**V2-11.6** A card's schedule is `{ box, dueAt }`, one entry per card `key`, in one storage key,
`flashcards.review`, independent of the card dictionary (V2-6.6). The stored entry also carries what the
reader said today and where the card stood before they said it (V2-11.10), but `reviewState` gives back
the schedule and only the schedule.

**V2-11.7** A card that has never been graded has no stored schedule. Reading its state returns box 0,
due now, without writing anything — a schedule is created by grading, not by looking.

**V2-11.8** A stored entry that is not a usable schedule — the wrong shape, a non-integer or
out-of-range box, a non-finite `dueAt` — is read as though the card had never been graded, and is
replaced the next time it is graded, the same posture V2-6.5 takes towards the card dictionary.

**V2-11.9** Storage that is absent, blocked, or corrupt degrades the same way it does for the card
dictionary (V2-6.4): an empty schedule, not a thrown error.

**V2-11.10** One grade per card per day, however many times it is given. A grade applies to `baseBox` —
the box the card stood in before the day's first grade — not to whatever an earlier grade the same day
already made of it, so a second grade replaces the first rather than stacking on it. `easier` then
`harder` then `easier` leaves a card in box 3 in box 4: one step from where the day found it, exactly
where saying `easier` once would have left it. Without this, a change of mind was destructive (that same
sequence used to land the card in box 1, *below* where it started, despite the reader's final answer
being "easier"), and grading, reloading the page and grading again promoted twice with no recall in
between — V2-5.6's bug surviving through storage rather than through paging.

**V2-11.11** The day is the reader's own calendar day, in their own time zone: a grade at 23:00 and one
an hour later belong to different days as they experience them, which UTC would get wrong for most of
the world.

**V2-11.12** `neutral` does not spend the day. It is not an opinion (V2-11.5), so it neither counts as
the day's grade — a card paged past and graded properly later still counts — nor overwrites one already
given.

**V2-11.13** `gradedToday(key)` answers what the reader said about a card today, or `null`. This is what
a deck page hands to `mount()` as `gradeOf` (V2-5.14), so a card graded before a page reload comes back
wearing its mark, and settled: the daily rule and what the reader sees then agree, rather than the card
looking untouched while the schedule quietly ignores the next swipe.

**V2-11.14** The seven-box ladder this replaced had a box 6. A stored entry in it is read as box 5, the
top box here — a card the reader had actually earned to the top belongs at the top, not back at the
bottom. Only that one box: 7 upwards is still nonsense and takes V2-11.8's posture, which is the safe
direction for corrupt data to fail in. The card's stored `dueAt` is left alone; it comes due when it was
already going to.

---

## 12. Progress indicator

**V2-12.1** `mount()`'s `progress` option — `{ steps, of(card) }` — draws a row of `steps` squares along
the card's bottom edge, the first `of(card)` of them filled. Omitted, the card is exactly as bare as it
always was.

**V2-12.2** The library draws a count out of a count. It has no notion of what the count means — not a
box, not a schedule, not review.js — the same way `category` (V2-2.4) is free-form data the library
displays without interpreting. A deck feeds it from whatever review state it keeps; §11's box is one
example, not the definition.

**V2-12.3** This is not the position indicator V2-10.3 excludes. A position indicator would say where the
reader is in the deck; this says how well the reader knows the one card in front of them. Both could use a
row of marks, but they answer different questions and neither implies the other.

**V2-12.4** It sits on the card, along the bottom edge, clear of the centred text and the border mark's
edges (V2-5.7). A 4:3 card has far more spare width around a short word than spare height, so a row here
stays clear even of a word long enough to wrap across most of the card — verified against both v2's
longest realistic word and a synthetic one well beyond it. Two earlier placements were tried and replaced:
first beside the card (after text hints naming the grading gestures directly on the card faces had been
tried and reverted as overloaded — dropping the words, not leaving the card, was what actually fixed
that), then centred on the card's left edge, which a sufficiently long word could still reach.

**V2-12.5** The value `of(card)` returns is clamped into `0..steps` before it is drawn, so a card with no
data yet (an unclamped or missing value) does not crash the count, and out-of-range host data does not
under- or overflow the row.

**V2-12.6** The row re-reads `of(card)` — and so can change — at exactly two moments: a card being
exchanged for another, in the same off-screen frame as its content and its mark (V2-8.6), and a grade
being recorded (V2-5.3). It never reads on a tick or a timer; if a host's own data changes for a reason
outside those two events, the row does not learn about it until the next one.

**V2-12.7** The row is drawn above the card rather than inside the element that flips: it has to read the
same on either face, and must not itself flip — or mirror — when the card does.

**V2-12.8** `steps` is set so that the row has exactly as many distinct states as `of(card)` has distinct
values — for review.js's six boxes (§11), five squares, since an empty row is a state too. Not a
conventional round number: every real change in the underlying data then moves the display by exactly
one mark, where a coarser scale would let two different values compress onto the same count and make one
of those changes look like nothing happened.

**V2-12.9** Squares, not stars: `★`/`☆` were tried and reverted after testing on a real phone. Two
problems, both real: at a size that actually read as a star shape they were too big for the row, and any
count other than the culturally fixed five read as a broken rating widget rather than a plain count — a
problem V2-12.8 exists specifically to avoid, which stars undid by carrying their own count expectation. A
square carries no such expectation, so five of them is just five — including, now that the row is five
squares wide, not being read as a five-star rating.

**V2-12.10** The count is the box itself, not the box plus one, so a card in box 0 fills no squares at
all. A reader who has never got a card right, or who has just failed one, should see an empty row: that
is what no progress looks like. (The row was seven squares of `box + 1` first, which left every such
card showing one filled square — progress where there was none. Fixing it is what set the box count at
six, so that the two scales could agree without either needing an offset; see V2-11.3.)

---

## Open questions

Not requirements — decisions deferred until there is a reason to make them.

- **Should sizing round to whole pixels?** The library it replaces computed integer pixels in
  JavaScript. CSS sizes to the subpixel, and no problem has been traced to the difference.
- **Should the Leitner box count or interval schedule be configurable?** Fixed for now (V2-11.3). Nothing
  has needed it to move yet.
