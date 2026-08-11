# flashcards
No app, no accounts, just flashcards in browser

## The idea
Prepare cards, open them and learn.

**Initially:** only learn collection you opened.

**Planned:** collections should be stored on device, so you can learn more and more words

## Repository Structure

This repository contains two related parts:

- **Library** — the reusable `FlashcardDeck` UI library.
- **Application** — a reference application built using the library.

The library is independent of the application's data storage and learning logic.

```text
flashcards/
├── library/     # Reusable FlashcardDeck library
├── app/         # Reference application
├── content/     # Card authoring sources (CSV / JSON / ES modules)
└── docs/        # Specifications, decisions, and task specs
```

## Documentation

Development is specification-driven: requirements carry stable IDs, task specs cite those IDs, and tests name
them. Start at [`docs/README.md`](docs/README.md).

| | |
|---|---|
| [Library requirements](docs/library/requirements.md) | `LIB-*` — presentation and interaction |
| [Application requirements](docs/app/requirements.md) | `APP-*` — content and learning state |
| [Tasks](docs/tasks/README.md) | Independently implementable units, with a dependency graph |
| [Decisions](docs/decisions/README.md) | Why things are the way they are |
| [Roadmap](docs/roadmap.md) | Specified, deliberately not built in 1.x |

## Releases

- **1.0** — deck page: open a deck by URL, shuffled session.
- **1.1** — personal collection: every card you see is recorded, swiping up or down grades it, and the
  collection is reviewable as a deck of its own.
