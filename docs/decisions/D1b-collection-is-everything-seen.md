# D1b — The personal collection is every card seen

**Status:** accepted

## Context

The original specification described a personal dictionary the user opts into: browse a deck, press save on
the cards worth keeping. [D1](D1-library-events.md) removed the save button, which made the question
unavoidable — if nothing is explicitly saved, what is the collection?

## Decision

The collection is **every card the user has seen**. Viewing a card records it; swiping up or down tunes its
difficulty. There is no save action anywhere in the application.

Progress is one record per seen card:

```ts
{ seenCount: number; lastSeen: string; grade?: "easy" | "hard" }
```

## Consequences

- No curation UI to design, and no state where a user wonders whether a card was saved.
- The collection accumulates silently, which makes two things matter more than they did:
  - **Stale identifiers.** A card deleted from the repository leaves an identifier behind. It is skipped on
    resolve, kept in storage so re-adding restores it, and reported as a count (`APP-9.9`).
  - **Size.** At 5,000 cards the serialized state is roughly 300 KB — comfortable for `localStorage`, but the
    store warns past 1 MB (`APP-8.7`).
- This is how spaced-repetition systems normally behave: cards enter your collection by being studied, and
  scheduling decides what you see next. It leaves `APP-12` with the input it needs.
- `APP-9` was rewritten; the opt-in save flow it previously described is gone.

## Rejected

**Only cards I graded.** The collection would stay curated, and grading would double as the "keep this" act.
Rejected because it makes grading carry two meanings at once, and a card you merely looked at is exactly the
card you are most likely to want back.

**Only the difficult ones.** A problem-words list — smallest collection, but there is then no way to find a
card again that you did not happen to mark as hard.
