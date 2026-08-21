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
`destroy()` and `switchTo(cards)` (V2-3.8).

**V2-3.2** `options` are `onGrade(card, level)`, `onRefuse(card, reason)`, `gradeOf(card)`, `progress`,
`lead`, `storage`, and `random`. `storage` and `random` exist so the library can be tested and embedded
without reaching for globals.

**V2-3.3** The deck is shuffled on mount. The caller's array is not reordered.

`lead` is the one exception: cards handed to `mount()` under that option come first, in the order given,
and are not shuffled. The shuffle exists so that a reader does not learn the deck's order along with its
cards, which is a statement about material being studied — a guide whose cards taught the swipe before
the tap would not be a guide (V2-15.3). A lead card is shown, not studied: it does not go through the
dictionary the way the deck's own cards do.

**V2-3.4** One card is on screen at a time.

**V2-3.5** The deck wraps in both directions: past the last card is the first, and back from the first is
the last. A session has no end and no completion screen.

Where a `lead` is present, this holds separately for the lead and for the deck rather than for one ring
running through both. `lead` and `cards` are two independent sequences, and the cursor is on exactly one
of them: wrapping past the lead's own last card, forward, is the one move that hands the cursor from one
sequence to the other (V2-3.3); every other step, in either direction, wraps within whichever sequence is
current. Splicing the lead onto the front of one ring that wraps end to end was tried first — a guide
authored to be shown before anything else, on a reader's first touch — and it meant the *first* lead
card's `previous` wrapped past the front of the whole ring and landed on the deck's own last card,
showing real material before the guide had said a word: the very leak `lead` exists to prevent, arrived
at from the direction nobody had guarded. Two independent rings close it: `previous` on a lead card can
only ever reach another lead card, however many times it is pressed, however far the reader backs up.

The handover forward is a completion, not a visit: paging into the deck and back out again — `next` then
`previous` — returns to the lead still in progress, and it goes on wrapping within itself exactly as
before. Only paging forward off its actual last card retires it. And the handover does not run in
reverse: once the deck is current there is no step, in either direction, that returns to the lead. It has
done its job for this mount, and getting back to it — if a host wants that at all — is that host's own
concern (V2-15.6), not a path this module leaves open.

**V2-3.6** Mounting an empty deck is an error, reported by throwing.

**V2-3.7** `destroy()` removes the deck's DOM and unbinds every listener it added, including the
document-level ones (§4).

**V2-3.8** `switchTo(cards)` changes which cards are being studied without a second `mount()` — same
element, same view, same input bindings, only the order underneath. The two cards ↔ dictionary sources a
deck's own corner switches between (V2-13.9) are the reason this exists; the library knows only that
`cards` is another list, nothing about what the two mean or when a host offers a way between them.

Each source seen by `mount()` or `switchTo` keeps its own shuffle and its own cursor, the first time it is
used, and switching back to one already visited returns to the card it was left on rather than dealing a
fresh shuffle (V2-3.3, extended to cover a source revisited within one mount rather than reshuffled on
every visit to it). A card left behind by a switch is reported exactly as one paged past would be — graded
if it already was, `"neutral"` otherwise (§5) — and the card arrived at is drawn exactly as one paged to
is, its mark and the progress row read fresh rather than assumed. Dropped mid-slide, the same posture an
intent arriving then gets (V2-4.9): the card on screen is already on its way off and is not `switchTo`'s
to replace. There is no animation between the two — nothing paged, nothing to slide — so the change lands
in the one frame V2-8.6 already asks a page turn's own arrival to land in.

A source with no cards is refused rather than switched to, for the same reason `mount()` itself refuses
one (V2-3.6): showing a card that belongs to neither the old source nor the new one is worse than doing
nothing. `switchTo` returns whether it actually applied, so a host drawing its own state around the call
— deck.js's toggle icon and label — moves that state only once the mount's own has, rather than assuming
every call lands.

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

**V2-4.7** Key presses are ignored when they are aimed at something else on the page: a field the reader
is typing into (an input, a textarea, a select, a `contenteditable` element) or a control they have
focused (a link with an `href`, a button). An anchor without an `href` navigates nowhere and takes no
focus, so it is not a control and the deck keeps the key.

The two cases differ in how much they take. A field takes every key, arrows included — it uses them to
move the caret. A focused control takes only the keys that would press it, `Enter` and `Space`: the deck
calls `preventDefault()` on what it takes, so without that much `Enter` on the link of V2-7.1 would flip
the card instead of following it — but the arrows mean nothing to a link and everything to the deck.
Taking every key for a control would leave the reader unable to page or grade after tapping the link and
pressing Back, since browsers restore focus to the anchor, with the swipes still working and nothing on
screen to explain the silence.

**V2-4.8** The page does not scroll or select text under a gesture.

**V2-4.9** An intent arriving while a page turn is in flight is dropped rather than queued. So is a
drag: the card being dragged is already on its way off the screen and is no longer the reader's to move.

**V2-4.10** A pointer gesture is answered while it is being made, not only when it is released. The card
follows a horizontal drag one for one, because that drag is a page turn and the card is going that way;
it gives a little against a vertical drag and springs back, because grading does not move the card
(V2-8.4) — and the edge being dragged towards fills in proportion to how much of the threshold the drag
has covered, reaching a full mark exactly where the gesture becomes a grade.

This is the answer to the discoverability problem §15 also addresses, and the more durable half of it:
words have to be read once and remembered, whereas a card that visibly responds to a finger says *there
is something here* every time anybody touches it, in whatever language they read. It also makes the
grading gestures learnable without committing to one — the reader sees the mark forming and can drag
back below the threshold, which turns a guess into an experiment.

**V2-4.11** A gesture that does not reach the threshold leaves nothing behind: the card returns to the
middle and the edge empties. A drag fills an edge and never empties one, so dragging up on a card that
is already marked easier does not shrink that mark on the way to redrawing it.

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

**V2-5.7** A grade is visible on the card for as long as it is held: a bar is drawn along the edge the
gesture went towards — the top edge for `easier` (V2-4.1's swipe up), the bottom for `harder` (swipe
down).

The mark changes nothing about the card's layout. It was the card's own border thickening at first,
which moved the card's contents: `box-sizing: border-box` holds the outer box still, but the border
grows into the content box, so centred text slid down half the growth and the category label — anchored
to the padding box — slid down all of it: measured, 1.5 px of text on a 390 px phone, and 5.5 px of text
with 11 px of category at the 900 px cap. A settled grade that shifts the card reads as an animation still in
progress rather than as a state, which is exactly the wrong thing to say immediately after a gesture
that was itself a movement. A bar is painted over the card rather than being part of its box.

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

**V2-5.15** A grading gesture dropped because the card is settled (V2-5.13, V2-5.14) is reported to the
host as `onRefuse(card, "settled")`. A repeat of the grade the card already carries (V2-5.4) is not
reported: the mark on the card is already the answer to what the reader asked for, so nothing is left
unsaid. A settled card answers with nothing at all — the gesture worked, the card heard it, and the
screen is identical to one nobody swiped at, which is indistinguishable from the gesture not existing.
The library reports that it happened; what to say about it is the host's (§15), because "today" is the
schedule's idea and `mount()` has none of it.

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

**V2-6.6** This dictionary is what §13 studies: a page with no cards of its own reads it. The review schedule
(§11) does not read it — it keys its own storage by the same card `key`, independently.

**V2-6.7** `storage.js` — reading and writing a `{ [key]: value }` map safely — is shared by this module
and by review.js (§11), so the two agree on what "storage is unusable" means without saying so twice.

---

## 7. Presentation

**V2-7.1** The card is the only element on the page, apart from one control out of it (§13) — and that
control is absent unless it leads somewhere new (V2-13.9). No header, no footer, no chrome, no other
controls. Everything v2 has to say to a reader it says as cards or on the card: the guide is four cards
(V2-15.3), and a refused gesture is answered on the card's own mark (V2-15.2). Neither adds an element to
the page, which is why this requirement reads as it always did — an overlay for the guide was built first
and it cost exactly this sentence. The corner is the one exception, and what it is depends on what kind of
page it sits on: on a deck with cards of its own it switches, in place, to the dictionary and back
(V2-13.9) — not navigation, no second page involved, no element added beyond the corner itself; on a page
with none it is a real link to the deck the reader came from (V2-13.11), because crossing between two
files needs one — nobody navigates a phone webapp by typing an address. Either way it is a quiet mark in a
corner the card never reaches, it carries no state that outlives the page, and it is the host page's
element rather than the library's (V2-1.2) — `mount()` neither draws it nor knows it is there.

This is a rule about what `mount()`, `openDeck()` and the library draw unasked — it says nothing about a
deck's own HTML file. A deck author who wants a small credit line (`.fc-credit` in `flashcards.css`) adds it
themselves, as plain markup in their own file, the same way nothing stops one from adding a favicon;
`openDeck()` has no option for it and never will, so no deck carries one unless its own file says so. Kept
quiet — the corner button's own muted greys, fixed at the safe-area bottom edge — so it reads as the same
register as everything else here rather than as an ad.

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

**V2-8.4** Grading animates the mark appearing, and nothing else — the card does not move. A drag is not
grading: while a finger is down the card follows or resists it (V2-4.10), and what it returns to when the
finger lifts is a card that has not moved.

**V2-8.5** Every animation degrades to an instant change under `prefers-reduced-motion`, and where the
Web Animations API is unavailable.

**V2-8.7** A page turn that began as a drag starts its slide from wherever the drag left the card, not
from the middle. Snapping back and setting off again is a visible hitch on every swipe, and it is the
difference between the card being dragged away and a swipe being a button press with extra steps.

**V2-8.8** Under `prefers-reduced-motion` a drag does not move the card at all; the edge still fills.
The information is in the mark, and the travel is the part somebody asking for less motion is asking to
be spared.

**V2-8.6** One card is exchanged for another in a single off-screen frame: its content, its mark (V2-5.7)
and the progress row around it (§12) all change together, between the two legs of the slide, with the
transitions that would otherwise ease them into place suspended. The arriving card is therefore already
itself the first time the reader sees it. (Two separate bugs said otherwise: the mark's own
`border-width` transition played over the arriving card *after* it had landed, and the progress row was
re-read only once the whole slide had finished — so paging between two cards graded differently looked
like the page turn had changed the card's grade a fifth of a second after delivering it.)

---

## 9. Code

**V2-9.1** Plain ES modules and CSS, loaded by the browser as written. No build step to develop or test
this repository, no framework, no runtime dependency. The deployed site is the one deliberate exception:
`npm run build` (esbuild, a dev-only dependency) bundles and minifies `v2/src` into `v2/dist`, which only
the deployed deck pages are rewritten to load instead of `v2/src` directly (`.github/workflows/deploy.yml`)
— purely to cut what a reader's phone downloads. Nothing this repository is loaded, tested, or forked with
requires it; `v2/dist` is not committed, built fresh before every deploy the same way the tests are run
fresh.

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

**V2-10.2** A *browsable* dictionary — a list of everything the reader has seen, with sorting and
category filters. §13 studies the whole dictionary as a deck, which is a different thing and does not
make this one built: there is still no way to look at the collection rather than work through it.

**V2-10.3** Position indicators, a title screen, an info panel, and any configuration of the sizing
ratios or the type scale. §15's guide is none of those: there is no screen and no panel, nothing to
dismiss before studying, and no control anywhere that opens it. It is four cards at the front of one
session, and the reader works through them exactly as they work through any card.

**V2-10.4** Text that shrinks to fit its card. Card size is independent of text length (V2-7.8), so a
card with far more text than the design assumes fills its card and may run under the category label.

**V2-10.5** Announcing the flip or the grade to a screen reader. The card is a passive element with no
live region — including for a refused grade (V2-15.2), which was briefly a live region while it was a
separate line of text and stopped being one when it became part of the card. Moving it onto the mark
bought the reply its meaning and cost it that announcement; the trade is recorded here rather than
hidden, and a live region for it remains available if a reader ever needs one.

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

The renewal never moves a card's due date *later* than it already is. Giving a card a schedule where it
had none is the point; buying an already-scheduled card time is not. Since a session studies what is due
(§13), a plain renewal meant that merely looking at an overdue card and paging on hid it for a full
interval — a box 5 card gone for a month for having been glanced at, and browsing the dictionary once
emptying the review queue. A card with no schedule still gets `{ box: 0, dueAt: now }`, which is what
this requirement existed for in the first place, so the rule costs it nothing.

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

**V2-11.15** `BOX_COUNT` is exported, so a deck page can size a progress row against this ladder without
restating its length. The interval list is then the only place the box count is decided: change it and
the row follows. The library is not the place for this — it never learns what a box is (V2-12.2), and
importing review.js to find out would undo V2-11.1 — so the arithmetic lives in the deck, next to the
rest of its own mapping.

---

## 12. Progress indicator

**V2-12.1** `mount()`'s `progress` option — `{ steps, of(card) }` — draws a row of `steps` marks along
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
values — against review.js's boxes (§11), one mark per box above the first, since an empty row is a
state too. Not a conventional round number: every real change in the underlying data then moves the
display by exactly one mark, where a coarser scale would let two different values compress onto the same
count and make one of those changes look like nothing happened.

**V2-12.9** The mark is a star, and it is drawn by the stylesheet rather than by the view: `.fc-dot` is a
plain `<span>` that CSS gives a size, a `--fc-line` fill and a `mask` — one outline shape, one solid — so
the shape is a presentational decision the JavaScript never learns about. That separation is not
theoretical: this row has been squares and stars and squares again, and only the last of those changes
touched a line of JavaScript.

Squares came first, then `★`/`☆` glyphs, which were reverted after testing on a real phone: at a size
that actually read as a star shape they were too big for the row, and any count other than the
culturally fixed five read as a broken rating widget rather than a plain count. Squares were the answer
to both, because a square carries no count expectation at all. The row then became five marks wide
(V2-11.3), which removed the second objection outright, and testing on newcomers turned up a cost the
squares had been paying all along: a row of identical squares reads as *pagination*, so an empty row
looks like "nothing loaded" rather than "not rated yet" — which is the truth about a card nobody has
answered. Stars say that without a legend; five squares never could.

The glyph objection is answered by not using a glyph. A mask means the shape is the same on every
platform instead of whatever that platform's `★` happens to look like, its colour comes from `--fc-line`
so it inverts with the theme, and its size is a fraction of the card width (3.6 %) like everything else
on the card, rather than a font's idea of a size.

**V2-12.10** The count is the box itself, not the box plus one, so a card in box 0 fills no marks at
all. A reader who has never got a card right, or who has just failed one, should see an empty row: that
is what no progress looks like. (The row was seven marks of `box + 1` first, which left every such
card showing one filled mark — progress where there was none. Fixing it is what set the box count at
six, so that the two scales could agree without either needing an offset; see V2-11.3.)

---

## 13. The dictionary deck

**V2-13.1** The dictionary is a deck, not a list. Everything the reader has ever opened (§6) can be
studied as one deck: the same card, the same five intents (V2-4.1), the same marks and the same grading
rules. There is no table, no row and no filter.

**V2-13.2** That framing is the point, not a shortcut. Because it is the same `mount()` call, "one grade
per card per day" (V2-11.10) and "paging away settles it" (V2-5.13) hold here without a second
implementation to keep in step, and a card is still judged with the card in front of the reader rather
than from a list where its back is not showing.

**V2-13.3** A deck page with no cards of its own studies the dictionary instead. `empty-deck.html` is
therefore an ordinary deck file with an empty card list — there is one rule, not a special page, and it
is applied in one place (§14) rather than written out on each.

It is reached only by a direct visit. A deck with cards of its own does not navigate here to see the
dictionary — it switches to it in place (V2-13.9) — so this file is what remains for a reader who arrives
with no deck open at all.

**V2-13.4** A deck and the dictionary select the same way: both are *study what's due*, up to
`SESSION_LIMIT` (20), out of their own pool of cards — a deck's own, the dictionary everything the reader
has ever opened. "All of it" is not a session either way, so a card that is not due is held back while due
ones wait. They differ only in which pool feeds that rule, not in the rule itself.

Both take their cards in the same order — ascending `dueAt`, so the longest-overdue leads and, past the
ones that are due, the soonest-due follows. A card never graded is due now (V2-11.7), so a large deck
leads with what the reader has not seen. Review state therefore selects; it does not order what is
studied, because the deck is shuffled on mount exactly as any deck is (V2-3.3) and a fixed order studied
every session would teach the order along with the cards.

**V2-13.5** When nothing in the offered pool is due, `chooseSession` falls back to the cards closest to
being due — for a deck now as much as the dictionary (V2-13.4). A session has no end (V2-3.5) and an empty
deck is an error (V2-3.6), so there is no "nothing due today" screen for either kind of page: there is
always something to study, and it is always the most useful thing available.

**V2-13.10** Studying a deck no longer reaches cards ahead of their schedule by default (V2-13.4 revised
this): the schedule governs what a deck offers, the same as it governs the dictionary. A reader working
straight through a due session still grades on the box's terms, and a card moves at most one box a day
however often it is met (V2-11.10). A mode for browsing or cramming a deck regardless of its schedule —
which is what this section used to describe as the deck's default — is deferred; see the backlog.

**V2-13.6** `chooseSession` is host-side, like review.js and for the same reason (V2-11.1): the library
shuffles whatever deck it is handed and knows nothing about boxes or due dates. It lives in its own
module rather than in each deck file so that every page shares one rule with one set of tests.

**V2-13.7** There is not one shared dictionary but several: `openDeck`'s `dictionary` option splits the
storage bucket, so a reader learning English and French gets two, not one that mixes both. Cards are still
not attributed to the *deck* they came from: the same word can belong to several decks within one
dictionary, so that would need a mapping rather than a field, and nothing here reads it. `dictionary` is a
fact about a deck, not a card — `openDeck(cards, { dictionary })` stamps it onto each of `cards` once, so a
deck author writes it nowhere else (§14). Left unset, a card carries none, which is its own dictionary:
every card written before this existed reads exactly as it always did, not as suddenly scattered across
many empty ones.

`allCards` and `holdsMoreThan` (store.js) both take `dictionary` and match only cards carrying that same
value — `undefined` included, so an old, undivided storage bucket is one dictionary among the others rather
than a special case. `syncCards` settles a `dictionary` disagreement over the same `key` the same way it
settles any other disagreement about a card's content: the first deck to write that key keeps it, and a
later deck naming a different dictionary for the same key does not move it.

Both kinds of disagreement — the same `key` meaning two different cards, or the same subject spread across
two differently-named dictionaries — are only ever possible within one origin: `localStorage` is scoped to
protocol, host and port by the browser itself, not by anything this project does, so decks on two different
sites never share storage to disagree over in the first place. Within one origin, `key` uniqueness across a
site's own decks was already the deck author's responsibility before `dictionary` existed — the whole
premise only works if the same word is always the same `key` — and `dictionary` does not loosen that; it
asks the same author to also spell a dictionary's name the same way across their own decks, not to
coordinate with anyone else's.

**V2-13.8** A dictionary with nothing in it throws from `mount()` (V2-3.6) and renders nothing. That is
the agreed shape — there is no empty state (V2-13.5). V2-6.4 asks a deck to render whether or not
storage works, and this page cannot, because without storage it has no cards to render. On
`empty-deck.html`, V2-13.9 keeps a reader from being led there while it would be empty, so what remains
is a typed address rather than a followed link. From a deck's own toggle, the same fact — `holdsMoreThan`
— keeps `switchTo` (V2-3.8) from ever being asked to open one.

**V2-13.9** The corner is offered only where the dictionary holds a card the current deck does not
(`holdsMoreThan`). "How many decks are there" is not a question storage can answer — it records cards,
not decks (V2-13.7) — but it is also not the question worth asking. What matters is whether it would show
the reader anything they cannot already see, and it does not for the only deck they have ever opened, nor
where storage is unusable. It is added to the page once that is known, rather than written into the
markup and hidden, so it is never in the document at a moment when it should not be seen.

What pressing it does depends on the page (V2-7.1), the same fact deciding everything else about it. On a
deck with cards of its own it is a button: pressing it switches `mount()` in place (V2-3.8) to the
dictionary's own selection — `chooseSession` over `allCards(storage)`, the same `onlyDue: true` rule the
deck's own side already uses (V2-13.4) — and back, never leaving the page — there is no second HTML file
involved, and no navigation for a phone's back gesture to catch. On a page with none — `empty-deck.html` —
there is no deck of its own to switch back to in place, so the corner there is a real link instead, to the
one page it can name (V2-13.11).

It draws what it leads to, in the 4:3 of the real card: two cards overlapping for the dictionary, which
is many decks at once, and one card for a deck. On the toggle this flips with every press, since the one
page is both sides of it in turn; on the link it is fixed, since `empty-deck.html` is always the
many-at-once side and the deck it names is always the one.

**V2-13.11** A page with no cards of its own leads back to the deck the reader last opened, recorded by
`openDeck` as `{ href, label }` under `flashcards.deck` whenever a deck *with* cards is opened. Once there
is more than one deck there is no such thing as *the* deck to name in its markup, and naming the one they
came from is the only answer that stays true as decks are added. It is always there when it is needed: a
dictionary with nothing in it cannot render at all (V2-13.8), so if there is something to come back from,
some deck was opened to put it there. An unusable record offers no way back rather than a broken one, the
same posture V2-11.8 takes. `empty-deck.html` does not record itself — it is not somewhere to come back
to. Nor does a deck's own toggle (V2-13.9): switching to the dictionary and back in place is not a page
visited, so there is nothing here for it to remember.

---

## 14. Assembling a deck page

**V2-14.0** The vocabulary: `deck.js` is a deck — what a deck page calls, and the subject of this
section. `order.js` is one deck's sequence, shuffled once and walked with a wrapping cursor (V2-3.3,
V2-3.5), which nothing outside the library touches. The two were the other way round at first, which
spent the word a deck author uses on a detail they never see.

**V2-14.1** `openDeck(cards, options?)` opens a deck that keeps a schedule: it selects the session
(§13), wires `onGrade` and `gradeOf` to review.js, sizes the progress row from the ladder, and adds the
way out. A deck file holds its cards and this one call.

**V2-14.2** It is composition, not library. `mount()` still knows nothing about boxes, due dates or the
dictionary (V2-5.9, V2-11.1, V2-12.2), and a page that wants a bare card and no schedule imports it
directly and gets exactly that. Putting this wiring inside `mount()` would make the library depend on
review.js, which is the one dependency the split exists to prevent.

**V2-14.3** What moved was never a choice a deck made differently. Every page repeated the same four
imports, the same `onGrade`, the same `gradeOf` and the same box-to-marks mapping, and repetition free
to drift did drift: a row of five marks was once written out beside a ladder of six boxes, which is
what put `BOX_COUNT` (V2-11.15) in review.js in the first place. One call cannot disagree with itself.

**V2-14.4** `options` are `element`, `storage`, `random`, `now`, `lang`, and `dictionary`. `storage`,
`random` and `now` exist so this can be tested without globals, exactly as they do in the modules
underneath. There
is no `corner` option: the way out is never something a deck page names (V2-13.9) — `openDeck` decides both
what it is and, where it is a link, what it points to, from `cards` and `storage` alone. It returns the
library's own handle, so `destroy()` (V2-3.7) still reaches the deck, alongside whatever `openDeck` itself
added.

`lang` picks the app's own words — the guide (V2-15.3), the toggle's dictionary label (V2-13.9), and the
"already rated" refusal (V2-15.2) — from `strings.js`, falling back to English where it is unset or names a
language `strings.js` has none for. It reaches only the app's own chrome, never `cards`: a card's
`frontText`/`backText`/`details` stay exactly what a deck author wrote, in whatever language the deck
teaches, the same as before this option existed. `strings.js` is a plain lookup table rather than a
runtime dependency (V2-9.1): the app's own text is a handful of short lines in a small, fixed set of
languages, not enough surface to justify one.

`dictionary` splits storage into several (V2-13.7), unlike `lang`: it does reach `cards`, stamped onto each
one before anything is stored, since it is what decides which cards the toggle's other side draws from. Two
unrelated options that happen to both default to "unset" — a deck can pick a UI language without picking a
dictionary, or the reverse.

**V2-14.6** `element` defaults to the document's body, so a deck page names none. One HTML file is one
deck (V2-1.2) and the card is the only thing on the page (V2-7.1), so there is nothing for it to go
beside. It stays an option rather than becoming fixed, because a deck can still be embedded in a smaller
container (V2-7.11) — and it defaults to `body` rather than to a required wrapper element, because the
stylesheet claims the page box through `html:has(> body > .fc)`: a wrapper would break that selector,
and with it the reason a phone's address bar stays put under a vertical swipe (V2-7.10).

**V2-14.7** The way out lives here, not in the library (V2-1.2): which of a toggle or a link the corner
is (V2-13.9), the toggle's two sources and the switch between them (V2-3.8), and — where it is a link —
its `href` and the record of which deck to come back to (V2-13.11). `mount()` still neither draws
anything nor knows the corner exists; `switchTo` does not know why it is being called or what the two
sources it is handed mean.

**V2-14.5** The mark is built element by element rather than from markup. Card content is written as
text and never parsed as HTML (V2-2.6); the rule holds for the page's own furniture too, rather than
being relaxed wherever it happens to be safe.

---

## 15. Saying what the card cannot show

**V2-15.1** The card shows its own result for every interaction that has one: it flips, it pages, it
takes a mark, the row of stars changes. Where a reader's action has no visible result at all, the page
says so in words instead. This is the whole of what §15 covers, and the reason V2-7.1 admits it: an
interface with no chrome depends absolutely on every action being answered, and the two places v2 was
silent were the two places a reader concluded that nothing was there: a gesture with no result, and a
gesture nobody had mentioned.

**V2-15.2** A grading gesture refused because the card is settled (V2-5.15) is answered on the card
itself: the grade mark grows into a band deep enough to hold type, says that the card has already been
rated today, and shrinks back to a plain mark a few seconds later. Both settled cases say the same
sentence — a card graded before a page reload (V2-5.14) and one graded and paged away from in this
session (V2-5.13) have both been rated today, since a grade given in this session was recorded today.
One message, and true of both.

It is on the mark, and on the edge the mark is on, because the mark is what the reader is arguing with:
they swiped against a grade they had already given, and the grade answers. A line of text floating below
the card was tried first and reads as a notification about the page rather than as the card's own reply —
the same difference as between a card that responds to a finger and a card with instructions printed
next to it (V2-4.10).

The wording belongs to the deck page, not to the library: `mount()` offers `say(text)` — one place to
put a sentence, and no sentence of its own — because "today" is the schedule's idea and the library has
none of it (V2-5.9, V2-11.1). The words are short by necessity: a band across a phone-sized card holds
about four words, and the rule behind them is §15.6's to explain.

Where the band goes follows the mark: the top edge for a card marked easier, the bottom for one marked
harder. A card wearing no mark at all takes the bottom edge — unreachable today, since only a settled
card is refused and a settled card always has a mark, but a band nobody can see would be a silent
failure of the one thing here whose whole purpose is not to be silent.

**V2-15.9** Whatever the band would otherwise cut in half steps aside while it is up: the category label
for a band on the top edge, the progress row for one on the bottom. They come back when it goes.

**V2-15.3** A reader's first session is led by four cards that teach the deck by being one. They come
first and in their own order (V2-3.3's `lead`), and they are gone from every session after.

Nothing on a card with no chrome advertises that swiping exists. A reader can tap, read the back, tap
again and page with the arrows indefinitely without discovering grading at all — and for that reader the
row of stars is never explained either, which invites reading the card as a vertical feed whose row
counts views. The gestures cannot be inferred; they have to be said once.

**V2-15.4** They are said as cards because a card is the one thing the reader has already been taught to
use. Each one asks for the gesture it is teaching, and its other side is the reader's own gesture
answering: tap this card, and the back says you turned it over; swipe up where it says to, and the mark
appears on the edge it named — and the progress row fills, exactly as the third card claims it will (see
V2-15.4a). The reader is never told what would happen — they do it, and the deck agrees with them.
Learning the deck and using the deck are the same act.

This replaced an overlay of the same four instructions, which was built first and thrown out. An overlay
is a second interface — something to read, then dismiss, then act on — in a register the rest of the
design does not use, and it made V2-7.1 admit a full-screen element for the sake of one session. Cards
cost the interface nothing, because they *are* the interface.

**V2-15.4a** `progress`'s count-out-of-a-count (§12) reacts to a guide card exactly as it reacts to a real
one, through a box `deck.js` keeps in memory for the length of one mount and nowhere else. Without it,
the one card whose whole job is explaining what the row means (V2-12.2's "stars are days you got it
right, wrong answer clears them all") would be the one card that could never show the row doing anything,
since a keyless card (V2-15.5) has no schedule for `reviewState` to read a box from. Nothing here is
written to storage: the box lives exactly as long as the mount that made it, the same posture the guide
card's own grade takes (V2-15.5).

**V2-15.4b** Guide text carries no full stops and repeats as little as it can. "Swipe left for the next
one — or press →" is spelled out once, on the first card, because that is the only time the keyboard
equivalent needs saying; the rest just say "swipe left", trusting what the first card already taught
rather than restating it in full on every one. A card is sized for a word, not a sentence (V2-7.7), and
these are instructions and labels, not prose that earns its own punctuation.

**V2-15.5** No guide card has a `key`, which is what keeps it out of everything a card normally touches:
it is not written to the dictionary (V2-6.3), never turns up in it later, and carries no schedule. It
can still be flipped, paged and marked — the mark is what card two is teaching — and the mark simply
goes nowhere. Its `category` reads `guide`, so nobody mistakes one for something they are meant to know.

**V2-15.5a** The guide wraps on its own while it is in progress, and does not admit a deck card until the
reader has completed it (V2-3.5's two-ring behaviour). Swiping right on the very first guide card, before
the reader has touched anything else, is the one gesture the guide cannot afford to answer with real
material: the whole point is a controlled first look, and a deck card appearing there — before the guide
has said a word — teaches nothing and is indistinguishable, to that reader, from the guide simply not
covering what just happened. Paging into the deck and back out again does not count as completing it: the
guide only hands over on being paged past forward, and once it has, there is no gesture that returns to
it — it has done its job for this session.

**V2-15.5b** Being on the last guide card is not by itself completion. `previous` on the first card wraps
directly to the last one (V2-15.5a's own boundary is a wrap), so a reader can reach it having shown only
the first and the last of however many cards the guide holds — the rest never appeared. Paging forward
from there satisfies "on the last card, going forward" without satisfying what that phrase is meant to
stand for, so it is not enough on its own: the guide also tracks which of its own cards have actually
been shown, and only hands over once none are missing. Short of that, paging forward off the last card is
a plain wrap back to the first — the same as any other step that is not the one true completion.

**V2-15.6** Whether the guide has been dealt is one flag in storage, `flashcards.hints`, written as it
is dealt rather than when it is finished: a reader who reloads part-way through has met the guide, and
starting it again from the top is not what they asked for. A reader who already has a review schedule
(§11) is not a first-timer whatever the flag says, and is not greeted — the flag was added to v2 after
it had readers. Unusable or absent storage deals the guide again, the harmless direction to fail in
(V2-6.4): a reader who cannot keep a flag cannot keep a schedule either.

There is no way to ask for the guide a second time. That is a known gap rather than a decision, and it
is listed under open questions.

**V2-15.7** Both belong to the deck page (§14), not to the library. The guide's words are the deck
page's, and `lead` is a general facility that knows nothing about guides — the same division as
`progress`, which draws a count without knowing it is a box. A bare `mount()` is still a bare card.

**V2-15.8** The handle `openDeck()` returns takes down the corner link as well as everything `mount()`'s
own `destroy()` removes (V2-3.7). Page furniture is no more the caller's to remember than the deck's own
listeners are.

---

## Open questions

Not requirements — decisions deferred until there is a reason to make them.

- **Should there be a way to see the guide again?** It leads one session and is then gone (V2-15.6), so
  a reader who swiped through it without reading has no way back. A `?` key, or a mark in a corner, would
  both work — and both were considered and left out rather than rejected: the first is undiscoverable and
  the second is standing chrome (V2-7.1) for something wanted once. Deferred until somebody actually
  asks for it twice.
- **Should sizing round to whole pixels?** The library it replaces computed integer pixels in
  JavaScript. CSS sizes to the subpixel, and no problem has been traced to the difference.
- **Should the Leitner box count or interval schedule be configurable?** Fixed for now (V2-11.3). Nothing
  has needed it to move yet.
