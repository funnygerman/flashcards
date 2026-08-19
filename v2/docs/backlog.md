# v2 Backlog

Not requirements — a list of work not yet started, kept here so a new session can pick it up without
scrolling back through chat history. Referenced from a new session as: "see `v2/docs/backlog.md`."

Ordered by priority, highest first. Re-order this file as priorities change; that's the point of it.

---

## `v2-Code-Review`

**What.** Run `/code-review` (or equivalent) over the recent rating-view work before building more on top
of it. The last several merged PRs (`claude/rating-view-v2-ux-*`) touched grading, animation and the guide
in quick succession — exactly the kind of streak where small inconsistencies accumulate unnoticed.

**Why this priority.** Everything below this line adds surface area. Cheaper to catch drift now, against a
codebase that's still fresh in context, than after three more features sit on top of it.

**Size.** S–M, depending on findings.

---

## Deck session mode: study-what's-due vs. show-everything

**What.** `V2-13.4` currently gives a deck and the dictionary different selection rules: a deck offers all
of its own cards (up to `SESSION_LIMIT`); the dictionary offers only what's due. The open question is
whether a deck should also default to "only what I can learn today," with a separate "show me everything"
mode for a reader who wants to browse or cram — rather than always handing over the whole deck regardless
of schedule.

**Why this is a decision, not a task.** It changes what `V2-13.4` and `V2-13.10` mean, and any gamification
work (`#7`) will be built on top of whatever this becomes — a streak means something different if "today's
session" is schedule-driven than if it's always the whole deck. Worth settling the shape before other
backlog items assume one answer.

**Size.** Decision: S (a conversation). Implementation once decided: M — likely a second `openDeck` option
or mode, plus the requirements-doc update that goes with any behavior change here.

---

## Accessibility (`V2-10.5`)

**What.** `V2-10.5` explicitly documents the current gap: no live region, no announcement on flip or
grade, including a refused grade. It was cut deliberately once (moving the refusal message onto the mark
cost the announcement) with a note that "a live region for it remains available if a reader ever needs
one." That reader now exists as a backlog item.

**Why this priority.** It's a named, scoped gap rather than open-ended feature work, affects real users,
and doesn't require settling `#3` first. Above the two speculative feature items because it's overdue
rather than new.

**Size.** M. Needs a pass over flip, grade, refusal (`V2-15.2`) and page-turn — decide what's
announced, when, and how it interacts with `V2-8.6`'s "everything changes in one off-screen frame" rule
so an announcement doesn't fire mid-slide.

---

## Adaptive font size for text length

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

## Text-to-Speech

**What.** Read `frontText`/`backText` (and details) aloud, presumably via the Web Speech API given
`V2-9.1`'s no-dependency rule.

**Why this priority.** New capability, not a gap in something already built. No dependency on `#3`–`#5`,
so it can slot in whenever, but it's additive scope on a library whose whole design center (`V2-7.1`,
`V2-7.2`) is "no chrome" — needs its own small design pass: is there a control at all, or is it
gesture-triggered with no visible affordance, which is a harder problem given `V2-15.1`'s "every action
needs a visible/audible result" rule.

**Size.** M–L.

---

## Gamification (streaks)

**What.** Some reward mechanic — daily streaks were mentioned specifically — for the reader keeping up
with review or maybe even scrolling through the deck. Maybe something like one point a day, if user saw at 
least 10 cards today. It could be placed near to single-deck-vs-dictionary-switch-button.

**Why last.** Broadest scope, most speculative, and most likely to collide with the project's own design
philosophy: no chrome, no position indicators, no title screen (`V2-10.3`), a page that is "the card and
nothing else" (`V2-7.1`). A streak needs somewhere to be shown and some notion of what counts as a day's
session, which depends on `#3`. Worth a dedicated design conversation before any code, not a checkbox item
under "backlog."

**Size.** L. Design conversation first; implementation depends heavily on what that conversation decides
and on `#3`.

---

## Not in this list

Ideas raised but already covered by an existing, deliberate decision in `docs/requirements.md` §10 or the
Open Questions section — re-raise those by amending that document, not by adding them here.
