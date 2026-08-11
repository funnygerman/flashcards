# Documentation

Specification-driven development: requirements carry stable IDs, tasks cite those IDs, and tests name them.

## Start here

| Document | What it is |
|---|---|
| [`library/requirements.md`](library/requirements.md) | The `FlashcardDeck` library specification — `LIB-*` IDs |
| [`app/requirements.md`](app/requirements.md) | The learning application and its data layer — `APP-*` IDs |
| [`tasks/README.md`](tasks/README.md) | Task index, dependency graph, milestones, requirement coverage |
| [`decisions/README.md`](decisions/README.md) | Why things are the way they are |
| [`roadmap.md`](roadmap.md) | Specified, deliberately not built in 1.x |
| [`old/`](old/) | Superseded, historical only |

## How these fit together

```text
requirements (LIB-*, APP-*)   what must be true
        ↓
decisions (D1 … D4)           why, and what was rejected
        ↓
tasks (T-00 … T-33)           independently implementable units, each citing requirement IDs
        ↓
tests                         named after the requirements they prove
```

## Rules

1. **Requirements are the source of truth.** Code does not redefine them. If a requirement is wrong, change
   it first, then write the code.
2. **IDs are stable.** Never reuse or renumber. A withdrawn requirement is marked *(withdrawn)*, not deleted.
3. **Structural changes get a decision record**, so a future reader can tell intent from accident.
4. **Every requirement belongs to exactly one task**, or is explicitly deferred to the roadmap. The coverage
   table in [`tasks/README.md`](tasks/README.md) is the check.

## Releases

| Release | Contents |
|---|---|
| 1.0 | Deck page: open a deck by URL, shuffled session |
| 1.1 | Personal collection: progress on view and grade, reviewable as a deck |
| later | [`roadmap.md`](roadmap.md) |
