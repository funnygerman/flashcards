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
brings a card's mark back after a reload, sizes the progress row from the box ladder, and adds the menu
beside the card — which side comes up first, this deck or everything you've seen, and what's due today
or every card of it (§ The menu). There is no element to name — one HTML file is one deck, so the deck is the page; pass `element` if you
want it somewhere smaller.

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

There are two decks rather than one because one deck's dictionary is that deck: the menu's pool rows
only appear on each of them once the other has been opened, and switching in place only becomes worth
having when the dictionary holds more than that single deck.

Once this is on `main` it is published at
<https://funnygerman.github.io/flashcards/v2/decks/everyday-german.html>, and linked from the site root.

### Cards

```js
{
  key: "wasser-water",       // the card's identity in local storage; opaque to the library
  wasKey: "…",               // optional — a key this card used to be filed under
  frontText: "das Wasser",
  frontDetails: "…",         // optional
  backText: "water",
  backDetails: "…",          // optional
  category: "noun",          // optional
}
```

### Correcting a key

A card's `key` is its identity in local storage — the dictionary files it under that, and so does the
review schedule, independently. The reader's copy is the only copy, so changing a key in a word list
does not move their card, it replaces it: an empty schedule for a word they have known for a month, and
the old entry still turning up in the dictionary as a duplicate nobody can grade away.

`wasKey` is what makes it a move instead:

```js
{ key: "hundert-one-hundred", wasKey: "hundert-a-hundred", frontText: "hundert", backText: "one hundred" }
```

On the reader's next visit their entry filed under `hundert-a-hundred` is moved to the new key — the
dictionary entry *and* the Leitner box, before either is read — and the card carries on with the
schedule it had.

Corrected twice, it collects either: `wasKey: ["hundert-a-hundred", "hundert-hundred"]`, newest first,
so a reader who never got the first correction is not stranded by the second. It costs nothing once it
has run — the old entry is gone, so the next visit finds nothing to move — and nothing at all for a
reader who never had the old key, so there is no flag to keep and no reason to take it back out. It is
never displayed and never stored; the dictionary keeps the card, not the note.

Where the reader already has an entry under the *new* key, the old one is dropped rather than merged:
the entry they have been grading since the correction is the real one, and the stale one would otherwise
outlive it as a card no deck can name any more.

One thing it cannot do: `empty-deck.html` migrates nothing, because the dictionary's cards come out of
storage and have no deck author to declare a correction. The declaration lives in the deck that names
the card, so the reader has to open that deck once.

### `mount(element, cards, options?)`

Returns `{ say(text), switchTo(cards), reface(), chrome, destroy() }` — `say` puts a sentence on the
card for a moment, on the grade mark (§ Saying what the card cannot show); `chrome` is an empty element
over the card for a host's own controls, which the library draws nothing in (§ The menu). Options:

| | |
|---|---|
| `onGrade(card, level)` | `"harder"` or `"easier"` on an explicit grade; `"neutral"` when the reader pages past a card without grading it, so a forgotten card is still reported |
| `labels` | `{ easier, harder }` — the words the grade band names each grade with; omit them and no band is drawn |
| `gradeOf(card)` | the grade this card already carries — `"harder"`, `"easier"`, or `null` — from before the deck was mounted; such a card arrives wearing its mark, and the reader may still disagree with it (§ Interactions) |
| `progress` | `{ steps, of(card) }` — draws a row of `steps` stars along the card's bottom edge, the first `of(card)` of them filled; omit it for a bare card |
| `lead` | cards shown first, in the order given and unshuffled, ahead of the deck proper — a guide, or anything else whose sequence is the point |
| `facing(card)` | `"front"` or `"back"` — which side this card arrives on, asked once per arrival; omit it and every card arrives front first |
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
`previous` mirrors it. The deck wraps in both directions — but over what is *left* to answer: grading a
card takes it out of the session, so the ring gets shorter as you work, and answering the last of it ends
the sitting rather than dealing the deck again from the top.

**The card answers a gesture while you are making it.** Drag sideways and it goes with your finger, and
the page turn carries on from wherever you let go rather than snapping back first. Drag up or down and it
resists, while the edge you are pulling towards fills in — and at the threshold the card comes loose and
follows your finger like any other card on its way out, the edge full at exactly that moment. Let go
short of it and the card springs back and the edge empties, so the gestures can be tried without being
committed to.

That is the durable half of the discoverability problem the first-run guide also answers. Words are read
once and remembered or not; a card that visibly responds to a finger says *something is here* every time
anybody touches it. Under `prefers-reduced-motion` the card stays put and only the mark fills.

**Grading marks the card, names it, and takes it away.** A bar is drawn along the edge the gesture went
towards — top for *known well enough* (swipe up), bottom for *not known well enough* (swipe down) — and
once the drag passes the threshold that bar grows into a band holding the word: **Knew it** or **Didn't
know it**. The card holds still for a moment wearing both, then leaves by that edge while the next card
arrives from the right.

The word exists because two identical bars on opposite edges are one object drawn twice: which edge a bar
is on is a convention to remember, not something to read. First readers asked for red and green; what
they were missing was a difference between the two swipes. The words report an event rather than judging
the material — *Easy*/*Hard* would ask a different question, and a reader who blanks on a word they think
is easy should not have to reach for a label marked "Hard".

The band is the one coloured thing in v2, blue for one grade and orange for the other. Not green and red:
`harder` means "not known well enough", which is a report about recall rather than a failure, and a
penalty colour invites a reader to avoid earning it. Blue and orange is also the axis both common forms
of colour blindness preserve. Colour is never the signal on its own — the word says it, the edge says it,
and the direction the card leaves says it — so the thin bar stays monochrome and only the band is
coloured.
The card's contents do not move under the mark. The mark used to be the card's own border thickening,
which shifted the text and the category label down by a few pixels each time, so a grade looked like an
animation still finishing rather than a state the card was in.

Grading used to leave the card exactly where it was. The first readers to be given this all reported the
same thing: they swiped up, and the card came back. A swipe is a gesture that moves something, answering
a card means being done with it, and charging two gestures for one answer made the second of them — a
swipe left, on a card already answered — carry no information at all.

**An answered card is done for the day.** Grading it doesn't page past it, it takes it out: the session
is one card shorter, and neither `→` nor `←` reaches it again. Work a deck to its end and you get the
card that says there's nothing left, not the deck dealt back to you from the top.

Paging back *was* the undo for a while — nothing was settled, and swiping again replaced the grade. On
paper that was safe, because `review.js` counts one grade per card per day against the box the day found
the card in (§ Review scheduling), so changing your mind five times landed where saying it once would
have. In practice it was unreadable: readers who finished a deck were returned to its first card with no
way to tell what they'd already answered, every answer still live, and the same swipe that answered a
card the first time now quietly rewriting it. An undo nobody asked for, in an interface with no chrome to
announce it, reads as an app that doesn't remember.

So a grade on material is the last word on it today, and a second grading gesture is refused rather than
applied — the card says *Already graded today* (§ Saying what the card cannot show). The undo that's left
is the one that was always safest: a drag short of the threshold commits to nothing, so you can feel the
card give and let go. Repeating the grade a card already carries within a session still reports nothing
new and still takes the card away — a gesture that does nothing at all is the one thing an interface with
no chrome can't afford. `gradeOf(card)` is the other half: hand the library a grade a card already
carries — from a deck's own storage, from before a page reload — and it arrives wearing its mark, and,
for a card the host settles, wearing it until tomorrow.

Only material settles. `settles(card)` is the host's call, and a card whose grade goes nowhere — a guide
card — never settles: there's nothing there for a second answer to corrupt, and two of the guide's own
cards exist to be swiped at.

A card left ungraded when the reader pages past it is still reported, once, as `onGrade(card, "neutral")`
— so a card the reader simply forgot to grade isn't silently indistinguishable from one they never saw.
That isn't an opinion, so it settles nothing: grade the card properly later and it still counts.

Keys are bound to the document, not to a focusable card: one page is one deck, so there is nothing to
focus first and nothing the reader can click that takes the keyboard away. Key presses are ignored when
they are aimed at something else: a field being typed into (input, textarea, select, `contenteditable`)
or a focused control (a link with an `href`, a button). The two take different amounts: a field takes
every key, arrows included, because it uses them to move the caret; a control takes only `Enter` and
`Space`, the keys that would press it. The deck calls `preventDefault()` on what it takes, so without
that much, `Enter` on the menu button would flip the card instead of pressing it — but the arrows mean
nothing to a control and everything to the deck, so tabbing to the button and pressing an arrow still
pages. The one exception is an open menu, which takes the four arrows and `Escape` for itself
(§ The menu). Call `destroy()` if you unmount a deck, or it goes on answering the keyboard.

## Card size

A **4:3** card, as wide as 75 % of the viewport allows, capped at 900 px, and never taller than 75 % of
the viewport in portrait or 88 % in landscape — the sizing v2 inherited from the library it replaced,
now written down as V2-7.3 through V2-7.8.
Type is a fraction of the card's own width — `0.085` for the text, `0.05` for the details.

Where the deck is the page, the stylesheet owns the page box too: the document is exactly the visible
viewport and nothing scrolls, so a phone's address bar stays put under a vertical swipe and a swipe down
cannot turn into a pull-to-refresh. A deck mounted into a smaller container leaves its host's page alone.

The difference is that CSS computes it, in one `min()` on `--fc-card-w`, instead of a JavaScript sizing
engine with a throttled resize listener. The numbers come out the same: 900×675 on a 1280×800 desktop,
292×219 on a 390×844 phone. Only the old integer-pixel rounding is gone — CSS sizes to the subpixel.

## Progress indicator

A row of stars along the card's bottom edge, filled from the left, showing how far along the card in
front of the reader is — without the library knowing what "along" means. `progress: { steps, of(card) }`
draws `steps` marks and fills the first `of(card)` of them; leave `progress` out entirely for the bare
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
`steps` is one mark per box above the first rather than a conventional round number, so every real
grade moves the display by one mark; a coarser scale could compress two different grades onto the same
count and make one of them look like nothing happened. One fewer mark than there are boxes, because
the box *is* the count: a card in box 0 fills none of them, which is what a card you've never got right
should look like. The row was seven marks of `box + 1` first, which left every never-graded and every
just-failed card showing one filled mark — progress where there was none.

`BOX_COUNT - 1` rather than a literal, so the ladder in `review.js` stays the only place the number of
boxes is decided — change it there and the row resizes with it. The arithmetic lives in the deck, not in
`mount()`: the library never learns what a box is, and importing `review.js` to find out is exactly the
dependency the split exists to avoid.

What the mark looks like is the stylesheet's business, not the view's: `createProgress` makes plain
`<span class="fc-dot">` elements and toggles one class on them, and `.fc-dot` in `flashcards.css` gives
them a size, a `--fc-line` fill and a `mask` — one outline shape for empty, one solid for filled. The row
has been squares, then stars, then squares again, then stars; only one of those changes ever touched a
line of JavaScript.

Stars, currently, and drawn as a mask rather than written as a `★`/`☆` glyph. Glyphs were tried first and
reverted after testing on a real phone: at a size that read as a star shape they were too big for the row,
and any count other than the culturally fixed five read as a broken rating widget. Squares answered both,
carrying no count expectation at all — but once the row settled at five marks (§ Review schedule), the
count objection was gone, and readers seeing the deck for the first time turned up what the squares had
been costing: a row of identical squares reads as *pagination*, so an empty row says "nothing loaded"
where five empty stars say "not rated yet". The mask answers the glyph objection by not being a glyph —
the same shape on every platform, coloured from `--fc-line` so it inverts with the theme, and sized as a
fraction of the card width (3.6 %) like everything else on the card.

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

## Saying what the card cannot show

Every interaction shows its own result: the card flips, it pages, it takes a mark and leaves, the row of
stars changes. One used to not. A grading gesture the schedule wouldn't accept — the card was settled,
today's answer already recorded — was dropped, and the screen was left exactly as it was, which is the
same nothing a reader sees who never swiped at all. With no chrome to fall back on, that silence read as
"this gesture does not exist".

The card answers it on the mark: **the grade mark grows into a band** on the edge it already marks, reads
*Already graded today*, and shrinks back a couple of seconds later. The case went away for a while — when
nothing was settled there was no gesture left to drop — and came back with the refusal (§ Interactions),
along with `onRefuse` and the `settled` string in all three languages.

The band itself never went, and neither did `say(text)` — one place on the card for a host to put a
sentence, the library having none of its own. What the band got right was never the wording: a message on
the mark reads as the card's own reply, where a floating line under the card reads as a notification
about the page — the same difference as between a card that responds to your finger and a card with
instructions printed beside it. Whatever the band would cut in half steps aside while it's up: the
category label above, the star row below.

The sentence names the day, not the card. What's run out is today's answer to this word; tomorrow it's
ordinary material again. And you only ever meet it through your own *Every card* row — a due session
holds nothing you've already answered (§ The dictionary), so there's no card in it to be refused.

Refused isn't untouchable: the card still drags with your finger, the edge still fills, the band still
names the grade you're reaching for, and it springs back on release wearing the mark it already had. You
have to be able to try, or a refusal is indistinguishable from a card that's stopped responding.

The "Nothing to repeat today" card refuses too, and says **Nothing to grade**. It has no key, so nothing
you do to it is written anywhere — but being keyless also meant it wasn't *settled*, which is what keeps
the guide's grading cards answerable, so it used to take a grade like one of them: band, exit, and the
mark still on it when it came back. Nothing was recorded and the star row correctly stayed empty, which
is exactly the problem — every visible part of the gesture said the answer had landed. Its band is plain
ink rather than the edge's orange, because a card carrying no grade has no edge to follow and an orange
band under "Nothing to grade" reads as a verdict on a word the app has just declined to judge.

### The first session

The other silence is the first one: **nothing on the card says that swiping exists**. Tap, read the
back, tap again, page with the arrows — a reader can do that for ever and never find out the card can be
graded at all, and for that reader the row of stars is never explained either.

So a first session is led by five cards, which teach the deck by being one:

```text
   Tap this card                       →   You see the answer
   or press Space                          Swipe left for the next one — or press →

   Swipe up if you knew it             →   The card leaves with your mark
   or press ↑                              Swipe left

   Swipe down if you didn't            →   Swipe right takes it back
   or press ↓                              Swipe left

   Stars are days you got it right     →   Wrong answer clears them all
   Tap this card                           Swipe left

   That is all of it                   →   These cards are not part of your deck
   Tap this card                           Swipe left to start learning
```

Each card asks for the gesture it is teaching, and your own gesture is what answers: tap it and the back
is the answer; swipe up where it says to and the card leaves wearing the mark on the edge it just named,
with the row of stars filled exactly as the stars card says it will — even though nothing about a guide
card is stored anywhere (below). Nobody is told what *would* happen — they do it, and the deck agrees
with them.

The two grades used to share one card, up on its front and down on its back. They can't now: swiping up
on that front delivers the next card rather than the same card's other side, so the back would never be
read. One grade per card, and the advance your own swipe causes is what turns the page to the other one
— which is the guide's own idea reaching a gesture it couldn't reach before, not a concession. That's the
fifth card. The `harder` card's back is where *it comes back tomorrow* is taught, because that's the one
consequence of grading you can't read off the gesture: a card leaving looks the same whether it's due
again in a minute or not until the morning. It taught *swipe right takes it back* while there was an undo
to teach, and stopped when there wasn't one — a guide that teaches a gesture the app doesn't have is
worse than a guide that says nothing.

"Swipe left for the next one — or press →" is spelled out once, on the first card, since that's the only
time that form needs saying; the rest just say "swipe left". The two grading cards name their own arrow
instead, which is the one thing card one can't have taught. No full stops anywhere — these are
instructions, not sentences.

Every line is short on purpose. Card text is sized for a word rather than a sentence, so a line that
runs to three of them on a phone is a line nobody reads. Nothing explains the grade mark in words for
that reason — dragging fills the edge you are pulling towards while your finger is still down, which
says it without spending a line.

An overlay of the same instructions was built first and thrown out. An overlay is a second
interface, in a register nothing else here uses: something to read, then dismiss, then act on. Cards
cost the interface nothing, because they *are* the interface — and V2-7.1 goes back to meaning what it
says, since the guide adds no element to the page at all.

They come first and unshuffled — `mount()`'s `lead`, which knows nothing about guides, the way
`progress` knows nothing about boxes. None of them has a `key`, which is what keeps them out of the
dictionary and out of the schedule: swipe at one and it takes the mark, and the row of stars answers —
via a box `deck.js` keeps in memory for the length of the guide and nowhere else, since a keyless card
has no real box for `progress` to read — but nothing is ever written to storage. One flag in
`localStorage["flashcards.hints"]` is written as the guide is dealt, so a reload part-way through does
not start it again, and a reader who already has a schedule is never greeted at all.

The guide wraps on its own while it's in progress — it's a separate ring from the deck, not the front of
one ring running through both. Swiping right (`previous`) on the very first guide card wraps back to the
guide's own last card, not out into real material: splicing the guide onto the front of one ring was
tried first, and it meant that exact gesture — the first thing a reader might do, before the guide had
said anything — landed on the deck's own last card. Paging forward into the deck and back out again
doesn't retire the guide either; only paging past its actual last card does, and once that's happened
there's no gesture that returns to it.

Being on the last card isn't by itself completion, either — it's exactly how a reader reaches the last
card by wrapping backward from the first, having seen only the first and the last of however many there
are. So the guide also tracks which of its own cards have actually been on screen, and only hands over
once none are missing; short of that, paging forward off the last card is a plain wrap back to the
first, same as any other step.

There is no way to ask for it a second time yet. That's a gap, not a decision — see the open questions
in the requirements.

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

`easier` on a card already in the top box — all five stars showing — is recorded and renews the month:
there is no box above the last one, and nothing is ever retired. A card you're sure of is worth thirty
seconds a month to stay sure of. What used to make a full-star card feel over-asked wasn't that rung; it
was the old fallback that offered the nearest-due cards whenever nothing was due, which is gone
(§ The dictionary).

**One grade per card per day**, however many times it's given. A grade applies to the box the card stood
in before the day's *first* grade, not to whatever an earlier grade the same day already made of it, so
a second grade replaces the first instead of stacking on it — easier, then harder, then easier leaves a
card in box 3 in box 4, exactly where saying `easier` once would have left it. Changing one's mind used
to be destructive (that sequence landed the card in box 1, *below* where it started), and grading,
reloading the page and grading again used to promote twice with no recall in between. `gradedToday(key)`
is what closes the loop in the other direction: pass it as `gradeOf` and a card graded before the reload
comes back wearing its mark rather than looking untouched — and, since a deck page settles its own cards,
that mark refuses a second answer (§ Interactions) rather than inviting one. `gradedToday` is also what
keeps an answered card out of the next session in the first place (§ The dictionary), which is why the
mark is a rarity rather than the normal case. This rule is what holds where the refusal can't reach: a
`neutral`, a key that moved under a card, a host that settles nothing. The day is the reader's own
calendar day, in their own time zone. `neutral` doesn't spend it.

`neutral` never moves a card's due date *later* than it already is. Renewing gives a card a schedule
where it had none; it must not buy a card time. Since a session studies what is due (§ The dictionary),
a plain renewal would mean that glancing at an overdue card and paging on hid it for a whole interval —
a box 5 card gone for a month for having been looked at.

Deciding which cards a sitting asks for is `session.js`'s job, not something to hand-roll per deck:

```js
import { chooseSession } from "../src/session.js";

mount(document.body, chooseSession(cards, { onlyDue: true }), { /* … */ });
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

Everything the reader has ever opened, studied as one deck — reached from any deck through its menu
(§ next), or directly at <http://localhost:8000/v2/decks/empty-deck.html> for a reader with no deck
open at all. Not a list and not a table — the same card, the same keys and gestures, the same marks, the
same rules. A card is still judged with the card in front of you.

That is the whole design. `decks/empty-deck.html` is an ordinary deck file whose card list is empty, and
a deck file with no cards of its own studies the dictionary instead:

```js
import { chooseSession } from "../src/session.js";
import { allCards } from "../src/store.js";

const source = cards.length > 0 ? cards : allCards();

mount(document.body, chooseSession(source, { onlyDue: true }), { onGrade, gradeOf, progress });
```

A deck with cards of its own selects its dictionary session with exactly those lines too, the moment the
menu row is pressed — `deck.js` computes it once and hands it to the mounted deck's `switchTo` (§ next),
rather than opening a second page. One rule either way, not a special page or a second implementation to
keep in step: one grade per card per day means the same thing on both sides of the switch, because
underneath it is the same `mount()` and the same wiring. Grade a card in the deck, switch to the
dictionary under *Every card*, and it is already there wearing its mark and refusing another grade
today — and under *Due today* it isn't there at all, which is the same rule seen from the other side.

A deck and the dictionary ask for the same thing out of different pools: **what's due today**, up to
fifty, out of this deck's own cards or out of everything you've ever opened. "All of it" isn't a session
either way, so a card that isn't due is held back while due ones wait.

Held back with no floor under it: a pool with nothing due selects *nothing*, and the page says so with
one card — "Nothing to repeat today" — instead of reaching for the next-nearest card. There used to be
that fallback, and what it did to a reader was hand back a card they'd earned five stars on the same
evening the schedule had put it a month away. A schedule that can be overruled by having nothing else to
say isn't one, and the stars stop meaning anything.

Both take their cards in the same order: most overdue first, and past those, soonest-due next. A card
you've never graded counts as due now, so a large deck leads with what you haven't seen.

`chooseSession` **selects** rather than orders — `mount()` still shuffles what it is
handed (§ Interactions), because a fixed order studied every session teaches the order along with the
cards. Selecting is enough for what matters: you never meet a card that is not due while due ones are
waiting.

**This deck, or everything you have seen** is a pair of rows in the menu (§ next), and pressing the one
you are not on calls the mounted deck's `switchTo()` with the other session, in place — no navigation,
no second page, the same `mount()` throughout. Press back and you return to whichever card you left that
side on rather than to a fresh shuffle. `decks/empty-deck.html` has no deck of its own to switch back to,
so it carries no such pair; what it has instead is a real link in the corner, back to whichever deck you
last had open.

The pair is there from your first visit, including on the only deck you've ever opened, where
"everything you have seen" *is* that deck and both rows pick the same cards. It used to be withheld
there — see *The menu* below for why a row plays by different rules than the corner mark did. The one
thing that does withhold it is an empty dictionary, which `switchTo` would refuse anyway; on a deck that
brought cards that means storage is blocked, since its own cards are written there on mount.

A real link needs somewhere to point, and that's **the deck you came from**, which `openDeck()` records
as it opens one *with cards* — switching in place is not a visit, so it leaves no record of its own.
With more than one deck there's no such thing as *the* deck to name in its markup, and the record is
always there when it's needed: a dictionary with nothing in it can't render at all, so if there's
something to come back from, some deck was opened to put it there.

Cards are not attributed to the deck they came from. The same word can belong to several decks, so that
needs a mapping rather than a field, and nothing reads it yet.

## The menu

One button beside the card, and three questions behind it:

```text
 ■ Front first          which side comes up first
 □ Back first
 □ Random side
─────────────────────
 ■ Everyday German      which cards
 □ Everything you have seen
─────────────────────
 ■ Due today            how many of them
 □ Every card
```

Every row names a state you can be *in*, and the mark beside it says which one you're in now. That's the
one thing the two corner marks this replaced could not do: a single button has to draw the far side of
itself, so you had to work out which side you were on from a picture of the side you were not.

It hangs off the card's own top-right corner rather than the viewport's. Readers reported the old mark as
too far from the card, and they were describing a phone: a 4:3 card 75 % of the viewport wide leaves a
third of a tall screen empty above it, and a control at the very top of that gap is a stretch of the
thumb from the thing it acts on. `mount()` lends the page a layer for exactly this — `deck.chrome`, an
element over the card, inside the mounted deck so it can measure itself against the card's own size,
which is a custom property on that element and unreadable from outside it. The layer is transparent to
pointers and its contents are not, and **a gesture that starts on its contents belongs to them**: the tap
that opens the menu doesn't also flip the card under it, and the tap that dismisses it doesn't either.
The library draws nothing in the layer and never looks inside.

### Which side comes up first

```js
mount(element, cards, { facing: (card) => "front" | "back" });
```

The front, the back, or a side chosen at random — per reader, for every deck. `frontText` and `backText`
don't change meaning: the card is turned over, not rewritten, so a tap still shows the other side and a
deck author writes exactly what they wrote before.

The library is told only `"front"` or `"back"`, asked once per card as it arrives, and has never heard
the word *random* — which side a given card lands on is all it needs, and keeping it that way is what
stops a third mode existing inside `mount()`. Random is a coin per card, tossed with the deck's own
`random`, so a card you page back to may land the other way up: that's the honest reading of it, and a
side fixed per card would make paging back and forth a way to be sure of one.

Choose a side and the card in front of you turns over, rather than the change waiting for the next card —
a choice whose only effect is a mark moving in a sheet you're about to close is one you have no reason to
believe landed. It's remembered past the page, unlike the row below, because a reader who wants the deck
the other way round wants it every morning, and the worst an unreadable record can do is show you the
front.

### How many of them

The schedule's off switch: **Every card** makes the session every card in the pool you're looking at,
whatever its stars, in the same due order as ever. **Due today** puts it back. It is `chooseSession`'s
`onlyDue`, turned off — no second selection rule and no third pool.

```js
chooseSession(source, { onlyDue: true });  /* what's due today */
chooseSession(source);                     /* every card, stars and all */
```

It filters whichever pool is on screen, so it works on a single deck and on the dictionary alike, and the
two stay separate questions: *which* cards, and *how many of them*. Turning it on survives a switch
between the pools; it is **not** remembered past the page, because the schedule is the default and asking
past it is something you should have to say rather than drift into. That's the whole difference between
this row and the side above: one of them can cost you weeks of review without saying so.

### The shape is fixed

All three groups are there every time you open the menu, whether or not the two sides of a question
differ today. On a deck you've never graded, every card is due, so **Every card** picks exactly what
**Due today** picks; on your first deck, **Everything you have seen** is that deck. Both rows change
nothing this morning and are exactly what you want the moment the schedule starts holding cards back.

Both questions about the session were withheld in those cases at first, under the rule the corner marks
were drawn by: *a control that leads nowhere new is not drawn*. That's right for a mark — a lone icon
that leads nowhere is clutter with nothing on it to explain itself — and wrong for a row, in two ways. A
row *says* which state you're in, which is worth saying whether or not the other state is equivalent
today. And it lives in a list, so withholding it doesn't remove a control, it changes the shape of the
list: you open the menu on a fresh deck, find two groups where you were told there are three, and have
no way to tell whether the third doesn't apply or the app is broken. A menu whose shape moves underneath
you is one you have to re-read every time.

Two things still take a group out, and neither is about the schedule. `empty-deck.html` gets no pool
group — it *is* the dictionary, so "this deck" would name nothing — and neither does a pool `switchTo`
would refuse, which is an empty dictionary. Those are rows that couldn't act even in principle.

A pool with nothing left to answer is still worth knowing about: you'll be looking at the "Nothing to
repeat today" card, whose back says to open the menu. You get there two ways and it's the same card
either way — a session that was empty when it was dealt, and a session you've worked all the way through.

A session is a sitting's worth (50), not the whole pool, so running one out isn't by itself being done
for the day: the page deals the next lot out of what you can still answer, and only when there's nothing
left does the done card arrive. What it deals replaces what the page was holding for that session, so
switching pool and back doesn't walk you into a spent one.

The four sessions a page can deal — two pools × two scopes — overlap, so each one is **selected afresh
every time you ask for it** and kept only where the answer hasn't changed. Grading shortens the sequence
you're on; it can't reach the three you're not, and holding those as first dealt meant a card you'd
answered under *Every card* came back under *Due today* and refused you. Re-selecting reads the schedule,
which is where the answer lives, so every session agrees with it — and with whatever another tab has been
doing. "Unchanged" is the same cards, in any order (`neutral` moves a card's `dueAt` just by your paging
past it), and an unchanged session comes back as the same array, which is what keeps you on the card you
left.

The done card is a card, not a screen: no `key`, so it's never written to the dictionary and keeps no
schedule, it earns no star however you swipe at it, and it wraps to itself like any one-card session. A
pool with nothing *in* it is still an error rather than a done card — "you're done for today" isn't true
of a dictionary you've never put anything in.

### While it's open

The four arrows belong to the menu: up and down walk the rows, left and right do nothing, `Escape`
closes it, and `Enter`/`Space` press the focused row. The card is the page and the arrows are the deck's
every other moment there is — an open sheet is the one moment it isn't, and grading a card you have a
sheet over isn't what `↑` can be taken to mean. A tap anywhere outside dismisses it and does nothing
else.

## Layout

```text
docs/requirements.md  what v2 is, statement by statement (`V2-*`)
src/flashcards.js     mount() — the only export a deck page needs
src/order.js          one deck's sequence: shuffle and a cursor that wraps
src/deck.js           openDeck() — a deck assembled; what a deck page calls
src/store.js          the local-storage card dictionary
src/review.js         Leitner review scheduling — separate from mount()
src/session.js        which cards a sitting asks for — also separate from mount()
src/storage.js        the local-storage map helpers store.js and review.js share
src/view.js           the DOM, the flip, and the two ways a card leaves
src/input.js          keys and swipes, mapped onto one set of intents
src/flashcards.css    all of the styling
decks/                one file per deck
decks/empty-deck.html a deck of everything, i.e. a deck file with no cards
```

Tests live beside the modules they cover and run from the repository root with `npm test`.
