# Flashcard Library Requirements

**Status:** specification · **Applies to:** `library/` · **Requirement IDs:** `LIB-*`

Every normative statement carries a stable ID (`LIB-4.2`). Task specs in [`../tasks/`](../tasks/) cite these
IDs, and tests are expected to name them. IDs are never reused or renumbered — a withdrawn requirement is
marked *(withdrawn)* rather than deleted.

Decisions that shaped this document are recorded in [`../decisions/`](../decisions/).

---

## 1. Purpose

**LIB-1.1** The library is a reusable JavaScript/TypeScript component for displaying and interacting with
flashcards.

**LIB-1.2** The library is agnostic about the source, format, and semantic meaning of its content.

**LIB-1.3** The library must work with language-learning cards as well as non-language content such as
questions/answers, definitions, facts, and terminology.

**LIB-1.4** The library is responsible for **presentation and interaction** only. It is not responsible for
content management or for storing learning data.

**LIB-1.5** The library reports user interactions to the host application through callbacks (§6) and never
persists anything itself.

---

## 2. Input Data

**LIB-2.1** The library receives an array of fully resolved flashcard objects.

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
}
```

**LIB-2.2** `front.text` is the primary content displayed on the front; `front.details` is optional secondary
content. `back.text` and `back.details` are the equivalents for the back.

**LIB-2.3** The library assigns no semantic meaning to these fields. `details` may hold pronunciation, an
explanation, an example, a hint, or any other secondary information.

**LIB-2.4** The library must not require fields such as: word, translation, transcription, language, source,
deck, or card ID.

**LIB-2.5** Objects passed to the library **may carry additional properties** (for example the application's
own `id`). The library ignores unknown properties, and must not depend on their presence or absence.
*Resolves the mismatch between this document and `APP-3.x`, where cards do carry an identifier.*

**LIB-2.6** The library must never mutate the card objects it is given. Interaction state (which side is
showing, which card is current) lives in the library instance, not on the caller's data.

**LIB-2.7** Card identity **inside the library is positional** — a card is addressed by its index in the input
array. The application knows which logical card sits at each index because it built the array, so no
identifier field is needed at this boundary.

**LIB-2.8** `lastUpdate` is **not** part of the library's card model. It is application metadata and was
removed because the library never renders or uses it.

**LIB-2.9** An empty array is valid input (see `LIB-4.14`).

---

## 3. Content Formatting and Security

**LIB-3.1** Card content is treated as plain text.

**LIB-3.2** HTML formatting is not supported by the card content model.

**LIB-3.3** Card content must never be interpreted as HTML.

**LIB-3.4** Implementation rule making `LIB-3.3` testable: card content is written to the DOM using
`textContent` (or an equivalent text node API) only. `innerHTML`, `insertAdjacentHTML`, and template-string
HTML construction must not be used anywhere in the card content rendering path.

**LIB-3.5** Characters such as `&`, `<`, and `>` render as literal text and cannot break the layout or inject
markup. A card whose text is `<img src=x onerror=alert(1)>` must display that string verbatim.

**LIB-3.6** Newlines (`\n`) in card content are preserved visually via `white-space: pre-wrap`. No other
formatting is interpreted.

**LIB-3.7** The same plain-text rule applies to application-supplied title and information content (§4.5,
§4.6). The library exposes no HTML-accepting input.

---

## 4. Appearance and Layout

### 4.1 Card

**LIB-4.1** The layout is strictly minimal; the card is the primary visual element.

**LIB-4.2** No persistent headers or source subtitles are layered over the card.

**LIB-4.3** The default card aspect ratio is **4:3** (width:height).

**LIB-4.4** The aspect ratio is configurable.

### 4.2 Card sizing

**LIB-4.5** Card size is calculated explicitly in JavaScript, in integer pixels, rather than relying on CSS
`aspect-ratio`.

**LIB-4.6** The size is computed by this formula, where `vw`/`vh` are the viewport dimensions and `ar` is the
configured aspect ratio:

```
isLandscape = vw >= vh
maxH        = vh * (isLandscape ? landscapeHeightRatio : portraitHeightRatio)
width       = floor(min(vw * widthRatio, maxWidthPx, maxH * ar.w / ar.h))
height      = round(width * ar.h / ar.w)
```

**LIB-4.7** Defaults: `widthRatio = 0.90`, `portraitHeightRatio = 0.75`, `landscapeHeightRatio = 0.88`,
`maxWidthPx = 480`. All four are configurable.

**LIB-4.8** Orientation is determined in JavaScript as `innerWidth >= innerHeight`, not by a CSS
`orientation` media query, so the CSS and the sizing math can never disagree.

**LIB-4.9** The card must not overflow the available viewport.

**LIB-4.10** Size is recomputed on viewport resize and orientation change, throttled to at most once per
animation frame. Where `window.visualViewport` is available it is the source of the viewport dimensions, so
that an on-screen keyboard or browser UI chrome is accounted for.

### 4.3 Typography

**LIB-4.11** Font sizes derive from the calculated card width, which JavaScript publishes as a CSS custom
property (`--fc-card-w`). Card text is sized with `calc(var(--fc-card-w) * k)`.

**LIB-4.12** Default scale factors: `front.text`/`back.text` `k = 0.085`; `details` `k = 0.05`. Configurable.

**LIB-4.13** Font size must not depend directly on `vw`, because that causes avoidable reflow on orientation
change.

**LIB-4.14** Overflow strategy for content taller than the card: the text auto-shrinks in bounded steps down
to 60 % of its base size; if it still does not fit, the content area scrolls (see `LIB-5.9` for how this
interacts with vertical gestures). Content is never clipped without a way to reach it.

### 4.4 Navigation indicators

**LIB-4.15** Position indicators are displayed below the card and never overlay it.

**LIB-4.16** With `n ≤ dotLimit` cards, dot indicators are shown. Above that, a compact counter
(`3 / 42`) is shown instead. `dotLimit` defaults to `12` and is configurable.

**LIB-4.17** With a single card, indicators are hidden.

**LIB-4.18** With an empty deck the library renders an empty-state message, binds no gestures, and does not
throw. `goTo` is a no-op.

### 4.5 Title / introduction

**LIB-4.19** The library supports an optional introductory/title screen shown before the first card.

**LIB-4.20** The title screen is an **overlay**, not a slide in the card track. Card indices, indicator
counts, and `goTo` arguments are unaffected by its presence.

**LIB-4.21** It is dismissed by tap/click, `Enter`, `Space`, or `→`, after which it cannot reappear for the
life of the instance.

**LIB-4.22** It may display a deck/application title or cover text. It does not contain gesture explanations.

**LIB-4.23** The title screen is presentation-only and forms no part of the flashcard data.

**LIB-4.24** The library holds **no persistence** for "show this only once". The application decides whether
to pass title configuration on any given mount; when it is absent, no title screen appears. *This keeps
`localStorage` and session flags out of the library entirely.*

### 4.6 Information panel

**LIB-4.25** An information control (`ⓘ`) is permanently available outside the card, near its top-right,
without overlaying the card.

**LIB-4.26** Activating it opens a modal panel that is focus-trapped and closes on `Esc`, on a close control,
and on click outside.

**LIB-4.27** Panel content has two parts: **application-supplied text** (deck description, credits, anything
the app wants) and a **library-generated interaction help section** listing the interactions that are
actually enabled on the current device and configuration.

**LIB-4.28** The application never has to describe gestures, and the library never hard-codes deck-specific
content. *This resolves the contradiction between "the library explains supported interactions" and "content
is supplied by the application".*

### 4.7 Faces

**LIB-4.29** The front shows `front.text`, and `front.details` when provided.

**LIB-4.30** The back shows `back.text`, and `back.details` when provided.

**LIB-4.31** `category` is rendered as a small label on the card only when `showCategory: true`. The default
is `false`.

### 4.8 Theme

**LIB-4.32** `accentColor` affects the active indicator, the arrow buttons, the focus ring, and the
information control. It is also published as `--fc-accent`.

**LIB-4.33** Every colour the library uses is defined as a `--fc-*` custom property on the container, so the
application can retheme without patching library CSS.

**LIB-4.34** Automatic `prefers-color-scheme` support is an explicit non-goal for v1. Dark presentation is
achieved by the application overriding the custom properties from `LIB-4.33`.

### 4.9 Motion

**LIB-4.35** Flip animation: `rotateY` over 300 ms. Snap/settle animation after a gesture: 250 ms. While a
pointer is down and dragging, the track has no transition and follows the pointer directly.

**LIB-4.36** Under `prefers-reduced-motion: reduce`, flips and navigation are applied instantly with no
transition. All other behaviour is unchanged.

---

## 5. Navigation and Interaction

**LIB-5.1** Pointer Events are the single input path. There is no separate mouse and touch implementation.

### 5.1 Horizontal navigation (touch)

**LIB-5.2** Horizontal dragging behaves like a native photo-gallery slider: the whole card track follows the
pointer in real time and the adjacent card becomes progressively visible during the gesture.

**LIB-5.3** An adjacent card revealed mid-gesture shows whichever side it is currently on (see `LIB-5.14`).

**LIB-5.4** Navigation does not wrap. There is no card after the last one.

**LIB-5.5** Dragging beyond the first or last card applies resistance with a friction coefficient of `0.35`
(configurable), giving visual feedback that an end has been reached.

**LIB-5.6** The commit threshold is `18 %` of the card width (configurable). Below the threshold the track
animates back to the current card; at or above it, the deck advances by one card.

**LIB-5.7** A completed horizontal gesture must not also trigger a flip.

### 5.2 Vertical grading gestures

**LIB-5.8** Swipe up marks the current card **easy**; swipe down marks it **difficult**. Both emit `onGrade`
(§6) and are accompanied by brief visual feedback. The library itself stores no grade.

**LIB-5.9** The gesture axis is locked at the start of movement: if `|dx| > |dy|` the gesture is horizontal
navigation, otherwise it is a vertical grade. The axis does not change mid-gesture.

**LIB-5.10** Vertical gestures are suppressed while the card's content area is actually scrollable and not at
the corresponding scroll boundary, so long text scrolls and short cards grade. `touch-action` is `none` on
the card and `pan-y` on a scrollable content area.

**LIB-5.11** The vertical commit threshold is `15 %` of card height (configurable). Below it, the card
springs back with no event.

> Vertical grading was outside the initial scope in earlier drafts. It moved into v1 because it became the
> application's only mechanism for recording difficulty — see [`../decisions/D1-library-events.md`](../decisions/D1-library-events.md).

### 5.3 Flip

**LIB-5.12** A tap or click on the card flips it between front and back.

**LIB-5.13** A flip is committed on pointer-up only when **all** of: total pointer movement `< 8 px`, press
duration `< 500 ms`, and the current text selection is collapsed. This is what allows text to be selected by
dragging across a card without the release flipping it. *Resolves the conflict between "mouse dragging is not
supported", "text must be freely selectable", and "clicking flips".*

**LIB-5.14** Flip state is **per card** and persists for the life of the instance: navigating away from a
flipped card and returning shows it still flipped.

**LIB-5.15** On touch devices, long-press text selection is permitted and cancels any pending flip through
the same rule as `LIB-5.13`.

### 5.4 Desktop / mouse

**LIB-5.16** Mouse dragging is not a navigation mechanism.

**LIB-5.17** Users must be able to freely select and copy text from the card.

**LIB-5.18** Left and Right arrow buttons are displayed outside the card and navigate between cards.

### 5.5 Keyboard

**LIB-5.19** `←` / `→` navigate between cards.

**LIB-5.20** `Enter` / `Space` flip the focused card.

**LIB-5.21** `↑` / `↓` are the keyboard equivalents of the grading gestures (`LIB-5.8`).

**LIB-5.22** `Space` must not scroll the page when used to flip a card; the handler calls `preventDefault()`.

**LIB-5.23** Keyboard listeners are bound to the deck container, never to `document`. Two decks on one page
therefore never compete for arrow keys — the focused deck responds.

---

## 6. Library API

**LIB-6.1** The library exposes a `FlashcardDeck` class.

```js
const deck = new FlashcardDeck("#app", cards, {
  accentColor: "#4a6fa5",
  aspectRatio: [4, 3],
  onCardShown: (index) => { /* … */ },
  onGrade: (index, grade) => { /* … */ }
});
```

**LIB-6.2** Sensible defaults make a minimal initialization possible: `new FlashcardDeck("#app", cards)`.

### 6.1 Methods

```ts
goTo(index: number, options?: { animate?: boolean }): void;
getState(): { index: number; side: "front" | "back"; count: number };
destroy(): void;
```

**LIB-6.3** `goTo` clamps out-of-range indices to the valid range and is a no-op on an empty deck. It defaults
to `animate: false`.

**LIB-6.4** `getState` returns the current position and visible side, for hosts that prefer polling to
callbacks.

**LIB-6.5** `destroy` removes all listeners (including the container's keyboard handler and the viewport
resize handler), cancels pending timers and animation frames, and empties the container. Calling it twice is
safe. *It exists because the library binds listeners outside its own DOM, and because the application
re-mounts a deck when switching between a deck and the collection.*

**LIB-6.6** Additional public methods are introduced only when there is a concrete use case.

### 6.2 Callbacks

**LIB-6.7** All callbacks are optional configuration functions. The library has no event-emitter API and no
DOM `CustomEvent`s in v1.

```ts
onCardShown?: (index: number) => void;
onFlip?: (index: number, side: "front" | "back") => void;
onGrade?: (index: number, grade: "easy" | "hard") => void;
```

**LIB-6.8** `onCardShown` fires when a card has settled as the current card for **≥ 400 ms**, or as soon as it
is flipped — whichever happens first. This prevents a fast swipe through ten cards from reporting ten views.

**LIB-6.9** `onCardShown` fires at most once per card per instance lifetime.

**LIB-6.10** `onFlip` fires on every flip, reporting the side now visible.

**LIB-6.11** `onGrade` fires on a committed vertical gesture or `↑`/`↓` key.

**LIB-6.12** A callback that throws must not corrupt the library's internal state or break the deck; the
library isolates callback invocation.

**LIB-6.13** The library renders **no application-defined controls**. There are no action slots, no save
button, and no host-supplied buttons around the card. Applications that need such affordances render them in
their own DOM, outside the library container, driven by these callbacks.

### 6.3 Configuration

**LIB-6.14** Configuration covers: accent colour; aspect ratio; the sizing limits of `LIB-4.7`; typography
scale factors; `dotLimit`; `showCategory`; friction and thresholds; title content; information content;
callbacks; `injectStyles`.

**LIB-6.15** Invalid configuration values fall back to the documented default, and the library warns once via
`console.warn`. Construction never throws for a bad option.

---

## 7. Architecture

**LIB-7.1** The library is a single reusable class with the public API of §6.

**LIB-7.2** The library builds its own DOM structure inside the supplied container.

**LIB-7.3** The library does not assume any application framework.

**LIB-7.4** The library injects its styles into `<head>` once, as a single `<style data-fc-styles>` element.

**LIB-7.5** Duplicate injection is prevented by checking for that element in the DOM, not only by a
module-level flag — two copies of the module on one page must still produce one style element.

**LIB-7.6** `injectStyles: false` suppresses injection for hosts with a strict Content-Security-Policy; those
hosts link the shipped `flashcards.css` instead. The stylesheet is part of the published package.

**LIB-7.7** Shadow DOM is not used in v1: it would complicate application theming (`LIB-4.33`) and text
selection across the card boundary.

**LIB-7.8** Private methods use a consistent `_` prefix, e.g. `_buildDOM`, `_sizeCard`, `_bindEvents`.

**LIB-7.9** CSS classes are prefixed `fc-`.

**LIB-7.10** The library fills the container it is given (100 % width and height). **The application owns page
layout** — a dedicated deck page sets `height: 100dvh` on the container itself. The library never sets
viewport-relative heights on elements it does not own. *Resolves the disagreement between the old and current
drafts over who sets `100dvh`.*

### 7.1 Data loading boundary

**LIB-7.11** The library does not load card data. It receives `Flashcard[]` and is responsible only for
displaying and interacting with those cards.

**LIB-7.12** The data may have come from JavaScript modules, JSON, CSV, an API, IndexedDB, `localStorage`, a
database, or any other application-specific source. The library must not depend on any of these.

---

## 8. Accessibility

**LIB-8.1** The deck container has `role="group"` and `aria-roledescription="flashcard deck"`.

**LIB-8.2** Each card is focusable (`tabindex="0"`) with `role="button"` and an accessible label of the form
`"Card 3 of 42, front"`.

**LIB-8.3** A visually hidden `aria-live="polite"` region announces **only the newly revealed side's text**
when a card is flipped — not the whole card, and not unrelated content.

**LIB-8.4** Arrow controls and dot indicators are real `<button>` elements with accessible labels
(`"Previous card"`, `"Go to card 4"`).

**LIB-8.5** Keyboard support is as specified in §5.5, including `Space` not scrolling the page.

**LIB-8.6** Focus follows navigation: after moving to another card, that card receives focus, so keyboard and
screen-reader users stay oriented.

**LIB-8.7** Focus is visible at all times; the focus ring uses `--fc-accent` and is never removed without a
replacement.

**LIB-8.8** The information panel traps focus while open and restores focus to the `ⓘ` control on close.

**LIB-8.9** These attributes are a floor, not a ceiling: a better semantic implementation may replace them,
provided the behaviours in `LIB-8.2`–`LIB-8.8` still hold.

---

## 9. Environment

**LIB-9.1** Target baseline: the last two versions of Chrome, Edge, Firefox, and Safari; iOS Safari 16.4+;
Android Chrome.

**LIB-9.2** The library requires no backend.

**LIB-9.3** The library requires no user authentication.

**LIB-9.4** The library ships as ES modules with TypeScript declarations, plus a standalone stylesheet
(`LIB-7.6`).

**LIB-9.5** The library has no runtime dependencies.

**LIB-9.6** Right-to-left: the library's own chrome uses logical CSS properties. Arrow *keys* keep their
visual meaning in v1 (`←` = previous) regardless of `dir`. This is a documented limitation, not an oversight.

---

## 10. Non-Responsibilities

**LIB-10.1** The library does not manage: card storage; card identifiers; filenames; CSV or JSON files; deck
definitions; vocabulary dictionaries; translations; languages; user accounts; login; `localStorage`; review
scheduling; spaced repetition; user progress; visited-deck history; or content-source metadata.

**LIB-10.2** The library does not persist anything — not even which cards have been seen or graded. It reports
interactions and forgets them.

**LIB-10.3** Audio and images are out of scope for v1.

**LIB-10.4** Everything in `LIB-10.1`–`LIB-10.3` belongs to the application layer described in
[`../app/requirements.md`](../app/requirements.md).
