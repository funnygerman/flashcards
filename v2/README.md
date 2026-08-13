# v2 — a minimal flashcard library

One HTML file is one deck. The deck holds its cards inline, `mount()` shuffles them, and the reader
gets one card on the screen with nothing else on it.

No build step, no dependencies, no framework: the browser loads `src/*.js` as it is.

## Using it

```html
<link rel="stylesheet" href="../src/flashcards.css" />

<script type="module">
  import { mount } from "../src/flashcards.js";

  mount(document.body, [
    { key: "wasser-water", frontText: "das Wasser", backText: "water", category: "noun" },
    { key: "laufen-to-run", frontText: "laufen", frontDetails: "on foot", backText: "to run" },
  ]);
</script>
```

`decks/everyday-german.html` is a complete example. Serve it with `npm run serve` from the repository
root and open <http://localhost:8000/v2/decks/everyday-german.html> — ES modules do not load over
`file://`.

### Cards

```js
{
  key: "wasser-water",       // the card's identity in local storage; opaque to the library
  frontText: "das Wasser",
  frontDetails: "…",         // optional
  backText: "water",
  backDetails: "…",          // optional
  category: "noun",          // optional
}
```

### `mount(element, cards, options?)`

Returns `{ destroy() }`. Options:

| | |
|---|---|
| `onGrade(card, level)` | called when the reader grades a card, with `"harder"` or `"easier"` |
| `storage` | where cards are remembered; defaults to `localStorage` |
| `random` | the shuffle's source of randomness; defaults to `Math.random` |

## Interactions

| | Key | Gesture |
|---|---|---|
| Flip the card | `Space` / `Enter` | tap or click |
| Next card | `→` | swipe left to right |
| Previous card | `←` | swipe right to left |
| Not known well enough | `↑` | swipe up |
| Known well enough | `↓` | swipe down |

The deck wraps in both directions, so it never runs out. Grading records the card and moves on.

## Local storage

Every card the reader opens is written to `localStorage["flashcards.cards"]`, keyed by `key`, and is
loaded from there on the next visit — card content is assumed not to change. Nothing else is stored
yet: this is the groundwork for the dictionary view and the review logic, and grades currently reach
the host page through `onGrade` only.

## Layout

```text
src/flashcards.js    mount() — the only export a deck page needs
src/deck.js          shuffle and a cursor that wraps
src/store.js         the local-storage card dictionary
src/view.js          the DOM, the flip, and the slide
src/input.js         keys and swipes, mapped onto one set of intents
src/flashcards.css   all of the styling
decks/               one file per deck
```

Tests live beside the modules they cover and run from the repository root with `npm test`.
