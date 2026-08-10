
# Flashcard Library Requirements

## 1. Purpose

* A generalized, reusable JavaScript library for displaying and interacting with flashcards.
* The library must be completely agnostic about the source, format, and semantic meaning of its content.
* The library should work with language-learning cards as well as non-language content such as questions/answers, definitions, facts, terminology, etc.
* The library is responsible for **presentation and interaction**, not for content management or learning-data storage.

## 2. Input Data

The library receives an array of fully resolved flashcard objects.

```ts
interface Flashcard {
  front: {
    text: string;
    details?: string;
  };

  back: {
    text: string;
    details?: string;
  };

  category?: string;
  lastUpdate?: string;
}
```

### Semantics

* `front.text` is the primary content displayed on the front.
* `front.details` is optional secondary content.
* `back.text` is the primary content displayed on the back.
* `back.details` is optional secondary content.
* The library does not assign any semantic meaning to these fields.
* For example, `details` may contain pronunciation, an explanation, an example, a hint, or any other secondary information.

The library must not require fields such as:

* word
* translation
* transcription
* language
* source
* deck
* card ID

## 3. Content Formatting and Security

* Card content is treated as plain text.
* HTML formatting is not supported by the core card content model.
* Card content must never be interpreted as HTML.
* Characters such as `&`, `<`, and `>` must be safely rendered as text so that card content cannot break the layout or inject markup.

## 4. Appearance and Layout

### Card

* Strictly minimal layout.
* The card is the primary visual element.
* No persistent headers or source subtitles are layered over the card.
* The default card aspect ratio is **4:3**.
* The aspect ratio must be configurable.

### Card sizing

Card size is calculated explicitly using JavaScript rather than relying on CSS `aspect-ratio`.

Default limits:

* `maxWidth = 90%` of viewport width.
* `maxHeight = 75%` of viewport height in portrait mode.
* `maxHeight = 88%` of viewport height in landscape mode.
* Hard maximum width: `480px`.

The card must not overflow the available viewport.

### Typography

* Font size is based on the actual calculated card width.
* The implementation should use a CSS variable or equivalent mechanism set by JavaScript.
* Font size should not depend directly on `vw`, because this can cause unnecessary changes when the device orientation changes.

### Navigation indicators

* Dot/page indicators are displayed below the card.
* Indicators must not overlay the card.

### Front and back

Front:

* `front.text`
* `front.details`, if provided

Back:

* `back.text`
* `back.details`, if provided

### Title / introduction

The library may support an optional introductory/title screen before the first card.

* It is shown only once per configured session.
* It may display a deck/application title or cover.
* It does not contain gesture explanations.
* The title screen is presentation-only and does not form part of the flashcard data.

### Information

* An information icon (`ⓘ`) is permanently available outside the card.
* It is positioned near the top-right of the card without overlaying the card.
* Activating it displays available information and explains supported interactions.

The exact information content is supplied by the application/configuration rather than hard-coded into the library.

## 5. Navigation and Interaction

### Touch

Touch interaction behaves like a native photo-gallery slider.

* The entire card track moves with the user's finger in real time.
* The adjacent card gradually becomes visible during the gesture.
* The current card follows the finger rather than waiting until the gesture is completed.

### Edge resistance

* Swiping beyond the first or last card applies resistance.
* Default friction coefficient: `0.35`.
* This provides visual feedback that the user has reached the beginning or end.

### Swipe threshold

* Default threshold: `18%` of card width.
* If the swipe does not reach the threshold, the card smoothly returns to its original position.
* A successful swipe navigates to the adjacent card.
* A swipe must not accidentally trigger a card flip.

### Tap / click

* Tapping or clicking a card flips it between front and back.
* The implementation must distinguish a tap from a swipe.

### Desktop / mouse

* Mouse dragging is not supported.
* Users must be able to freely select and copy text from the card.
* Visual Left / Right arrow buttons are displayed outside the card.
* The buttons navigate between cards.

### Keyboard

* `←` / `→` navigate between cards.
* `Enter` / `Space` flip the focused card.
* Space must not cause unwanted page scrolling when used to flip a card.

### Future interaction

Possible future interaction:

* Up gesture / Up key → card is easy.
* Down gesture / Down key → card is difficult.

These actions are intentionally outside the initial implementation.

## 6. Library API

The library exposes a reusable `FlashcardDeck` class.

Example:

```js
const deck = new FlashcardDeck("#app", cards, {
  accentColor: "#4a6fa5",
  aspectRatio: [4, 3]
});
```

### Public API

Initial public methods:

```ts
goTo(index: number): void;
```

Additional public methods should only be introduced when there is a concrete use case.

### Configuration

Configuration may include:

* accent color;
* aspect ratio;
* optional title/information content;
* future visual/interaction settings.

The library should provide sensible defaults so a minimal initialization is possible:

```js
new FlashcardDeck("#app", cards);
```

## 7. Architecture

* The library consists of a single reusable JavaScript class or equivalent public API.
* The library creates its own required DOM structure inside the supplied container.
* The library injects its styles into `<head>` once.
* A `stylesInjected` flag or equivalent mechanism prevents duplicate style injection.
* Private implementation methods use a consistent naming convention such as `_buildDOM`, `_sizeCard`, and `_bindEvents`.
* CSS classes are prefixed with `fc-` to minimize conflicts with surrounding applications.
* The library must not assume any particular application framework.

### Data loading boundary

The library does **not** load card data.

It receives:

```text
Flashcard[]
```

and is responsible only for displaying and interacting with those cards.

The data may have originated from:

* JavaScript modules;
* JSON;
* CSV;
* an API;
* IndexedDB;
* localStorage;
* a database;
* any other application-specific source.

The library must not depend on any of these storage mechanisms.

## 8. Accessibility

* Cards are keyboard-focusable.
* Appropriate ARIA semantics are applied to interactive cards.
* Each card has an accessible label.
* Keyboard navigation is supported.
* Enter/Space flips the focused card.
* Left/Right navigates between cards.
* The newly revealed back content should be announced to screen readers using an appropriate live-region mechanism.
* The implementation should avoid unnecessarily announcing unrelated content.
* Space must not scroll the page when it is being used for card interaction.

Accessibility implementation should follow standard ARIA practices rather than relying on a fixed combination of attributes if a better semantic implementation is available.

## 9. Environment

* Designed primarily for modern browsers.
* The library should work on desktop and mobile browsers.
* The main container occupies the available viewport when used as a dedicated flashcard application.
* The library should not require a backend.
* The library should not require user authentication.

## 10. Non-Responsibilities

The core library does **not** manage:

* card storage;
* card identifiers;
* filenames;
* CSV files;
* JSON files;
* deck definitions;
* vocabulary dictionaries;
* translations;
* languages;
* user accounts;
* login;
* localStorage;
* review scheduling;
* spaced repetition;
* user progress;
* visited-deck history;
* content-source metadata.

These belong to the application/data layer built around the library.
