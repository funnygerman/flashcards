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
└── docs/        # Requirements and documentation
