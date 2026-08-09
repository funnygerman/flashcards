# Flashcards requirements

## General

- A generalized, reusable flashcard library to learn new words. However the card component should be completely agnostic about the source of its content.
- cards are based on JSON objects

This is a draft structure:
interface Flashcard {
  key: string;              // Stable unique card identifier, e.g. "laufen1", "laufen2"  
  word: string;
  transcription?: string;
  translation: string;
  context?: string,         // an example of usage
  category?: string;        // e.g. "Verb", "Nomen"
  tglinks?: string[];       // e.g. ["funnygerman/123", "korotko_de/12"]
  lastUpdate?: string;      // ISO-Date of last update

  review?: {
    lastReviewed: string;   // ISO-Date
    nextDue: string;        // ISO-Date
    interval: number;       // days to repeat
    easeFactor: number;     // Start: 2.5
    repetitions: number;
  };
}

Review block is designed for later versions. It's not provided but will be maintained by library.

For each source word, meanings are assigned sequential numeric identifiers starting at 1. Once assigned, a key must never be changed or reused for a different meaning.

## Content Formatting
- there should be no content formatting
- HTML characters in the input (`&`, `<`, `>`) are strictly escaped before rendering so the content doesn't break the layout.

## Appearance and Layout

- **Strictly minimal layout** — only the card itself is on the screen. No persistent headers/source subtitles layered over the interface.
- **Wider than it is tall** — always 4:3 aspect ratio by default, so it doesn't feel vertically "crushed" in portrait mode on mobile devices.
- Size is calculated **explicitly via JS in pixels**, not relying on CSS `aspect-ratio`:
  - More reliable across browsers, guaranteed not to overflow the screen.
  - `maxWidth = 90% of screen width`
  - `maxHeight = 75% of screen height in portrait mode, 88% in landscape` (height is the bottleneck in landscape, hence the softer limit).
  - An additional **hard cap of 480px width** — without this, cards become unjustifiably huge on large desktop monitors.
- **Font size inside the card is tied to the actual card width** (via a CSS variable set by JS), NOT to `vw` (viewport width). Otherwise, font sizes fluctuate between portrait and landscape orientations even if the card size remains the same.
- **Dot indicators** — placed under the card as a separate block, underneath the card, not overlaying the card
- **Title card on very first start** — shown only once (initally session flag, in later implementations flag in `localStorage`), displaying the deck title/cover without gesture explanations. Acts as a presentation title slide.
- **Info icon ⓘ** — permanently available, placed outside of card, on its top right corner, not overlaying the card. On click, it shows deck info and explains gestures (swipe/click/arrows).
- Front side contains word and transcription if provided.
- Back side contains translation and context if provided.

## Navigation and Interaction

- **Touch Swipe (Mobile)** — implemented as a "photo gallery slider": the entire row of cards (`track`) moves with the user's finger in real-time. The adjacent card gradually appears from the edge.
- **Edge resistance** — swiping on the first/last card applies "friction" (coefficient 0.35), signaling the end of the deck, similar to native mobile galleries.
- **Swipe threshold** — 18% of the card's width; if swiped less, the card smoothly snaps back to the center.
- **Click/Tap on the card** — flips between front and back (`front` ↔ `back` + `context`).
- **Desktop / Mouse interaction**:
  - **No mouse dragging** — dragging via mouse has been explicitly removed so users can freely highlight and select text inside the cards (e.g., to copy into a dictionary).
  - **Visual Arrows** — two additional UI arrow buttons (Left / Right) are added to the layout (outside the card) to allow mouse users to navigate back and forth easily.
- **Keyboard** — Left/Right (←/→) arrows navigate between cards; Enter/Space on a focused card flips it.

For later versions:
- Swipe up or key up on desktop for words that are easy
- swipe down or key down on desktop for words that are still hard

## Library Architecture from previous implemenation

A single, reusable JS class, avoiding HTML copy-pasting for every deck:

```js
new FlashcardDeck('#container', DECK_DATA.cards, {
  accentColor: '#4a6fa5',
  aspectRatio: [4, 3],
  // ...
});
```

- The class injects its own styles into `<head>` once (using a `stylesInjected` flag), and builds all HTML inside the provided container.
- Public method `goTo(index)` for programmatic navigation.
- Private methods are prefixed with `_` (e.g., `_buildDOM`, `_sizeCard`, `_bindEvents`).
- CSS classes are prefixed with `fc-` to prevent conflicts with the rest of the page.
- The container takes up the full screen (`100dvh`) — designed for dedicated deck pages (e.g., hosted on GitHub Pages), rather than being embedded into long text articles.

## Accessibility (a11y)

- `tabindex="0"`, `role="button"`, and `aria-label` applied to every card.
- **Screen Reader Support on Flip**: When a card is flipped, JS toggles the `aria-expanded="true/false"` attribute. The container holding the back content includes `aria-live="polite"` so screen readers automatically announce the translation/explanation upon flipping.
- Keyboard navigation (Enter/Space to flip, arrows to paginate).
- `e.preventDefault()` on the Space key to prevent unwanted page scrolling.

## Deployment & Data Storage

- **Storage Format (Avoiding CORS issues):** Decks should NOT be stored as `.json` files. If a user opens the HTML file locally (`file://`), browsers will block `fetch('deck.json')` due to CORS policies.
  - **Solution:** Store data in separate `.js` files assigned to a global variable.
    ```javascript
    // deck-german.js
    const DECK_DATA = {
      deckTitle: "German Words",
      cards: [ ... ]
    };
    ```
  - In `index.html`, load the library, then the data, then initialize:
    ```html
    <script src="flashcards.js"></script>
    <script src="deck-german.js"></script>
    <script>
      const deck = new FlashcardDeck('#app', DECK_DATA.cards); 
    </script>
    ```
- **Android `content://` URI issue:** Opening local HTML files via Android file managers often uses `content://` instead of `file://`, breaking relative paths. Using the multi-file setup (described above) requires testing via a real local server (like `python -m http.server`) or direct hosting (GitHub Pages) over HTTPS.
- **Claude AI Artifacts limitations:** Artifacts run inside iframes with strict CSPs and cannot execute `fetch()` to external APIs. Keep this in mind for any companion tools (like AI content generators).

## Ordering
- **Shuffle cards** on every visit to the deck.
- In later versions order regarding review block if exists or randomly if not.

## Backlog (Future Features)

- **"Know / Don't know" (Session level)** — basic tier: within a single session, a "Don't know" card is queued to reappear later in the deck (no persistence between visits).
- **Save progress in `localStorage`** — the deck remembers which cards were easy and which were hard between visits.
- **Visited decks history** — a separate catalog page showing all decks the user has ever opened in this browser.
- **Global Personal Dictionary** — saving cards from different decks into a shared `localStorage` pool.
   - **Handling Duplicates:** Use the card's stable key (e.g. slug(word) + index: laufen1, laufen2, etc.) for deduplication. This ensures that the same word with different meanings across multiple decks (e.g., "Zelle" meaning "biological cell" vs "table cell") won't overwrite each other.
