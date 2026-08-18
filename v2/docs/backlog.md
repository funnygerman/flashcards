# v2 Backlog

Not requirements — a list of work not yet started, kept here so a new session can pick it up without
scrolling back through chat history. Referenced from a new session as: "see `v2/docs/backlog.md`."

Ordered by priority, highest first. Re-order this file as priorities change; that's the point of it.

---

## 1. Bug: corner link shown from a deck with no cards

**What.** Open a deck HTML file that defines no cards of its own. Per `V2-13.3`, a deck with no cards
studies the dictionary instead — correct. But the corner link (`V2-13.9`) then shows the "switch to a
single deck" icon, as if there is a specific deck to go back to, which is misleading on a page that was
never really "a deck" to begin with.

**Likely cause.** `openDeck()` in `deck.js:306` calls `holdsMoreThan(cards, storage)` — `cards` is the
page's own (empty) card array, not `source` (the resolved set actually being studied, `deck.js:234`).
Worth checking against `V2-13.9`'s actual rule ("the dictionary holds a card the current deck does not")
before patching, since the empty-`cards` case may need its own rule rather than reusing `holdsMoreThan`
as-is.

**Why first.** Small, well-isolated, correctness bug in code that was just finished. Cheap to fix now
while the area is warm; will only get more expensive to re-learn later.

**Size.** S.

---

## 2. Decision: is the corner link real navigation, or an in-page source swap?

**What.** While scoping item 1, the question came up of whether the corner link (`V2-13.9`) should keep
being a real page-to-page navigation (`<a href>` between two separate HTML files) or become an in-page
transition — same page, same mount, just swapping which cards are loaded — so a reader moving between a
deck and the dictionary never leaves the page at all.

**Why this is a decision, not a task.** It runs against two things `docs/requirements.md` states as
deliberate, not incidental: `V2-1.2` ("one HTML file is one deck") and `V2-13.9`'s own reasoning for why
the corner is a real link and not app-like chrome — "it carries no state, and it is the host page's
element rather than the library's... a reader on a phone has no address bar to type into and no other way
to cross between them." Swapping to an in-page source change would make the library carry navigational
state it explicitly does not carry today, which is a bigger philosophy change than a bug fix and needs its
own sign-off before any code — including before item 1 is finished, since how that bug is understood to
manifest ("misleading, as if this were real navigation to a specific deck") partly depends on which model
the corner link is supposed to follow.

**Size.** Decision: S (a conversation). Implementation, if the answer is "yes, swap in place": likely L —
touches `deck.js`, `flashcards.js`'s mount lifecycle, `dictionary.html`, `V2-1.2`, `V2-13.9` and `V2-14.7`
in the requirements doc, and the browser back-button behavior a real navigation gets for free today.

---

## 3. `v2-Code-Review`

**What.** Run `/code-review` (or equivalent) over the recent rating-view work before building more on top
of it. The last several merged PRs (`claude/rating-view-v2-ux-*`) touched grading, animation and the guide
in quick succession — exactly the kind of streak where small inconsistencies accumulate unnoticed.

**Why third.** Everything below this line adds surface area. Cheaper to catch drift now, against a
codebase that's still fresh in context, than after three more features sit on top of it.

**Size.** S–M, depending on findings.

---

## 4. Deck session mode: study-what's-due vs. show-everything

**What.** `V2-13.4` currently gives a deck and the dictionary different selection rules: a deck offers all
of its own cards (up to `SESSION_LIMIT`); the dictionary offers only what's due. The open question is
whether a deck should also default to "only what I can learn today," with a separate "show me everything"
mode for a reader who wants to browse or cram — rather than always handing over the whole deck regardless
of schedule.

**Why this is a decision, not a task.** It changes what `V2-13.4` and `V2-13.10` mean, and any gamification
work (`#8`) will be built on top of whatever this becomes — a streak means something different if "today's
session" is schedule-driven than if it's always the whole deck. Worth settling the shape before other
backlog items assume one answer.

**Size.** Decision: S (a conversation). Implementation once decided: M — likely a second `openDeck` option
or mode, plus the requirements-doc update that goes with any behavior change here.

---

## 5. Accessibility (`V2-10.5`)

**What.** `V2-10.5` explicitly documents the current gap: no live region, no announcement on flip or
grade, including a refused grade. It was cut deliberately once (moving the refusal message onto the mark
cost the announcement) with a note that "a live region for it remains available if a reader ever needs
one." That reader now exists as a backlog item.

**Why this priority.** It's a named, scoped gap rather than open-ended feature work, affects real users,
and doesn't require settling `#4` first. Above the two speculative feature items because it's overdue
rather than new.

**Size.** M. Needs a pass over flip, grade, refusal (`V2-15.2`) and page-turn — decide what's
announced, when, and how it interacts with `V2-8.6`'s "everything changes in one off-screen frame" rule
so an announcement doesn't fire mid-slide.

---

## 6. Adaptive font size for text length

**What.** `V2-10.4` currently states the opposite as a deliberate decision: "card size is independent of
text length... a card with far more text than the design assumes fills its card and may run under the
category label." Making font size adapt to content reverses a documented design call, not just adds a
feature.

**Why this priority.** Real cards can have long `frontText`/`backText`/`details`, so this is a legitimate
gap — but reversing `V2-10.4` needs its own design pass (what shrinks — text, details, both? is there a
floor? does it interact with `V2-7.7`'s fixed fractions?) before implementation, which puts it below the
scoped items above.

**Size.** M. Design decision plus implementation; touches `V2-7.7`/`V2-7.8` and the requirements doc.

---

## 7. Text-to-Speech

**What.** Read `frontText`/`backText` (and details) aloud, presumably via the Web Speech API given
`V2-9.1`'s no-dependency rule.

**Why this priority.** New capability, not a gap in something already built. No dependency on `#4`–`#6`,
so it can slot in whenever, but it's additive scope on a library whose whole design center (`V2-7.1`,
`V2-7.2`) is "no chrome" — needs its own small design pass: is there a control at all, or is it
gesture-triggered with no visible affordance, which is a harder problem given `V2-15.1`'s "every action
needs a visible/audible result" rule.

**Size.** M–L.

---

## 8. Gamification (streaks)

**What.** Some reward mechanic — daily streaks were mentioned specifically — for the reader keeping up
with review.

**Why last.** Broadest scope, most speculative, and most likely to collide with the project's own design
philosophy: no chrome, no position indicators, no title screen (`V2-10.3`), a page that is "the card and
nothing else" (`V2-7.1`). A streak needs somewhere to be shown and some notion of what counts as a day's
session, which depends on `#4`. Worth a dedicated design conversation before any code, not a checkbox item
under "backlog."

**Size.** L. Design conversation first; implementation depends heavily on what that conversation decides
and on `#4`.

---

## Not in this list

Ideas raised but already covered by an existing, deliberate decision in `docs/requirements.md` §10 or the
Open Questions section — re-raise those by amending that document, not by adding them here.
