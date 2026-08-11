# Flashcard Learning Application & Data Requirements

## 1. Purpose

This document describes an application built on top of the generic Flashcard Library.

The application provides:

* language-learning content;
* reusable cards;
* multiple decks;
* a personal dictionary;
* local learning progress;
* future spaced-repetition functionality.

The application is responsible for **content management and learning state**. The Flashcard Library is responsible for presentation and interaction.

## 2. Relationship to the Flashcard Library

The application converts its stored content into:

```ts
Flashcard[]
```

and passes the resolved cards to:

```js
new FlashcardDeck("#app", cards);
```

The application/data layer is therefore independent of the internal implementation of `FlashcardDeck`.

Conceptually:

```text
Content / User Data
        ↓
Application Data Layer
        ↓
     Flashcard[]
        ↓
  Flashcard Library
        ↓
       UI
```

## 3. Card Identity

The application needs a stable identifier for each logical card.

A logical card represents:

> one specific piece of content with one specific meaning.

For example, these are separate cards:

```text
laufen → to run
laufen → to operate
```

They must never accidentally overwrite each other.

### Identifier

The exact storage mechanism determines where the identifier is stored.

If cards are stored as individual files:

```text
cards/
├── laufen-to-run.js
└── laufen-to-operate.js
```

the filename can serve as the stable identifier.

If cards are stored in a central CSV or another database-like format, an explicit identifier field is required:

```csv
key,frontText,frontDetails,backText,backDetails,category
laufen-to-run,...
laufen-to-operate,...
```

The important requirement is:

> Each logical card has exactly one stable identifier, and that identifier must never be changed or reused for a different meaning.

## 4. Card Repository

The application should maintain a reusable repository of cards.

A card should not belong exclusively to one deck.

The same card can be referenced by:

* multiple decks;
* the personal dictionary;
* future review sessions.

This avoids duplicating card content.

The exact repository format is intentionally left open.

Possible implementations include:

* CSV;
* JSON;
* individual JavaScript modules;
* a generated data file;
* another static data source.

The application should choose the simplest format appropriate for the expected number of cards and editing workflow.

## 5. Decks

A deck is a collection of references to cards.

A deck should not duplicate card content.

Example:

```js
const DECK_DATA = {
  deckTitle: "Everyday German",

  cards: [
    "laufen-to-run",
    "gehen-to-go",
    "zelle-cell"
  ]
};
```

The application resolves the identifiers into `Flashcard` objects before initializing the library.

### Deck metadata

A deck may contain:

* title;
* description;
* cover/title information;
* information shown through the library's information panel;
* card references;
* other application-specific metadata.

Deck metadata must not be added to the generic `Flashcard` structure unless required by the library.

## 6. Data Loading

The application/data layer is responsible for loading and resolving card data.

If cards are stored as modules, they may be loaded concurrently:

```js
const modules = await Promise.all(
  DECK_DATA.cards.map(key => import(`./cards/${key}.js`))
);

const cards = modules.map(module => module.default);

new FlashcardDeck("#app", cards);
```

If cards are stored in CSV:

```text
cards.csv
   ↓
CSV parser
   ↓
Flashcard[]
   ↓
FlashcardDeck
```

The application should hide this implementation detail from the flashcard library.

## 7. Static / No-Login Architecture

The basic application should not require:

* user accounts;
* login;
* a backend;
* server-side user storage.

Static hosting such as GitHub Pages should be supported.

This provides a particularly useful property for language-learning projects:

> A user can use the application without creating an account.

User-specific state is stored locally in the browser.

## 8. Local User State

`localStorage` is the initial storage mechanism for user-specific state.

Possible stored information includes:

* saved cards;
* personal dictionary;
* review progress;
* easy/difficult status;
* visited decks;
* other learning preferences.

The source card content should remain separate from user-specific state.

The application must not modify the source card files when a user reviews a card.

## 9. Personal Dictionary

The application provides a global personal dictionary independent of individual decks.

A user can save a card from any deck.

The personal dictionary stores stable card identifiers rather than duplicated card content.

Example:

```js
[
  "laufen-to-run",
  "gehen-to-go",
  "zelle-cell"
]
```

When the user opens the personal dictionary:

```text
saved card IDs
      ↓
resolve cards
      ↓
Flashcard[]
      ↓
FlashcardDeck
```

This allows the user to review all saved cards independently of their original decks.

## 10. Visited Decks

A future feature may maintain a history of decks opened in the current browser.

A separate catalog page can display previously visited decks.

This history is local to the browser unless a future synchronization mechanism is introduced.

## 11. Ordering

Initial behavior:

* Cards are shuffled on every new deck session.
* The shuffled order remains stable during that session.

Future behavior:

* Review scheduling can determine card order.
* Cards without review data can be randomized.

## 12. Review and Spaced Repetition

Review data is user-specific and must not be stored as part of the static card content.

Future review state may contain:

```ts
review: {
  lastReviewed: string;
  nextDue: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}
```

The review system is responsible for deciding:

* when a card is due;
* how difficult a card was;
* when it should appear again.

A spaced-repetition algorithm such as FSRS may be evaluated before implementing a custom algorithm.

## 13. Session-Level Learning

Initial future feature:

### Know / Don't Know

* The user can mark a card as known or not known.
* A "Don't know" card is placed back into the current session's queue.
* The basic implementation does not persist this state between visits.

Later versions may connect this interaction to persistent review scheduling.

## 14. Export / Import

A future feature may allow users to export:

* personal dictionary;
* review progress;
* other local learning state.

The exported data should be importable on another browser/device.

The feature should work without requiring a user account or backend.

## 15. Multilingual Content

The application should not impose a particular language direction.

For example, both of these are valid:

```text
German → English
English → German
```

and:

```text
Russian → Chinese
Chinese → Russian
```

The application does not need to solve bidirectional learning automatically in the initial version.

Different directions can simply be represented by different cards or decks.

Avoid introducing additional multilingual abstractions until a concrete use case requires them.

## 16. Content Maintenance

The content repository should be easy to maintain at the expected scale of hundreds or thousands of cards.

A central CSV is one possible authoring format because it provides:

* easy bulk editing;
* spreadsheet compatibility;
* simple import/export;
* a single vocabulary repository.

However, the application should not make the Flashcard Library dependent on CSV.

A possible architecture is:

```text
                 cards.csv
                     ↓
               build / parser
                     ↓
             generated data
                     ↓
                application
                     ↓
              Flashcard[]
                     ↓
             FlashcardDeck
```

The final choice between CSV, JSON, JavaScript modules, or another format is an application-level implementation decision.

## 17. Future Architecture

The application should remain independent of the Flashcard Library's internal implementation.

Possible future additions include:

* multiple card repositories;
* additional deck types;
* offline support;
* IndexedDB;
* import/export;
* synchronization between devices;
* optional accounts;
* cloud backup;
* spaced repetition;
* richer card content;
* audio/images;
* additional languages.

These should be added to the application/data layer unless they are directly required for the generic presentation component.

