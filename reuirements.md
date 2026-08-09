# Flashcards Requirements

## General

* A generalized, reusable flashcard library for learning new words.
* The card component must be completely agnostic about the source of its content.
* Cards are based on plain JSON-compatible objects.
* A **logical card represents one word with one specific meaning**.
* The same logical card can be used by multiple decks without duplicating the card content.

### Flashcard structure

```ts
interface Flashcard {
  key: string;              // Stable unique card identifier
  word: string;
  transcription?: string;
  translation: string;
  context?: string;         // Example sentence or usage context
  category?: string;        // e.g. "Verb", "Nomen"
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

The `review` block is designed for later versions. It is not provided as part of the source card data initially and will be maintained by the library.

### Card identity

* Each distinct word + meaning combination is a separate logical card.
* The card `key` is a stable identifier and must not be changed or reused for a different logical card.
* Card keys should be human-readable where practical.
* For the current German/English vocabulary, a key may be based on the word and meaning, e.g.:

  * `laufen-to-run`
  * `laufen-to-operate`
  * `zelle-cell`
  * `zelle-compartment`
* The exact key-generation convention is a data-management concern and is not part of the flashcard component's responsibilities.

## Card Storage and Decks

* Each logical card is stored separately.
* The card's filename is its stable key.
* Example:

```text
cards/
├── laufen-to-run.js
├── laufen-to-operate.js
├── zelle-cell.js
└── zelle-compartment.js
```

* Each card file exports one flashcard object as an ES module:

```javascript
export default {
  key: "laufen-to-run",
  word: "laufen",
  translation: "to run"
};
```

* Decks do **not** duplicate card objects. A deck contains references to card keys.

Example:

```javascript
const DECK_DATA = {
  deckTitle: "Everyday German",
  cards: [
    "laufen-to-run",
    "gehen-to-go",
    "zelle-cell"
  ]
};
```

* The same card can be referenced by multiple decks.
* The flashcard library/application resolves card keys to card objects before displaying them.
* Card loading should support dynamic loading so that a deck or future personal dictionary does not require manually importing every card file.

For example:

```javascript
const module = await import(`./cards/${key}.js`);
const card = module.default;
```

* The card component itself should receive resolved `Flashcard` objects. It should not be responsible for loading card files.

## Content Formatting

* Card content is plain text; no HTML formatting is supported.
* Card data must never be interpreted as HTML.
* HTML-sensitive characters such as `&`, `<`, and `>` must be safely escaped or rendered as text so that card content cannot break the layout or be interpreted as markup.

## Appearance and Layout

* **Strictly minimal layout** — only the card itself is on the screen. No persistent headers/source subtitles layered over the interface.
* **Wider than it is tall** — 4:3 aspect ratio by default.
* Size is calculated explicitly via JavaScript in pixels, not relying on CSS `aspect-ratio`.

  * `maxWidth = 90% of viewport width`
  * `maxHeight = 75% of viewport height` in portrait
  * `maxHeight = 88% of viewport height` in landscape
  * hard maximum width of `480px`
* Font size inside the card is tied to the actual card width via a CSS variable set by JavaScript, not to `vw`.
* **Dot indicators** are placed below the card as a separate block and never overlay the card.
* **Title card on very first start**:

  * shown only once per deck/session;
  * initially controlled by a session flag, with `localStorage` planned for later implementations;
  * displays the deck title/cover;
  * does not contain gesture explanations;
  * acts as a presentation title slide.
* **Info icon ⓘ**:

  * permanently available;
  * positioned outside the card at its top-right;
  * opens deck information and explains available gestures/interactions.
* **Front side** contains:

  * `word`
  * `transcription`, if provided
* **Back side** contains:

  * `translation`
  * `context`, if provided

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
* A tap is distinguished from a swipe by the amount of pointer/touch movement.

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

The library receives resolved `Flashcard` objects. Loading card files and resolving deck references may be handled by the surrounding application/data layer.

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

  * Enter/Space → flip
  * Left/Right → navigate
* When a card is flipped, the newly revealed back content should be announced to screen readers using an appropriate live-region mechanism.
* The implementation should avoid announcing the entire card unnecessarily when only the back content has changed.
* `e.preventDefault()` is used for Space where necessary to prevent unwanted page scrolling.

## Deployment & Data Storage

### Static card/deck files

* Card and deck data should not rely on `fetch()` of JSON files.
* The architecture should work with static hosting such as GitHub Pages.
* Card files use ES modules and can be loaded dynamically using `import()`.
* Deck files contain deck metadata and card-key references rather than duplicated card objects.

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

### Local file / Android considerations

* Opening local HTML through `file://` or Android `content://` URIs can restrict module loading and relative resource access.
* The multi-file setup should therefore be tested through a real local HTTP server, e.g. `python -m http.server`, or through HTTPS hosting such as GitHub Pages.
* Claude AI Artifacts run inside iframes with restrictive CSPs. The implementation should not depend on arbitrary external `fetch()` calls or external APIs.

## Ordering

* Cards are shuffled on every new visit/session to a deck.
* The shuffled order remains stable for the duration of that session.
* In later versions, ordering can take the `review` block into account; cards without review data can be randomized.

## Backlog / Future Features

### Session-level learning

* **"Know / Don't know"**:

  * "Don't know" cards are queued to reappear later in the same session.
  * No persistence between visits in the basic version.

### Persistent progress

* Save learning progress in `localStorage`.
* The deck remembers which cards were easy or difficult between visits.
* Review data is maintained by the library rather than by the source card files.

### Visited decks

* A separate catalog page showing all decks the user has opened in the current browser.

### Global Personal Dictionary

* Users can save cards from different decks into a shared personal collection stored in `localStorage`.
* The personal collection stores **card keys**, not duplicated card objects.
* When the user opens the personal dictionary, the application resolves all stored card keys to their card files and creates a flashcard session from them.
* The personal dictionary can therefore contain cards from many different decks without duplicating card content.
* The same logical card can appear in multiple decks and in the personal dictionary.
