# D3 — Release 1.0 is the deck page; the collection follows in 1.1

**Status:** accepted

## Context

The requirement documents describe a large application — decks, a personal collection, a catalog, export and
import, spaced repetition — without saying what the first shippable version contains. Everything reads as
in-scope, which makes the work impossible to sequence.

## Decision

**Release 1.0** is the deck page alone: open a deck by URL, shuffle it, render it. No stored progress.
**Release 1.1** adds the personal collection, immediately after.

## Consequences

- Real cards reach a real screen early, which is where the layout, sizing and gesture risk actually lives. A
  card that looks wrong on a phone is worth discovering before any storage code exists.
- This is an ordering choice, not a scope cut. Only two tasks are 1.1-only — the progress store and the
  collection page — because the task split keeps the data layer independent of the UI.
- The library ships grading in 1.0 regardless: it is specified and tested on the library's own terms, and the
  1.0 application simply does not subscribe to `onGrade` (`APP-1.7`). Nothing has to be built twice.
- No user progress is recorded before 1.1. For a project with no users yet, nothing is lost.

## Rejected

**Deck plus collection as one release.** Tempting, because it exercises the whole pipeline including user
state, and it is the version that is actually useful day to day. Rejected only on sequencing: it delays the
first look at real cards behind storage work that does not need to come first.

**Deck plus collection plus catalog.** A third page of UI before anything ships, when a URL is a perfectly
good way to open a deck for the only user the project currently has.
