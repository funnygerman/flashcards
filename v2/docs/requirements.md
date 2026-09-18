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

**V2-2.7** `wasKey` names the key or keys a card used to be filed under, so a key that has to be
corrected takes the reader's progress with it rather than abandoning it. It accepts one key or several,
since a card can be renamed more than once and the second rename must not strand readers who never made
the first. It is a note to the loader, not content: it is never displayed, and never stored (V2-6.8).

A key is a card's identity in storage, and the reader's copy is the only copy. Correcting one plainly is
therefore not an edit to a word list but an edit to data this project cannot reach: the card does not
move, it is replaced — an empty schedule for a word the reader has known for a month, and the entry they
built left in the dictionary as a duplicate nobody can grade away. `wasKey` is what makes the correction
a move.

---

## 3. Deck and session

**V2-3.1** `mount(element, cards, options?)` renders a deck into `element` and returns a handle with
`destroy()` and `switchTo(cards)` (V2-3.8).

**V2-3.2** `options` are `onGrade(card, level)`, `gradeOf(card)`, `settles(card)`, `onRefuse(card,
reason)`, `onEmpty()`, `progress`, `labels`, `lead`, `facing(card)`, `storage`, and `random`. `storage`
and `random` exist so the library can be tested and embedded without reaching for globals.

**V2-3.3** The deck is shuffled on mount. The caller's array is not reordered.

`lead` is the one exception: cards handed to `mount()` under that option come first, in the order given,
and are not shuffled. The shuffle exists so that a reader does not learn the deck's order along with its
cards, which is a statement about material being studied — a guide whose cards taught the swipe before
the tap would not be a guide (V2-15.3). A lead card is shown, not studied: it does not go through the
dictionary the way the deck's own cards do.

**V2-3.4** One card is on screen at a time.

**V2-3.5** The deck wraps in both directions: past the last card is the first, and back from the first is
the last. There is no completion screen and no position indicator (V2-10.3).

A session does end, though, and V2-3.9 is how: the wrap is over what is *left* to answer, and answering
the last of it is the end of the sitting. What the reader sees then is a card like any other, supplied by
the host (V2-13.12) — not a screen the library knows how to draw.

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
deck's own menu switches between (V2-13.9) are the reason this exists; the library knows only that
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
— the mark beside deck.js's menu rows (V2-16.3) — moves that state only once the mount's own has, rather
than assuming every call lands.

**V2-3.9** A card the host settles (`settles(card)`, V2-5.16) leaves the session the moment it is graded.
Not paged past — taken out: the sequence is one card shorter, and neither `next` nor `previous` reaches it
again for the rest of the mount.

A session is what is left to answer, and answering a card is what takes it off that list. Readers reported
the alternative as the app not keeping count: they graded every card of a deck, and the deck simply dealt
itself again from the top, with no way to tell a card they had answered from one they had not except the
mark it happened to be wearing — and with every one of those marks re-gradable, so a stray swipe on the
second pass silently overwrote the answer they had actually meant. "The session has no end" was a
statement about the library having no completion screen; it was never meant to say that a day's work
cannot be finished.

Only a settled card. A card whose grade goes nowhere — a guide card (V2-15.5), the card that says there
is nothing left (V2-13.12) — is not on anybody's list and has nothing to be taken off: it stays where it
is, and the reader can swipe at it as often as they like, which is exactly what two of the guide's own
cards are for.

Running the session out is not an error and not an empty screen. `onEmpty()` asks the host what to study
instead and the answer is adopted as the mount's source, in the same off-screen frame the arriving card
lands in (V2-8.6) — a deck page answers with the next sitting's worth, or with the card that says there
is nothing left (V2-13.15). A host with no answer keeps the card it has: the library refuses to be left
with no card at all (V2-3.6), whichever direction it would arrive from.

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

`easier` and `harder` also take the card away, by the edge the gesture went towards (V2-5.2). All four
therefore move the deck, and the axis says which of the two things the reader is doing: sideways is
moving through the cards, up and down is answering one.

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
calls `preventDefault()` on what it takes, so without that much `Enter` on the menu button or the link of
V2-7.1 would flip the card instead of pressing it — but the arrows mean nothing to a link and everything
to the deck, except while the menu is open (V2-16.7).
Taking every key for a control would leave the reader unable to page or grade after tapping the link and
pressing Back, since browsers restore focus to the anchor, with the swipes still working and nothing on
screen to explain the silence.

**V2-4.8** The page does not scroll or select text under a gesture.

**V2-4.9** An intent arriving while a page turn is in flight is dropped rather than queued. So is a
drag: the card being dragged is already on its way off the screen and is no longer the reader's to move.

"In flight" ends when the cards are exchanged (V2-8.6), not when the animation finishes. From that
moment the card on screen is the arriving one, so the intent the reader is making is about that card and
is theirs to make. The distinction did not matter while only page turns were dropped — a reader whose
`→` went nowhere simply pressed it again — and started mattering the moment a grade could be dropped:
someone answering three cards quickly makes the second swipe before the first card has finished leaving,
and would lose the answer rather than a keystroke.

**V2-4.10** A pointer gesture is answered while it is being made, not only when it is released. The card
follows a horizontal drag one for one, because that drag is a page turn and the card is going that way.
A vertical drag is resisted and then let go of: short of the threshold the card gives a little and
springs back, because a gesture that stops there is not a grade and leaves nothing behind (V2-4.11);
past it the card breaks free and takes every further pixel one for one, because past it the gesture is a
grade and the card really is leaving (V2-8.4). The edge being dragged towards fills in proportion to how
much of the threshold the drag has covered, reaching a full mark exactly where the card comes loose.

The change of régime at the threshold is the point, not a side effect of the card now leaving. Up and
down are the one axis where nothing else distinguishes a drag from a swipe — sideways, the card is
visibly on its way to an edge the whole time — so the threshold was previously something a reader could
only discover by crossing it and seeing what happened afterwards. Now the finger can feel it.

This is the answer to the discoverability problem §15 also addresses, and the more durable half of it:
words have to be read once and remembered, whereas a card that visibly responds to a finger says *there
is something here* every time anybody touches it, in whatever language they read. It also makes the
grading gestures learnable without committing to one — the reader sees the mark forming and can drag
back below the threshold, which turns a guess into an experiment.

**V2-4.11** A gesture that does not reach the threshold leaves nothing behind: the card returns to the
middle and the edge empties. A drag fills an edge and never empties one, so dragging up on a card that
is already marked easier does not shrink that mark on the way to redrawing it.

**V2-4.12** A focused control keeps only the keys that would actually press it, and the deck keeps the
rest. A button is pressed by `Enter` and by `Space`; a link by `Enter` alone.

That last distinction is the whole of this requirement, and it was missing. `Space` on a link scrolls the
page and does nothing else, so handing it over cost the reader a flip and bought them nothing — a
keystroke that reached neither the deck nor the control, with nothing on screen to explain the silence,
which is exactly what §15 exists to prevent. It was not a corner case either: every deck page carries a
credit link and it is the first thing `Tab` lands on, so one `Tab` left `Space` dead for the rest of the
session.

The arrows are nobody's but the deck's, whatever is focused. They mean nothing to a link or a button, and
a reader who tapped a link and pressed Back — browsers restore focus to the anchor — would otherwise find
the deck deaf to the keyboard while the swipes went on working.

---

## 5. Grading

**V2-5.1** `harder` means *not known well enough*; `easier` means *known well enough*.

**V2-5.2** Grading moves the deck: the card leaves by the edge the gesture went towards and the next one
arrives (V2-8.4). Answering a card and moving on from it are one act, because the reader made one
gesture.

This is a reversal. Grading used to leave the card exactly where it was, on the reasoning that a grade
is a fact filed about a card rather than a movement through the deck, and that a reader should be able
to change their mind for as long as they are looking at it. The first readers to be given the thing
reported the same complaint independently: they swiped up, and the card came back. `V2-4.10` spends the
whole of its design effort teaching a finger that the card obeys it, and the old `V2-8.4` then revoked
that at the one moment the reader had committed to something. Two gestures were being charged for what
every comparable app charges one, and the second of them — a swipe left, to a card that had already been
answered — carried no information at all.

The freedom that was lost is smaller than it looks. `V2-5.13` gave it back as an undo — paging back to
a card re-opened it — and that is now withdrawn in turn (V2-5.16): a reader who has answered a card has
answered it for the day, and the swipe still under their finger is the only place left where they can
change their mind (V2-4.10's sub-threshold drag, which commits to nothing).

**V2-5.3** A card carries at most one grade at a time. Grading it the other way replaces the first —
where there is still a second grade to give, which for a settled card (V2-5.16) there is not: within one
day, material is answered once and the first answer is the one that stands.

**V2-5.4** Repeating a grade the card already carries is not an event: `onGrade` is not called again. The
card still leaves, because a gesture with no result at all is the one thing this interface cannot afford
(V2-15.1), and a reader agreeing with a mark they can see is not making a mistake to be corrected.

**V2-5.5** Changing the grade is an event, including changing back to one the card carried earlier —
for a card the host does not settle (V2-5.16), which is the only kind that can still be graded twice. For
material, swipe up then swipe right then swipe down is one event, `easier`: the card is gone from the
session by the time the second swipe lands (V2-3.9), and the third is refused by whichever copy of it the
reader eventually meets.

**V2-5.6** Moving to another card changes what's on screen, not what any card carries: a card's grade,
once given, is remembered for the rest of the session, and its mark reappears exactly as left wherever
the reader meets that card again — which, for settled material, is not by paging back to it (V2-3.9) but
through a selection that does not filter the day out (V2-13.13). A card that has never been graded starts, and stays, ungraded until it actually
is. (An earlier version of this library cleared the grade on every page turn; a card revisited after
being graded looked untouched, and the same swipe — repeated on a returning visit rather than the same
one V2-5.4 already covers — read as a new event each time. Against review.js's box (§11), that meant
paging away and back was, by itself, indistinguishable from a fresh correct recall: a reader (or a stray
extra keypress) could walk a card from the first box to the last in seconds, with no attempt at recall in
between.)

**V2-5.7** A grade is visible on the card for as long as the card is on screen, and again whenever the
reader pages back to it: a bar is drawn along the edge the gesture went towards — the top edge for `easier` (V2-4.1's swipe up), the bottom for `harder` (swipe
down).

The mark changes nothing about the card's layout. It was the card's own border thickening at first,
which moved the card's contents: `box-sizing: border-box` holds the outer box still, but the border
grows into the content box, so centred text slid down half the growth and the category label — anchored
to the padding box — slid down all of it: measured, 1.5 px of text on a 390 px phone, and 5.5 px of text
with 11 px of category at the 900 px cap. A settled grade that shifts the card reads as an animation still in
progress rather than as a state, which is exactly the wrong thing to say immediately after a gesture
that was itself a movement. A bar is painted over the card rather than being part of its box.

**V2-5.7a** Past the threshold, the mark grows into a band naming the grade — "Knew it" on the top edge,
"Didn't know it" on the bottom. It is up while a drag is past the threshold (V2-4.10) and again as the
card leaves (V2-8.4), and at no other time: not on a card paged back to, and not below the threshold.

Two identical bars on opposite edges are one object drawn twice. Which edge a bar is on is a convention
to remember, not something to read, and the card's exit direction is the same convention again — so the
two gestures were distinguished by nothing a reader could read at a glance. First readers asked for
colour; what they were missing was a difference between the two swipes, and a word is the channel that
carries one with no convention attached. This is V2-12.9's move — the progress row went from squares to
stars because a row of identical squares read as pagination — applied to the mark.

The words report an event, not a judgement of the material. The reader is being asked whether they
recalled the word just now (V2-5.1), and "Easy"/"Hard" — the obvious pair — asks something else: a
reader who blanks on a word they consider easy would have to reach for the label marked "Hard", and one
who recalled a hard word perfectly might reach for it anyway. That is the same grade inflation a red
mark invites, arriving by a different door. The comparative sense of `easier`/`harder` is internal
vocabulary — it means "move it along the ladder" — and does not belong on the card.

The words are the host's (`labels`), like every other word on the page; a host with none gets no band,
and `mount()` has no sentence of its own to fall back on (V2-1.2). A deck page takes them from
`strings.js` in the reader's language (V2-14.4).

Which edge the band is on follows the gesture, not the grade the card carries: the moment it matters most
is a drag that has not been committed to, on a card that may still be wearing the opposite grade from an
earlier visit.

Dragging back under the threshold takes it away again, which is what keeps V2-4.10's experiment an
experiment. And it is the only time a keyboard grade shows the word at all — a key press has no part-way
for the drag half to happen in (V2-4.10), so riding the exit is what keeps `↑` and a swipe up leaving the
same card behind (V2-9.3).

**V2-5.8** The mark does not depend on colour: the word names the grade (V2-5.7a), the edge carries it,
and the direction the card leaves carries it again. Colour agrees with all three and is the only one of
them that could fail — so it is the one thing here that is never asked to work alone.

`--fc-easier` and `--fc-harder`, one hue each, colour both the band and the thin mark beneath it —
a settled or revisited card wears the same hue as the moment it was graded, rather than the thin mark
alone staying `--fc-line` once the band goes away. `--fc-easier-ink` and `--fc-harder-ink` are for the
word on the band, which the thin mark carries no text to need. A sub-threshold drag and a paged-back
card are exactly as legible as they were before any of this: the edge a bar is on, not its colour, is
still what a reader without colour vision reads.

Blue and orange rather than green and red. `harder` means "not known well enough" (V2-5.1) — a report
about recall, not an error — and a penalty colour invites a reader to avoid earning it, which is the one
way a palette can corrupt the schedule it feeds. Blue and orange is also the axis both common forms of
colour blindness preserve, where red and green is the axis they collapse.

The four values are a deck author's decision rather than a derived one, and they are recorded in
`flashcards.css` beside the measurement: white on the hues chosen is 2.31:1 and 2.25:1, under the 4.5:1
small-text floor, and the same two hues at `#2d78a3` / `#a16a00` clear it at 4.85 and 4.59 — the lightest
they go and still carry white. Changing the pair is changing those four values and nothing else.

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

**V2-5.13** *(withdrawn)* No grade was settled: paging back to a card re-opened it, and `previous` was
the undo. It was introduced as the half of V2-5.2 that made V2-5.2 safe — a swipe-to-answer interface
without an undo being the complaint that interface always attracts — on the reasoning that V2-11.10's one
grade per card per day made a change of mind harmless to the schedule.

Harmless to the schedule it was. What it was not was legible. Readers who worked a deck to its end found
themselves back at its first card with no way to tell what they had already answered, every one of those
answers still live, and the same swipe that had answered a card the first time now silently rewriting it:
up then down did not read as "I changed my mind", it read as the app not having registered the first
swipe. An undo nobody asked for, available for ever, in an interface with no chrome to announce it, is
indistinguishable from an app that does not remember.

V2-5.16 is what replaces it, and V2-3.9 is what makes an undo unnecessary rather than merely absent: an
answered card is gone from the sitting, so the gesture that would have needed taking back is not one the
reader can make by accident twice. What survives of the freedom is the part that was always the safest —
a drag short of the threshold commits to nothing (V2-4.10), and the reader can feel the card giving
before they let go.

**V2-5.14** A card can arrive already graded. `gradeOf(card)` — a host option, `null` or absent when the
host has nothing to say — is the grade the card carried before this deck was mounted, and a card the
host answers for wears its mark from the moment it appears. It is asked once per card, and never about a
card this session has already seen graded. This is the seam a deck page uses to make a grade survive a
page reload (§11); the library still stores nothing itself (V2-5.9). Where the host settles that card
(V2-5.16), the mark it arrives wearing is the last word on it: a grade given before a reload is exactly
as final as one given a moment ago, which is the whole point of the reload surviving at all.

**V2-5.15** `onRefuse(card, reason)` is a grading gesture dropped, and `"settled"` is the only reason
there is (V2-5.16). It was retired once, when V2-5.13 left no droppable gesture, and comes back with the
gesture: nothing about the card moves, so the host is told, and says why (V2-15.2). The library has no
sentence of its own for it (V2-1.2).

**V2-5.16** A card the host settles is answered once a day. `settles(card)` is the host's answer to "is a
grade on this card the last word on it?" — true for material it keeps a schedule for, false for a card
whose grade goes nowhere (a guide card, V2-15.5). A settled card that has already been graded — a moment
ago, or this morning before a reload (V2-5.14) — refuses a further grading gesture: nothing is stored,
nothing moves, and `onRefuse(card, "settled")` fires so the page can say so.

This is "one grade per card per day" (V2-11.10) stated where the reader is, rather than only where the
data is. V2-11.10 already made a second grade *harmless*, by applying it to the box the day began with;
what it could not do is make it *visible*. A reader who swiped up and then down on the same card saw two
marks, two exits and two apparently-registered answers, and had to take on trust that the schedule had
quietly counted one. Worse, the second swipe really did decide which of the two the day recorded — a
reader could walk a card from "knew it" to "didn't know it" and back with no attempt at recall in
between, which is the one thing the schedule cannot defend itself against. Refusing the gesture says out
loud what the schedule was already doing.

A card whose grade goes nowhere is never settled, because there is nothing there for a second answer to
corrupt: the guide's grading cards exist to be swiped at, and a guide that stopped answering the second
swipe would be teaching the app's refusal rather than its gesture.

Where the reader meets a refusal at all is a question for §13: a due session holds no card that has
already been answered (V2-13.14), so it is their own "every card" filter (V2-13.13) that brings one back
in front of them — deliberately, having asked for the pool regardless of what the schedule or the day
says about it.

Refused is not untouchable. The card is dragged exactly as any other is — it follows the finger, the edge
it is being pushed towards fills, and past the threshold the band names the grade being reached for
(V2-4.10, V2-5.7a) — and it springs back on release wearing the mark it already had, with the sentence
over it. Paging and flipping are untouched. What is refused is the answer, not the gesture: a reader has
to be able to try, or the refusal is indistinguishable from a card that has stopped responding.

**V2-5.17** A notice refuses a grade outright. `refuses(card)` is the host's own veto — a reason to drop
a grading gesture, or null to let it through — and it exists because the library cannot work this one out
for itself: V2-5.16 reads "already answered" off a grade the card carries, and a card that can never
carry one has nothing there to read.

There are two notices, and a deck page names them both: the card that says there is nothing to repeat
today (V2-13.12) and the card that says the dictionary is empty (V2-13.8). Being keyless is not what makes
a card a notice — a guide card is keyless too, and being swiped at is its whole lesson (V2-15.5) — so the
host names them rather than asking about the key.

The first is the case that found this. It has no key, so nothing a
reader does to it is written anywhere — and being keyless it is not settled either, since that is exactly
what keeps the guide's own grading cards answerable (V2-15.5). It therefore took a grade like a guide
card: the band named it, the card flew off the edge it was pushed towards, and it came back wearing the
mark and kept it for the rest of the sitting. Nothing was recorded and the progress row correctly stayed
empty, which is the problem — every visible part of the gesture told the reader their answer had landed,
and there had been nothing there for it to land on. A guide card's mark is a lesson about what a grade
does; a notice's is a claim about a word, and there is no word.

So it says so: "Nothing to grade", on the same band, in the reader's own language, and nothing moves. The
sentence names what is missing rather than what the reader did wrong — the card is a notice and the
reader has not made a mistake by swiping at it. Everything the card could already do it still does
(V2-13.12): it flips, it pages, and the drag follows the finger and springs back.

The band takes plain `--fc-line` here rather than the edge's own `--fc-harder`, because a card carrying
no grade has no edge of its own to follow and an orange band under "Nothing to grade" reads as a verdict
on a word the app has just declined to judge (V2-5.8's rule about colour never being asked to carry a
meaning on its own, applied to the one band that names no grade).

---

## 6. Storage

**V2-6.1** Every card the reader opens is recorded in one storage key, `flashcards.cards`, as a
`{ [key]: card }` map.

**V2-6.2** A card the store has not seen is written to it. A card it has seen is updated from the deck's
current copy when that copy differs from what is stored, so a fix to a word list reaches readers who have
already opened the deck. `dictionary` is the exception: it stays whatever it was first set to, since a
deck passing a different one for an existing key is treated as a mistake, not a move to another
dictionary.

**V2-6.3** A card without a `key` is displayed but not stored.

**V2-6.4** Storage that is absent, blocked, corrupt, or holding something that is not a card degrades to
an empty dictionary. A deck must render whether or not storage works.

**V2-6.5** An unusable entry under a card's key is replaced, so a bad write cannot break every future
visit the same way.

A card is what V2-2.1 describes, and "not a card" is read strictly: an entry missing either of V2-2.2's
two required fields, or carrying them as something other than text, or carrying nothing a reader could
read — `""` and `"   "` alike, since a card is what can be read and whitespace is not text — is skipped
rather than handed on. Any non-null object used to pass, and a bucket holding `{}`, an array, or a record some other
tool had left under a key of its own was dealt to the reader as a blank card — front and back empty, with
a progress row under it, gradable, and earning a schedule of its own. On a deck page V2-6.5 replaces such
an entry, because there is a card to replace it with; the dictionary has no deck to repair itself with,
so what it cannot read it must not deal.

**V2-6.10** A day that cannot be recorded is not enforced. Where storage keeps nothing (V2-6.4), no card
settles: grades are taken and shown, the cards come back round, and nothing is ever refused as already
answered.

The day is a fact about storage — `gradedToday` reads it out of the same entry `recordGrade` writes
(V2-11.13) — so a reader whose site data is blocked has no day for V2-5.16's refusal to stand on. What
a mount has instead is its own memory of the grades it has taken, and that memory is not the same thing.
Leaning on it meant such a reader worked through one session, had it dealt back to them because nothing
could be filtered out (V2-13.14 needs the same entry), and then found every card of it refusing a second
answer that no schedule anywhere remembered. A deck that renders but cannot be studied is not what V2-6.4
asks for.

It is settled by reading back, not by assuming: the first real grade is written and then looked for, and
only its absence turns settling off. `neutral` proves nothing either way, because it deliberately does
not spend the day (V2-11.12) — reading one back as "no grade today" is correct and says nothing about
whether storage works, and mistaking it for a failed write switched settling off the first time a reader
paged past a card.

**V2-6.9** A card's key is a string and nothing else is inferred from it (V2-2.3) — `__proto__`
included. Every map read out of storage therefore has no prototype, which is what makes that key
ordinary here.

Reads were already guarded: `Object.hasOwn` rather than `in`, so a card keyed `constructor` or
`toString` reads its own entry rather than one inherited from `Object.prototype`. The writes were plain
indexing, and `map.__proto__ = entry` on an ordinary object sets the prototype instead of storing
anything — so the grade went nowhere, `JSON.stringify` wrote `{}` back, `gradedToday` answered null for
ever, and the card was the one thing in the app a reader could never be finished with: never filtered out
of a session (V2-13.14), never retired from one for longer than it took to be dealt again (V2-13.15).
`syncCards` dropped the same card from the dictionary while rewriting the whole bucket on every visit.

It is fixed where the maps are made rather than at each write, so every bucket is covered, including any
added later.

**V2-6.6** This dictionary is what §13 studies: a page with no cards of its own reads it. The review schedule
(§11) does not read it — it keys its own storage by the same card `key`, independently.

**V2-6.7** `storage.js` — reading and writing a `{ [key]: value }` map safely — is shared by this module
and by review.js (§11), so the two agree on what "storage is unusable" means without saying so twice.

**V2-6.8** A card carrying `wasKey` (V2-2.7) has the reader's entry moved from the old key to its
current one, in this dictionary and in the review schedule (§11) both, before either is read. The two
are moved separately because they are independent: a reader can hold a schedule for a card whose
dictionary entry was lost to a bad write, or the reverse.

Where the current key is already taken, the old entry is dropped rather than merged or kept. Kept, it
would outlive the rename as a card no deck can name any more and no reader can grade away — the
duplicate the move exists to prevent. Merged, it would need a rule deciding which of two boxes is the
truth, and the entry under the current key is the one the reader has been grading since the rename.

It leaves no record that it ran, because the absence of the old entry is the record: the next visit
finds nothing to move and does nothing. It runs only for a deck's own cards. The dictionary's come from
storage and have no deck author to declare a rename, so a reader who only ever opens `empty-deck.html`
migrates nothing — the declaration lives in the deck that names the card.

---

## 7. Presentation

**V2-7.1** The card is the only element on the page, apart from the menu of §16 and, on a page with no
cards of its own, the link back to the deck the reader came from (V2-13.11). No header, no footer, no
other controls. Everything v2 has to say to a reader it still says as cards or on the card: the guide is
five cards (V2-15.3), the card that says there is nothing to repeat today is one card (V2-13.12), the
grade names itself on the mark it is making (V2-5.7a), and where the card has a sentence of its own it
goes there too (V2-15.2).

This sentence used to read "no chrome", and the menu is the amendment. It was not a drift: the rule was
argued for at length here, and the argument it made — that a preference has nowhere to live that does
not cost this requirement and V2-10.3 together, asks a first-time reader to decide something they have
no basis to decide, and forks the guide across every language in `strings.js` — was answered by readers
rather than by a better argument. They asked for the back of the card first, and for a side chosen at
random, and neither is a thing a deck author can decide on their behalf: the same deck wants to be
studied in both directions by two different people, and in both by the same person on two different
days (V2-16.4, V2-16.5). It is also not a decision a first-time reader has to make, because it has a
default that is exactly what v2 did before it existed.

What the amendment costs is bounded on purpose, and §16 is where the bound is written: one control, one
sheet, no screen, nothing to dismiss before studying, and no row in it that would not do something
(V2-16.3). The two corner marks this replaced are gone rather than joined — the page has fewer controls
on it than it had, not more, and the one that remains is beside the card rather than out at the edge of
the viewport where readers reported it was out of a thumb's reach (V2-16.2).

This is a rule about what `mount()`, `openDeck()` and the library draw unasked — it says nothing about a
deck's own HTML file. A deck author who wants a small credit line (`.fc-credit` in `flashcards.css`) adds it
themselves, as plain markup in their own file, the same way nothing stops one from adding a favicon;
`openDeck()` has no option for it and never will, so no deck carries one unless its own file says so. Kept
quiet — the same muted greys as the menu's own button, fixed at the safe-area bottom edge — so it reads as
the same register as everything else here rather than as an ad.

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

**V2-8.4** A graded card finishes its mark and the band naming it (V2-5.7a), holds still for a moment
wearing both, and then leaves by the edge the gesture went towards — up for `easier`, down for `harder`. The next card arrives from the right,
exactly as it does for `next` (V2-8.2).

The two legs are on different axes because they are saying two different things. Vertical is the reader's
verdict, so the card goes the way they pushed it and takes their mark with it. Horizontal is the deck
moving on, so the next card arrives the way every next card does. Bringing it up from the bottom instead
would make the deck a vertical feed — a different claim about what a deck is, colliding with V2-4.1's
meaning for that axis, and a swipe a phone would rather use for its own address bar (V2-7.10).

**V2-8.10** The hold between the mark and the exit is ~180 ms, and the exit itself ~160 ms — a flick
rather than a page turn, because the card is being got rid of rather than filed.

The hold is not decoration. It is the only moment in a session where the reader sees the row of stars
(§12) move as a consequence of their own verdict: the row belongs to the card on screen, and without a
pause between the verdict and the card's departure it would only ever be read for the card arriving.
It is also what makes `↑` look like a swipe up. A grade from the keyboard has had no drag to fill its
mark, so the mark grows in through the stylesheet's own 160 ms transition, and without somewhere for that
to happen the card would leave before the mark it is leaving with had appeared (V2-9.3).

Both numbers are small on purpose. Fifty cards in a sitting (V2-13.4) at a fifth of a second each is ten
seconds of a session spent watching confirmations, and "some visual feedback" means legible, not slow.

The hold is a keyframe of the exit animation rather than a timer before it, so that nothing can put the
card back in the middle in between: the drag's own inline transform is cleared the moment the exit takes
the card on (V2-8.7), and a card that sprang back to the centre and then flew off would be the hitch
V2-8.7 exists to prevent, arrived at from the other direction.

**V2-8.5** Every animation degrades to an instant change under `prefers-reduced-motion`, and where the
Web Animations API is unavailable.

**V2-8.7** A page turn that began as a drag starts its slide from wherever the drag left the card, not
from the middle. Snapping back and setting off again is a visible hitch on every swipe, and it is the
difference between the card being dragged away and a swipe being a button press with extra steps.

**V2-8.8** Under `prefers-reduced-motion` a drag does not move the card at all; the edge still fills.
The information is in the mark, and the travel is the part somebody asking for less motion is asking to
be spared. A graded card's hold and exit (V2-8.10) go the same way as every other animation, per V2-8.5:
the card is simply replaced by the next one, and a hold nobody can see is motion nobody asked to watch.

**V2-8.6** One card is exchanged for another in a single off-screen frame: its content, its mark (V2-5.7)
and the progress row around it (§12) all change together, between the two legs of the slide, with the
transitions that would otherwise ease them into place suspended. The arriving card is therefore already
itself the first time the reader sees it.

This is about the card arriving, not the one leaving. A graded card shows its own finished mark and its
own updated row while it holds, on screen, before either leg has run (V2-8.10) — that is what the hold is
for. The rule is that nothing changes under the reader's eye on the *arriving* card; a departing card
answering the gesture that dismissed it is the opposite case, and is the point. (Two separate bugs said otherwise: the mark's own
`border-width` transition played over the arriving card *after* it had landed, and the progress row was
re-read only once the whole slide had finished — so paging between two cards graded differently looked
like the page turn had changed the card's grade a fifth of a second after delivering it.)

**V2-8.9** The face not showing is `aria-hidden`. Both faces sit in the DOM at once — `backface-visibility`
turns one of them away, not removal (V2-8.1) — so without this a screen reader reads the front's and the
back's text together regardless of which way the card is turned, which is worth fixing whether or not
V2-10.5's live region ever gets built: it is a correctness gap in what already renders, not part of that
open design question.

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
dismiss before studying, and no control anywhere that opens it. It is five cards at the front of one
session, and the reader works through them exactly as they work through any card.

§16's menu is none of them either, and the line between it and the info panel this rules out is the one
worth naming: every row in it changes what the reader is looking at the moment it is pressed, and a row
that would change nothing is not drawn (V2-16.3). There is nothing in it to read, nothing to confirm,
no second level, and nothing about the sizing ratios or the type scale — those stay exactly as
unconfigurable as this says. A menu that grew a row for its own sake would be the panel, and that is
the test to apply to the next one proposed.

**V2-10.4** Text that shrinks to fit its card. Card size is independent of text length (V2-7.8), so a
card with far more text than the design assumes fills its card and may run under the category label.

**V2-10.5** Announcing the flip or the grade to a screen reader. The card is a passive element with no
live region. The refused grade that used to be the sharpest case for one is gone with the refusal itself
(V2-15.2), which narrows this gap without closing it: a card leaving on a grade is still a change no
announcement reports, and now it is the change a grading gesture makes. `V2-8.9`'s fix (hiding
whichever face is not showing) is a prerequisite this now has, not an answer to it: a live region and its
wording are still entirely open.

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

V2-5.16 now says the same thing to the reader rather than only to the data: a second grade the same day
is refused outright, so this rule is what holds where a refusal cannot reach — a `neutral` (V2-11.12), a
card whose key moved under it (V2-6.8), or any host that does not settle its grades at all. The two agree
by construction, because the refusal is driven by `gradedToday`, which reads this entry's own `day`.

**V2-11.11** The day is the reader's own calendar day, in their own time zone: a grade at 23:00 and one
an hour later belong to different days as they experience them, which UTC would get wrong for most of
the world.

**V2-11.12** `neutral` does not spend the day. It is not an opinion (V2-11.5), so it neither counts as
the day's grade — a card paged past and graded properly later still counts — nor overwrites one already
given.

**V2-11.13** `gradedToday(key)` answers what the reader said about a card today, or `null`. It does two
jobs, both about the day rather than the schedule. A deck page hands it to `mount()` as `gradeOf`
(V2-5.14), so a card graded before a page reload comes back wearing its mark rather than looking
untouched — and, being a card the page settles, wearing it for the rest of the day (V2-5.16). And it is
what `chooseSession` asks in order to keep an answered card out of a session at all (V2-13.14), which is
why such a mark is a rarity rather than the normal case: the reader meets one only through their own
"every card" filter.

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

**V2-11.16** `easier` on a card already in the top box — a card wearing all five stars — is recorded and
renews the month: the box does not move (V2-11.3's cap), and the card is due again thirty days later. It
is not retired, and there is no box above the last one for it to reach.

Nothing is ever learned to the point of never being asked again, which is the whole premise of spaced
repetition: a card the reader is sure of is worth thirty seconds a month to stay sure of. What made a
full-star card feel like it was being asked too often was never this rung — it was V2-13.5, which
offered it again the same day whenever nothing was due. With that withdrawn, a full-star card is gone for
a month, and the reader who wants it back before then asks for it (V2-13.13).

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
per card per day" (V2-11.10, V2-5.16) holds here without a second implementation to keep in step, and a
card is still judged with the card in front of the reader rather than from a list where its back is not
showing.

**V2-13.3** A deck page with no cards of its own studies the dictionary instead. `empty-deck.html` is
therefore an ordinary deck file with an empty card list — there is one rule, not a special page, and it
is applied in one place (§14) rather than written out on each.

It is reached only by a direct visit. A deck with cards of its own does not navigate here to see the
dictionary — it switches to it in place (V2-13.9) — so this file is what remains for a reader who arrives
with no deck open at all.

**V2-13.4** A deck and the dictionary select the same way: both are *study what's due*, up to
`SESSION_LIMIT` (50), out of their own pool of cards — a deck's own, the dictionary everything the reader
has ever opened. "All of it" is not a session either way, so a card that is not due is held back while due
ones wait. They differ only in which pool feeds that rule, not in the rule itself — and the reader's own
filter (V2-13.13) turns the rule off for whichever pool they are on, in the same one place.

Both take their cards in the same order — ascending `dueAt`, so the longest-overdue leads and, past the
ones that are due, the soonest-due follows. A card never graded is due now (V2-11.7), so a large deck
leads with what the reader has not seen. Review state therefore selects; it does not order what is
studied, because the deck is shuffled on mount exactly as any deck is (V2-3.3) and a fixed order studied
every session would teach the order along with the cards.

**V2-13.5** *(withdrawn)* When nothing in the offered pool was due, `chooseSession` used to fall back to
the cards closest to being due, on the grounds that a session has no end (V2-3.5) and an empty deck is an
error (V2-3.6), so there could be no "nothing due today" state for either kind of page.

Readers reported what that actually does: a card they had earned five stars on, and which the schedule had
therefore put a month away, came back the same evening — because there was nothing else to show, which is
not a reason the reader can see. A schedule whose own answer can be overruled by having nothing else to
say is not a schedule, and the stars stop meaning anything. `onlyDue` now selects exactly what is due and
nothing else, and a pool with nothing due selects nothing at all (V2-13.12 says what a page shows then).
The reader may still ask for every card, which is the same request made deliberately rather than on their
behalf (V2-13.13).

**V2-13.10** Studying a deck no longer reaches cards ahead of their schedule by default (V2-13.4 revised
this): the schedule governs what a deck offers, the same as it governs the dictionary. A reader working
straight through a due session still grades on the box's terms, and a card moves at most one box a day
however often it is met (V2-11.10). Browsing or cramming a deck regardless of its schedule — which is what
this section used to describe as the deck's default — is no longer deferred: it is what the filter does
(V2-13.13), on the reader's own say-so rather than as a default.

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

`allCards` (store.js) takes `dictionary` and matches only cards carrying that same
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

**V2-13.8** A dictionary with nothing in it says so, on a card of its own.

It used to throw from `mount()` (V2-3.6) and render nothing at all — no card, no menu, no way back, an
empty page under a credit line. The reasoning was that a pool with nothing *in* it has nothing to say,
since "you are done for today" is false where there was never anything to be done. That half is right and
still is: it is not V2-13.12's card, because V2-13.12's card would be a lie here. What did not follow is
the conclusion. "Nothing here yet" is not a lie, and a page that renders nothing cannot be told apart from
one that is broken.

The rest of that reasoning does not survive either. "A page nobody can have studied from is a page reached
by typing its address" assumed the only way in was the address bar. It is not: storage that is blocked, a
private window, cleared site data, a new profile or a new device all produce an empty dictionary for a
reader who arrives by any route at all — and a browser that evicts `localStorage` from a site left alone
for a week does it to a reader who bookmarked the page while it worked. This requirement also conceded
that V2-6.4 ("a deck must render whether or not storage works") could not be met here. It can, and now is:
what the page cannot do is *study*, which is a different thing from rendering.

Nothing about the card promises a way onward, because there is none to promise. A reader whose dictionary
is empty has never opened a deck for V2-13.11 to name, so no corner link is drawn and the card does not
pretend otherwise — it says what the page is and what would fill it. `switchTo` still refuses an empty
source (V2-3.8), and V2-13.9 still withholds the pool rows where `allCards` comes back empty, so no menu
row can reach this state from a deck. From a deck's own menu, the pool rows are withheld
where `allCards` comes back empty, which keeps `switchTo` (V2-3.8) from ever being asked to open one.

**V2-13.9** A deck with cards of its own offers the choice between them and the dictionary as a menu
group (V2-16.3): choosing the other row switches `mount()` in place (V2-3.8) to the dictionary's own
selection — `chooseSession` over `allCards(storage)`, the same `onlyDue` rule the deck's own side is
under (V2-13.4) — and back, never leaving the page. There is no second HTML file involved, and no
navigation for a phone's back gesture to catch. On a page with no cards of its own — `empty-deck.html` —
there is no deck to switch back to and no pool group; what it gets instead is a real link (V2-13.11),
because crossing between two files needs one.

It is offered from the reader's first visit, including on the only deck they have ever opened, where the
dictionary is that deck and the two rows pick the same cards. It used to be withheld there, by a
`holdsMoreThan` test asking whether the dictionary held anything this deck did not. That function is
gone from store.js with its last caller — it was the right test for
the corner mark this replaced, and the wrong one for a row (V2-16.3): a row says which pool the reader is
on, which is worth saying whether or not the other one differs today. "How many decks are there" was
never the question storage could answer anyway — it records cards, not decks (V2-13.7).

One thing does withhold it, and it is not about what the two sides hold: `switchTo` refuses an empty
source (V2-13.8), so where `allCards` comes back empty the row could not act even in principle. On a
deck that brought cards that means storage is unusable, since its own cards are written there on mount
(V2-6.1).

The two-card icon the corner drew — many decks at once, against one card for a deck — survives only on
the link back (V2-13.11), the one place left with no room for a sentence.

**V2-13.11** A page with no cards of its own leads back to the deck the reader last opened, recorded by
`openDeck` as `{ href, label }` under `flashcards.deck` whenever a deck *with* cards is opened. Once there
is more than one deck there is no such thing as *the* deck to name in its markup, and naming the one they
came from is the only answer that stays true as decks are added. It is always there when it is needed: a
dictionary with nothing in it cannot render at all (V2-13.8), so if there is something to come back from,
some deck was opened to put it there. An unusable record offers no way back rather than a broken one, the
same posture V2-11.8 takes. `empty-deck.html` does not record itself — it is not somewhere to come back
to. Nor does a deck's own menu (V2-13.9): switching to the dictionary and back in place is not a page
visited, so there is nothing here for it to remember.

**V2-13.12** A pool with nothing left for the reader to answer today shows one card saying so, rather
than an empty screen, a banner, or a card the schedule had put away. It is a notice, not material, and
refuses a grade rather than taking one that goes nowhere (V2-5.17). It arrives two ways and is the same
card either way: a session that held nothing when it was dealt, and a session the reader has worked all
the way through (V2-13.15). It carries no `key`, so it is not written to the dictionary
and keeps no schedule of its own (V2-15.5's rule, which until now only the guide needed); it can be
flipped, paged and swiped at like any card, and none of that goes anywhere — it earns no star, and the
guide's own in-memory box (V2-15.4a) is not its either.

It is a card because that is the only register this app has for saying something to a reader (V2-7.1,
V2-15.4), written in the guide's own voice: short lines, no full stops, and the one gesture worth naming
named. Its back names the menu, which always carries the way past the schedule when this card is on
screen (V2-13.13) — a reader who has finished today's cards and wants to keep going is shown where,
rather than being left at what looks like a dead end. It wraps to itself, exactly as any one-card session
does (V2-3.5) — there is simply nothing else in the session to wrap to.

Both pools can be in this state at once, and each says so on its own side of the switch (V2-13.9).

**V2-13.13** The reader's own filter is the second of the menu's two questions about the session: study
what is due today, or every card in the same pool regardless of how many stars it has. It is
`chooseSession`'s `onlyDue`, turned off — no second selection rule, and no third pool.

It filters whichever pool is on screen — this deck's own cards or the whole dictionary — rather than
being a third pool to switch between. The two are two independent questions: *which* cards (V2-13.9),
and *how many of them*. Turning it on outlives a switch between the pools, because a reader who asked to
see everything asked about the app and not about one pool; it is not remembered past the page, because
the schedule is the default and a reader who wants past it should have to say so again rather than
discover weeks later that they have not been reviewing at all. That is exactly the distinction V2-16.8
draws against the side, which *is* remembered: one of these can cost a reader their schedule and the
other cannot.

It is offered always, on every page, whether or not the schedule is currently holding anything back —
including on a deck nobody has graded yet, where every card is due and "Every card" selects exactly what
"Due today" already does. It was withheld there at first, on the rule V2-13.9 used to share: a control
that leads nowhere new is not drawn. That rule was made for a corner mark and does not survive being a
row (V2-16.3). A deck with nothing held back today is a deck holding something back tomorrow, and a menu
that grows a group overnight is one the reader has to read again each time they open it.

Like the pool above it, it was a corner mark first — a star, the app's own word for how well a card is
known (V2-12.2), solid where it led to every card and outlined where it led back. It is two rows now,
and the card that says there is nothing to repeat today names the menu rather than the star on its back.

**V2-13.14** A due session holds nothing the reader has already answered today. `chooseSession`'s
`onlyUnanswered` is the day's own filter beside the schedule's, and a deck's due session sets both.

They are two questions, not one. `harder` files a card in box 0, due immediately (V2-11.2), so the
schedule says "offer this again now" about the very card the day is finished with — and a session built
on the schedule alone dealt exactly that back to the reader, refusing every swipe they then made at it
(V2-5.16). The day has the final word, because the day is what the grade was about.

It is the reload that makes this a rule rather than an optimisation. Within one sitting V2-3.9 keeps an
answered card out of the reader's way on its own; a reader who reloads the page, or comes back to the
deck after lunch, gets a session dealt afresh from storage, and without this that session is their whole
morning's work handed back to them with nothing to be done about any of it.

The reader's own filter does not set it (V2-13.13): "every card" means every card in the pool, today's
answered ones included, wearing their marks and refusing a second answer. That is the one place a refusal
is ever met, and it is met on the reader's own say-so.

**V2-13.15** A session the reader works all the way through is dealt again out of what is still
answerable today, and that is what they see next (V2-3.9's `onEmpty`).

A session is a sitting's worth — at most `SESSION_LIMIT` (V2-13.4) — not the whole pool, so running one
out is not by itself being finished for the day. A deck of eighty due cards hands over its next thirty
rather than announcing an end that is not there. A pool with nothing answerable left deals the card that
says so (V2-13.12), which is then the honest version of the same announcement.

What is dealt replaces what the page holds for that session, so the menu cannot walk back into a spent
one: switching pool and back (V2-13.9) returns to the session as it now is, not to the one the reader
finished. It also marks that session spent, so the reader's own "every card" filter does not deal a
finished sitting back to them: having been through it once, it too asks only for what is left.

**V2-13.16** A session is selected afresh every time it is asked for, and kept only where the answer has
not changed.

The four sessions one page can deal (V2-13.9 × V2-13.13) are four views of overlapping pools, so a card
answered on one of them is a card answered on all of them. Holding each selection as first dealt did not
say that. A reader who answered a card under "Every card" met it again under "Due today" and was refused
(V2-5.16) — the day's finished card offered back by the one session that exists to hold only what can
still be answered; work a deck across both filters and the due session went on offering every card of it,
refusing all of them, and never reached V2-13.12's card at all. That is V2-3.9's own complaint arriving by
another door, and V2-3.9 cannot close it: a grade shortens the sequence the reader is on, not the three
they are not.

Re-selecting closes it, because it reads the schedule, which is where the answer actually lives. Every
session then agrees with the schedule and so with every other — and, the schedule being storage, with
whatever the reader has been doing in another tab.

Unchanged means the same cards — by key where a card has one, and by identity where it does not. That
second half is not a formality: both of §13's notices are keyless (V2-13.8, V2-13.12), so comparing them
by key alone made "nothing here yet" and "nothing to repeat today" the same session, and a page that had
shown one went on showing it after the other became true. A reader whose dictionary filled up in another
tab was still being told it was empty. A keyless card is only ever equal to itself.

Order is deliberately not part of it either: review state selects what is studied and does not order it (V2-13.4) — the shuffle does — and
`neutral` moves a card's `dueAt` merely by the reader paging past it (V2-11.5), so one selection can sort
differently from the next without a single card having left it. An unchanged session is handed back as
the very array it was dealt as, which is what keeps V2-3.8's "switching back returns to the card you left
on" true. A session whose cards have actually gone is a different session and is dealt as one, cursor
included: the reader who emptied it did that themselves.

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
underneath. `random` is the deck's one source of chance and answers for the random side too (V2-16.5),
not only the shuffle, so a test that pins one pins both. There
is no `menu` option and no option naming any row in it: what the menu holds is not something a deck page
decides (V2-13.9, V2-13.13, V2-16.3) — `openDeck` works out every row's presence from `cards`, `storage`
and the schedule alone, and the reader decides the rest. It returns the library's own handle, so
`destroy()` (V2-3.7) still reaches the deck, alongside whatever `openDeck` itself added.

`lang` picks the app's own words — the guide (V2-15.3), the two grade labels (V2-5.7a), every row of the
menu (V2-16.3) and the card that says there is nothing to repeat
today (V2-13.12, V2-13.13) — from `strings.js`, falling back to English where it is unset or names a
language `strings.js` has none for. It reaches only the app's own chrome, never `cards`: a card's
`frontText`/`backText`/`details` stay exactly what a deck author wrote, in whatever language the deck
teaches, the same as before this option existed. `strings.js` is a plain lookup table rather than a
runtime dependency (V2-9.1): the app's own text is a handful of short lines in a small, fixed set of
languages, not enough surface to justify one.

`dictionary` splits storage into several (V2-13.7), unlike `lang`: it does reach `cards`, stamped onto each
one before anything is stored, since it is what decides which cards the menu's dictionary row draws from. Two
unrelated options that happen to both default to "unset" — a deck can pick a UI language without picking a
dictionary, or the reverse.

**V2-14.6** `element` defaults to the document's body, so a deck page names none. One HTML file is one
deck (V2-1.2) and the card is the only thing on the page (V2-7.1), so there is nothing for it to go
beside. It stays an option rather than becoming fixed, because a deck can still be embedded in a smaller
container (V2-7.11) — and it defaults to `body` rather than to a required wrapper element, because the
stylesheet claims the page box through `html:has(> body > .fc)`: a wrapper would break that selector,
and with it the reason a phone's address bar stays put under a vertical swipe (V2-7.10).

**V2-14.7** The menu and the way back live here, not in the library (V2-1.2): every row the menu offers
and the rule deciding whether it is offered at all (V2-13.9, V2-13.13, V2-16.3), the two sources the
pool rows switch between (V2-3.8), the side the reader has chosen and where it is kept (V2-16.8), and —
on a page with no cards of its own — the link's `href` and the record of which deck to come back to
(V2-13.11). `mount()` draws none of it: it lends an empty layer to put it in (V2-16.1) and asks which
side a card arrives on (V2-16.4) without being told what decides either, and `switchTo` does not know
why it is being called or what the two sources it is handed mean.

**V2-14.5** The mark is built element by element rather than from markup. Card content is written as
text and never parsed as HTML (V2-2.6); the rule holds for the page's own furniture too, rather than
being relaxed wherever it happens to be safe.

---

## 15. Saying what the card cannot show

**V2-15.1** The card shows its own result for every interaction that has one: it flips, it pages, it
takes a mark, the row of stars changes. Where a reader's action has no visible result at all, the page
says so in words instead. This is the whole of what §15 covers, and the reason V2-7.1 admits it: an
interface this bare depends absolutely on every action being answered, and the two places v2 was
silent were the two places a reader concluded that nothing was there: a gesture with no result, and a
gesture nobody had mentioned.

**V2-15.2** A grading gesture refused — because the card has already been answered today (V2-5.16), or
because it is a notice that can never be answered at all (V2-5.17) — is answered on the card itself: the grade mark grows into a band deep enough to hold type, says "Already
graded today", and shrinks back a few seconds later. This is V2-15.1's rule applied to the one gesture in
the app with no result of its own to show — nothing about the card moves, and without a sentence the
reader would be looking at an app that had stopped responding.

It was retired once, when V2-5.13 left no refusable gesture, and the `settled` string went with it. Both
come back with the refusal; what never went away, and is why they could, is the band itself and
`say(text)` — one place on the card for a host to put a sentence, which reads as the card's own reply
rather than as a notification about the page, and is still the library's only sentence-shaped seam. The
words are the host's, like every other word on the page (V2-14.4).

It names the day rather than the card. What has run out is today's answer to this card, not the card
itself; tomorrow it is ordinary material again, and a sentence that read as a verdict on the word would
be saying something else entirely. A notice's sentence names what is missing for the same reason.

There is one sentence per reason, and the reason is what looks it up, so a reason cannot be added without
the words that answer it.

**V2-15.9** Whatever the band would otherwise cut in half steps aside while it is up: the category label
for a band on the top edge, the progress row for one on the bottom. They come back when it goes.

The two bands step it aside differently. A host's sentence takes the row away outright — it is up for a
couple of seconds and says something the row does not. A grade band (V2-5.7a) *moves* the row up past
it instead, because `harder` is both the grade whose band sits on that edge and the grade that empties
the row (V2-11.2): hiding it there would take the row away at the one moment it ever answers the
reader's own verdict, which is what V2-8.10's hold exists for.

**V2-15.3** A reader's first session is led by five cards that teach the deck by being one. They come
first and in their own order (V2-3.3's `lead`), and they are gone from every session after.

Nothing on a card with no chrome advertises that swiping exists. A reader can tap, read the back, tap
again and page with the arrows indefinitely without discovering grading at all — and for that reader the
row of stars is never explained either, which invites reading the card as a vertical feed whose row
counts views. The gestures cannot be inferred; they have to be said once.

**V2-15.4** They are said as cards because a card is the one thing the reader has already been taught to
use. Each one asks for the gesture it is teaching, and the reader's own gesture is what answers: tap this
card, and the back says you turned it over; swipe up where it says to, and the card leaves wearing the
mark on the edge it named, with the progress row filled exactly as the stars card claims it will (see
V2-15.4a). The reader is never told what would happen — they do it, and the deck agrees with them.
Learning the deck and using the deck are the same act.

The two grades used to share one card, up on its front and down on its back. They cannot now: a grade
takes the card away (V2-8.4), so swiping up on that front delivers the next card rather than the same
card's other side, and the half of the lesson written on the back would never be read. One grade per
card, and the advance the reader's own swipe causes is what turns the page to the other one — which is
this requirement's own principle reaching a gesture it could not previously reach, rather than a
concession to V2-5.2. That is the fifth card.

The card teaching `harder` carries the day's end of a grade on its back — the card is gone until
tomorrow (V2-5.16) — because that is the one consequence of grading a reader cannot read off the gesture
itself: a card leaving looks the same whether it is coming back in a minute or not until the morning. It
taught `previous`-as-undo while there was an undo to teach (V2-5.13), and could not go on doing so once
there was not; a guide that taught a gesture the app does not have would be worse than no line at all.
The two grading cards also name their own arrow key where the others do not, since a reader on a
keyboard has no swipe to discover and nothing else would tell them the arrows grade.

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
one — or press →" is spelled out once, on the first card, because that is the only time that form needs
saying; the rest just say "swipe left", trusting what the first card already taught rather than restating
it in full on every one. The two grading cards are the exception: they name their own arrow beside their
own swipe (V2-15.4), which is the one thing card one cannot have taught. A card is sized for a word, not a sentence (V2-7.7), and
these are instructions and labels, not prose that earns its own punctuation.

**V2-15.5** No guide card has a `key`, which is what keeps it out of everything a card normally touches:
it is not written to the dictionary (V2-6.3), never turns up in it later, and carries no schedule. It
can still be flipped, paged, graded and marked — the grades are what cards two and three are teaching —
and the mark simply goes nowhere. Its `category` reads `guide`, so nobody mistakes one for something they are meant to know.

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

**V2-15.6a** The guide is not dealt in front of a page with nothing to study. It teaches grading by
asking for it (V2-15.4), and a reader who swipes through five cards to arrive at "nothing here yet" has
been taught a gesture they cannot use — and has spent the one showing the guide ever gets (V2-15.6). The
page says what it is instead, and the guide is still owed to that reader the first time they open a deck
with cards in it.

This used to fall out of V2-13.8 by accident: the page threw before the guide could be shown, and the
flag was written after `mount()` rather than before it precisely so that a reader who never saw the guide
was not marked as having. That ordering still stands; it is no longer the only thing standing between
this reader and a wasted guide.

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

**V2-15.8** The handle `openDeck()` returns takes down everything the page added as well as everything
`mount()`'s own `destroy()` removes (V2-3.7) — the menu's document-level key listener (V2-16.7)
included, which nothing else would take back. Page furniture is no more the caller's to remember than
the deck's own listeners are.

---

## 16. The menu

**V2-16.1** The library lends the page a layer to put its own controls in, and draws nothing in it. It
is an element inside the mounted deck, over the card and outside everything the card is, handed back as
`chrome` on `mount()`'s own handle and removed with the rest of the deck on `destroy()` (V2-3.7). What
goes in it is the host's business and always was (V2-1.2, V2-14.7); what changed is that the host now
has somewhere to put it that is not "somewhere else on the page".

Inside rather than beside, because a control that has to sit near the card has to be able to measure
itself against the card, and the card's size is a custom property on the mounted element (V2-7.4). A
sibling cannot read it, and a sibling that wrote the formula out a second time would be the same
duplication `BOX_COUNT` exists to prevent (V2-14.3).

**V2-16.2** The layer is transparent to pointers and its contents are not, and a gesture that *starts*
on its contents belongs to them rather than to the deck. Without that rule the tap opening the menu
would also flip the card under it, and a drag begun on a menu row would page the deck out from beneath
the reader's finger. Everything else is still the card's: the layer costs the deck no gesture it would
otherwise have had.

That is what lets the menu sit where it does — hanging off the card's own top-right corner rather than
pinned to the viewport's. Readers reported the mark this replaced as being too far from the card, and
they were describing a phone: a card 4:3 and 75 % of the viewport wide leaves a third of a tall screen
empty above it, and a control at the very top of that gap is a stretch of the thumb away from the thing
it acts on. A control belongs next to its subject.

**V2-16.3** The menu is one button and one sheet. The sheet is groups of rows; each group is one
question, each row is one of its answers, and a mark beside a row says whether that is the answer the
reader is currently on. A row names the state it puts the reader in, never the move to it.

Three questions, and no fourth without an amendment to this statement:

1. Which side of a card comes up first (V2-16.4, V2-16.5).
2. Which cards — this deck's own, or the whole dictionary (V2-13.9).
3. How many of them — what is due today, or every card in the pool (V2-13.13).

**The shape is fixed.** All three are there every time the menu is opened, whether or not the two sides
of a question differ today. Both of the questions about the session were withheld at first, on the rule
the corner marks were drawn under — a control that leads nowhere new is not drawn — and that rule does
not survive the move from a mark to a row.

A lone icon that leads nowhere is clutter with nothing on it to say so, which is why the rule was right
for a corner. A row is different in two ways. It *says* which state the reader is in, and that is worth
saying whether or not the other state happens to be equivalent this morning. And it sits in a list, so
withholding it does not remove a control — it changes the shape of the list, leaving a reader who opens
the menu on an ungraded deck to find two groups where they were told there are three, with no way to
tell whether the third does not apply or the app is broken. A menu whose shape moves underneath a reader
is one they have to re-read every time they open it, which is the opposite of what a fixed list of
choices is for.

What this costs is honest and small: on a deck nobody has graded, "Every card" selects exactly what "Due
today" does, and on the only deck a reader has ever opened, "Everything you have seen" is that deck.
Both are rows that change nothing this morning and are exactly what the reader wants the moment the
schedule starts holding cards back — tomorrow, in both cases.

Two things still decide a group out, and neither is about the schedule or about the two sides agreeing.
A page with no cards of its own is not offered the pool: it *is* the dictionary, and "this deck" would
name nothing. And a pool `switchTo` would refuse — an empty dictionary (V2-13.8) — is not offered
either, because that is a row that could not act even in principle.

Choosing the row already marked is not a change, and nothing happens: no session dealt again, no card
reported as paged past (V2-5.11), no fresh roll of a random side.

**V2-16.4** A card arrives showing its front, its back, or a side chosen at random — the reader's
choice, for every card in every deck. The library is told only "front" or "back", asked once per card as
it arrives (`facing`), and has never heard the word random: which side a given card lands on is the
whole of what it needs, and keeping it that way is what stops a third mode existing inside `mount()`.

`frontText` and `backText` do not change meaning. The front is still the front — the card is turned
over, not rewritten — so a flip still shows the other side, `frontDetails` still belongs to the front,
and a deck author writes exactly what they wrote before.

**V2-16.5** The random side is a coin per card, not per session: the reader cannot learn which side a
given card will show, which is the whole of what they asked for. It is tossed with the deck's own
injectable source of chance (V2-14.4), the same one the shuffle uses.

A card revisited by paging back may land the other way up. That is the honest reading of "random", and
the alternative — a side fixed per card for the life of the mount — would make paging back and forth a
way to be sure of a card's side, which is the thing this exists to prevent.

**V2-16.6** A side the reader has just chosen applies to the card in front of them, not merely to the
next one: the card turns over where it stands. A choice whose only effect is a mark moving in a sheet
the reader is about to close is a choice they have no reason to believe landed (V2-15.1), and the
reader who picks "back first" while looking at a front has asked to see that back.

It turns rather than being replaced, because the reader is watching: this is the flip they already know
(V2-8.1), not a page turn, and there is no new card for V2-8.6's instant off-screen frame to be right
for.

**V2-16.7** While the sheet is open the four arrows belong to the menu, not to the deck: up and down
walk the rows, left and right do nothing, and `Escape` closes it. The card is the page and the arrows
are the deck's (V2-4.1) every other moment there is; an open sheet is the one moment it is not, and
grading a card the reader has a sheet over is not what `↑` can be taken to mean. `Enter` and `Space`
press the focused row, which needs no rule of its own — the deck already declines to take those from a
focused control (§4).

**V2-16.8** The side is remembered past the page; the schedule filter is not (V2-13.13). The two look
alike in the menu and are not alike at all: a reader who wants the deck the other way round wants it
every morning, and the worst an unreadable or nonsense record can do is show the front, which is where
every reader starts anyway (V2-6.4). A remembered way past the schedule can cost a reader weeks of
review without ever saying so.

It is one record for the reader rather than one per deck, under its own key, and it is the app's own
setting rather than anything a deck author writes (V2-14.4).

**V2-16.9** Where a page has a title, the row naming this deck's own cards uses it. "Everyday German"
says which pool it is in a way "this deck" cannot, particularly beside a row that names the other pool
in full. `strings.js` carries a translated fallback for a page with no title (V2-14.4).

**V2-16.10** An open sheet is dismissed by a tap anywhere outside it, and that tap does nothing else —
in particular it does not flip the card it lands on (V2-16.2). Nothing else is modal about it: the deck
underneath keeps its state, its session and its place.

**V2-16.11** Closing the sheet does not hand focus back to the button. Focus is dropped, and the
keyboard is the deck's again.

This is deliberately not what a menu button usually does, and the usual pattern assumes something this
page does not have: somewhere for focus to go back *to*. The deck's keys are bound to the document and
the card is not focusable (§4) — the reader's place is not a focus ring, it is the card in front of them.
Parking focus on the button after closing therefore does not restore anything; it takes the keyboard away
from the one thing on the page, because a focused control keeps the keys that would press it (V2-4.12).
`Space` reopened the menu instead of flipping the card, over and over, and the reader could not see why:
the card has no focus ring to have visibly lost.

The cost is one `Tab` to reach the button again, on a page with two focusable things on it. That is the
better half of the trade, and it is the same reasoning V2-4.12 settles one step earlier: a control may
have the keys it would use, and not one more.

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
