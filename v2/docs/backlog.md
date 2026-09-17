# v2 Backlog

Not requirements — a list of work not yet started, kept here so a new session can pick it up without
scrolling back through chat history. Referenced from a new session as: "see `v2/docs/backlog.md`."

Ordered by priority, highest first. Re-order this file as priorities change; that's the point of it.

---

## Accessibility (`V2-10.5`)

**What.** `V2-10.5` explicitly documents the current gap: no live region, no announcement on flip or
grade, including a refused grade. It was cut deliberately once (moving the refusal message onto the mark
cost the announcement) with a note that "a live region for it remains available if a reader ever needs
one." That reader now exists as a backlog item.

**Why this priority.** It's a named, scoped gap rather than open-ended feature work, and it affects real
users. Above the two speculative feature items because it's overdue rather than new, and further overdue
now that §16 has added a control with state a reader who cannot see it has to be told about. Note that it has
two more things to announce than it did: the card that says there is nothing to repeat today
(`V2-13.12`), which a reader who cannot see it would otherwise meet as a session that simply ends, and
what changes when a menu row is chosen (§16) — a switched pool, a widened session, a card turned over
where it stands (`V2-16.6`). The menu's own rows already carry `menuitemradio` and `aria-checked`, so
the gap there is what happens to the *card* afterwards, not the control.

**Size.** M. Needs a pass over flip, grade, refusal (`V2-15.2`), page-turn and the menu — decide what's
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

**Why this priority.** New capability, not a gap in something already built. No dependency on the items
above, so it can slot in whenever, but it's additive scope on a library whose whole design center
(`V2-7.1`, `V2-7.2`) is the card and as little else as possible — needs its own small design pass: is
there a control at all, is it a menu row (§16), or is it gesture-triggered with no visible affordance,
which is a harder problem given `V2-15.1`'s "every action needs a visible/audible result" rule. Note
that a menu row is a *state* the reader is in (`V2-16.3`), which "speak this card now" is not — so
"put it in the menu" is a proposal that has to answer that before it is an answer.

**Size.** M–L.

---

## Gamification (streaks)

**What.** Some reward mechanic — daily streaks were mentioned specifically — for the reader keeping up
with review or maybe even scrolling through the deck. Maybe something like one point a day, if user saw at 
least 10 cards today. There is now a menu to hang it off (§16), which removes the "nowhere to put it"
half of the problem — and replaces it with a sharper one, since `V2-16.3` says a menu row is a choice
the reader makes and a streak is not.

**Why last.** Broadest scope, most speculative, and most likely to collide with the project's own design
philosophy: no position indicators, no title screen (`V2-10.3`), a page that is the card and the menu
and nothing else (`V2-7.1`, §16 — which is the bound on how far that can be relaxed, not a licence). A streak needs somewhere to be shown; what counts as a day's session is now
settled (`V2-13.4`) — due-driven, for both a deck and the dictionary, with an end to it now that nothing
stands in when nothing is due (`V2-13.12`). Whether cards met through the filter (`V2-13.13`) count
towards a streak is a question that design conversation now has to answer, as is whether a card met
back first or on a random side (`V2-16.4`) counts the same as one met front first. Worth a dedicated design conversation
before any code, not a checkbox item under "backlog."

**Size.** L. Design conversation first; implementation depends heavily on what that conversation decides.

---

## Not in this list

Ideas raised but already covered by an existing, deliberate decision in `docs/requirements.md` §10 or the
Open Questions section — re-raise those by amending that document, not by adding them here.
