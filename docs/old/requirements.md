# Flashcards Requirements

## General

* A generalized, reusable flashcard library for learning new words and other content.
* The flashcard library must be completely agnostic about the source and semantic meaning of its content.
* Cards are based on JSON-compatible objects.
* A **logical card represents one specific piece of content with one specific meaning**.
* The same logical card can be reused by multiple decks and projects without duplicating its content.

### Flashcard structure

```ts
interface Flashcard {
  key: string;              // Stable unique identifier for the logical card

  front: {
    text: string;           // Main content displayed on the front
    details?: string;       // Optional additional information
  };

  back: {
    text: string;           // Main content displayed on the back
    details?: string;       // Optional additional information
  };

  category?: string;        // Optional category, e.g. "Verb", "Nomen"
  lastUpdate?: string;      // ISO date of last content update

  review?: {
    lastReviewed: string;   // ISO date
    nextDue: string;        // ISO date
    interval: number;       // Days until next review
    easeFactor: number;     // Start: 2.5
    repetitions: number;
  };
}
```

The flashcard library does not assign semantic meaning to `front.text`, `front.details`, `back.text`, or `back.details`.

For example, in a language-learning project:

```js
export default {
  key: "laufen-to-run",

  front: {
    text: "laufen",
    details: "ˈlaʊ̯fn̩"
  },

  back: {
    text: "to run",
    details: "Ich laufe jeden Morgen."
  },

  category: "Verb"
};
```

In another project, the same structure could represent a question and answer:

```js
export default {
  key: "capital-of-france",

  front: {
    text: "What is the capital of France?"
  },

  back: {
    text: "Paris",
    details: "Capital and largest city of France."
  },

  category: "Geography"
};
```

### Card identity

* Each distinct word/meaning or question/answer combination is a separate logical card.
* The `key` is a stable identifier for the logical card.
* Once assigned, a key must never be changed or reused for a different logical card.
* Keys should be human-readable where practical.
* Example keys:

  * `laufen-to-run`
  * `laufen-to-operate`
  * `zelle-cell`
  * `capital-of-france`
* The exact key-generation convention is a content-management concern and is not the responsibility of the flashcard component.

## Card Storage and Reuse

* Each logical card is stored separately.
* The card's filename is its stable key.

Example:

```text
cards/
├── laufen-to-run.js
├── laufen-to-operate.js
├── zelle-cell.js
└── zelle-compartment.js
```

* Each card file exports one flashcard object as an ES module:

```js
export default {
  key: "laufen-to-run",

  front: {
    text: "laufen",
    details: "ˈlaʊ̯fn̩"
  },

  back: {
    text: "to run",
    details: "Ich laufe jeden Morgen."
  }
};
```

* A card file contains **content only**. It must not contain user-specific review state.
* The same card file can be referenced by multiple decks and multiple projects.
* Card content is therefore reusable independently of any particular deck, website, or application.

## Decks

* A deck is a collection of card references, not a copy of card objects.
* Decks contain card keys.

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

* The same card can appear in any number of decks.
* A card does not belong exclusively to one deck.
* The application resolves card keys to the corresponding card objects before passing them to the flashcard library.
* Deck-specific metadata belongs to the deck/application layer and must not be added to the generic `Flashcard` structure unless it is required by the flashcard library itself.

## User State and No-Login Architecture

* The reusable card library and decks contain static content.
* User-specific information is stored locally in the browser using `localStorage`.
* No user account or server-side user database is required for the basic implementation.
* User-specific data may include:

  * saved cards;
  * review progress;
  * cards marked as easy/difficult;
  * visited decks;
  * other future learning preferences.
* User state is associated with the current browser/device and is not automatically synchronized between devices.
* Future versions may provide explicit export/import of user data to allow users to transfer their progress between devices without requiring an account.

### Personal Dictionary

* Users can save cards from different decks into a shared personal dictionary.
* The personal dictionary stores **card keys**, not duplicated card objects.

Example:

```text
localStorage:
[
  "laufen-to-run",
  "zelle-cell",
  "gehen-to-go"
]
```

* When the user opens the personal dictionary, the application resolves these keys to their card files and creates a flashcard session from the resulting cards.
* The same card can therefore simultaneously belong to:

  * multiple public decks;
  * the user's personal dictionary;
  * future review queues.
* This avoids duplication of vocabulary content.

## Content Formatting

* Card content is plain text; no HTML formatting is supported.
* Card data must never be interpreted as HTML.
* HTML-sensitive characters such as `&`, `<`, and `>` must be safely escaped or rendered as text so that card content cannot break the layout or be interpreted as markup.

## Appearance and Layout

* **Strictly minimal layout** — only the card itself is on the screen. No persistent headers/source subtitles layered over the interface.
* **Wider than it is tall** — 4:3 aspect ratio by default.
* Size is calculated explicitly via JavaScript in pixels, not relying on CSS `aspect-ratio`:

  * `maxWidth = 90% of viewport width`
  * `maxHeight = 75% of viewport height` in portrait mode
  * `maxHeight = 88% of viewport height` in landscape mode
  * hard maximum width of `480px`
* Font size inside the card is tied to the actual card width via a CSS variable set by JavaScript, not to `vw`.
* **Dot indicators** are placed below the card as a separate block and never overlay the card.
* **Title card on very first start**:

  * shown only once;
  * initially controlled by a session flag, with `localStorage` planned for later implementations;
  * displays the deck title/cover;
  * does not contain gesture explanations;
  * acts as a presentation title slide.
* **Info icon ⓘ**:

  * permanently available;
  * positioned outside the card at its top-right;
  * opens deck information and explains available gestures/interactions.
* **Front side** displays:

  * `front.text`;
  * `front.details`, if provided.
* **Back side** displays:

  * `back.text`;
  * `back.details`, if provided.

## Navigation and Interaction

### Touch Swipe

* On touch devices, navigation behaves like a photo-gallery slider.
* The entire row of cards (`track`) moves with the user's finger in real time.
* The adjacent card gradually appears from the edge during the swipe.
* **Edge resistance:** swiping beyond the first/last card applies friction with coefficient `0.35`.
* **Swipe threshold:** `18%` of the card width.
* If the swipe does not reach the threshold, the track smoothly snaps back to the current card.
* A completed swipe navigates to the next/previous card and must not also trigger a card flip.

### Card Tap

* Tapping/clicking the card flips between front and back.
* A tap is distinguished from a swipe by pointer/touch movement.

### Desktop / Mouse

* Mouse dragging is not supported.
* Users must be able to select and copy card text freely.
* Two visual arrow buttons (Left / Right) are displayed outside the card for mouse-based navigation.

### Keyboard

* Left/Right arrow keys navigate between cards.
* Enter/Space on a focused card flips it.
* Space must not cause unwanted page scrolling while being used to flip a card.

### Later versions

* Swipe up / Up key for cards that are easy.
* Swipe down / Down key for cards that are still difficult.

## Library Architecture

A single reusable JavaScript class should be used, avoiding HTML copy-pasting for every deck:

```js
new FlashcardDeck('#container', DECK_CARDS, {
  accentColor: '#4a6fa5',
  aspectRatio: [4, 3],
  // ...
});
```

The library receives a fully resolved array of `Flashcard` objects.

The library itself must **not** be responsible for loading card files or resolving deck references.

### Data loading

The wrapper/application layer is responsible for resolving deck card keys into `Flashcard` objects.

Card modules should be loaded concurrently using `Promise.all()`:

```js
const modules = await Promise.all(
  DECK_DATA.cards.map(key => import(`./cards/${key}.js`))
);

const DECK_CARDS = modules.map(module => module.default);

new FlashcardDeck('#app', DECK_CARDS);
```

* `FlashcardDeck` receives only the fully resolved `Flashcard[]`.
* `FlashcardDeck` does not need to know whether cards originated from JavaScript files, a database, an API, `localStorage`, or another source.

### Implementation

* The class injects its styles into `<head>` once using a `stylesInjected` flag.
* It builds all required HTML inside the provided container.
* Public method: `goTo(index)` for programmatic navigation.
* Private methods are prefixed with `_`, e.g. `_buildDOM`, `_sizeCard`, `_bindEvents`.
* CSS classes are prefixed with `fc-` to prevent conflicts with the surrounding page.
* The container occupies the full screen (`100dvh`).
* The library is designed primarily for dedicated deck pages, such as pages hosted on GitHub Pages, rather than being embedded into long articles.

## Accessibility (a11y)

* Every card is keyboard-focusable using `tabindex="0"`.
* Every card has an appropriate accessible role and `aria-label`.
* Keyboard navigation is supported:

  * Enter/Space → flip;
  * Left/Right → navigate.
* When a card is flipped, the newly revealed back content should be announced to screen readers using an appropriate live-region mechanism.
* The implementation should avoid announcing the entire card unnecessarily when only the back content has changed.
* `e.preventDefault()` is used for Space where necessary to prevent unwanted page scrolling.

## Deployment & Data Storage

### Static Files

* The architecture should work without a backend or database.
* Card and deck content should be stored as static files.
* Card files use ES modules and can be loaded dynamically using `import()`.
* Deck files contain deck metadata and card-key references rather than duplicated card objects.
* Static hosting such as GitHub Pages should be supported.

Example:

```text
project/
├── flashcards.js
├── cards/
│   ├── laufen-to-run.js
│   ├── laufen-to-operate.js
│   └── zelle-cell.js
├── decks/
│   ├── everyday-german.js
│   └── business-german.js
└── index.html
```

### Local File / Android Considerations

* Opening local HTML through `file://` or Android `content://` URIs can restrict module loading and relative resource access.
* The multi-file setup should therefore be tested through a real local HTTP server, e.g. `python -m http.server`, or through HTTPS hosting such as GitHub Pages.
* Claude AI Artifacts run inside iframes with restrictive CSPs. The implementation should not depend on arbitrary external `fetch()` calls or external APIs.

## Ordering

* Cards are shuffled on every new visit/session to a deck.
* The shuffled order remains stable for the duration of that session.
* In later versions, ordering can take review data into account.
* Cards without review data can be randomized.

## Backlog / Future Features

### Session-level learning

* **"Know / Don't know"**

  * "Don't know" cards are queued to reappear later in the same session.
  * No persistence between visits in the basic version.

### Persistent Progress

* Save learning progress in `localStorage`.
* The deck remembers which cards were easy or difficult between visits.
* Review data is maintained as user-specific state and is not written back to the source card files.

### Visited Decks

* A separate catalog page showing all decks the user has opened in the current browser.

### Personal Dictionary

* Save cards from different decks into a shared personal collection in `localStorage`.
* Store card keys rather than duplicated card objects.
* Allow the user to open all saved cards as a standalone flashcard session, independently of the decks from which the cards originated.

### Export / Import

* Future option to export the user's local dictionary and learning progress.
* Future option to import the exported data on another browser/device.
* Export/import should work without requiring a user account or backend.

### Review Scheduling

* Future integration of spaced-repetition scheduling.
* The scheduling algorithm should be kept separate from the source card content.
* An existing implementation such as FSRS may be considered instead of implementing a scheduling algorithm from scratch.

### Multilingual Support

* The initial implementation does not need to solve multilingual or reverse-direction learning.
* The data model should remain sufficiently generic to allow other language combinations in the future.
* Do not introduce additional multilingual complexity until there is a concrete requirement for it.
