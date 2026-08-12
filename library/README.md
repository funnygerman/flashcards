# @flashcards/library

The reusable `FlashcardDeck` presentation component. Specification:
[`docs/library/requirements.md`](../docs/library/requirements.md) (`LIB-*` requirement IDs).

**Status: feature-complete for M1** ([T-01](../docs/tasks/T-01-types-and-config.md) …
[T-10](../docs/tasks/T-10-public-api.md)). A live demo is at [`demo/index.html`](demo/index.html) — see
[Demo](#demo) below.

## Install / import

No package registry yet — the application consumes this workspace directly through an import map
([D4](../docs/decisions/D4-typescript-no-bundler.md)):

```html
<script type="importmap">
  { "imports": { "@flashcards/library": "./path/to/library/dist/index.js" } }
</script>
```

For hosts with a strict `style-src` CSP that can't accept the injected `<style>` (`LIB-9.4`), the compiled
stylesheet is also published standalone at `@flashcards/library/flashcards.css` — pair it with
`injectStyles: false`.

## Public API

This is the complete public surface — everything else in the package is internal (`LIB-6.6`).

### `new FlashcardDeck(target, cards, options?)`

- `target: string | Element` — a CSS selector or a live element. A selector that matches nothing throws.
- `cards: Flashcard[]` — see `Flashcard` below. An empty array is valid (`LIB-6.2`); the deck shows an
  empty-state message and no interaction is possible.
- `options?: DeckOptions` — all fields optional; an invalid value falls back to its documented default and
  warns once via `console.warn` (`LIB-6.15`). Construction never throws over configuration.

```ts
interface Flashcard {
  front: { text: string; details?: string };
  back: { text: string; details?: string };
  category?: string;
}

type Side = "front" | "back";
type Grade = "easy" | "hard";

interface TitleConfig {
  text: string;
  subtitle?: string;
}

interface InfoConfig {
  heading?: string;
  body?: string;
}

interface DeckOptions {
  accentColor?: string; // no override — the stylesheet's own default applies
  aspectRatio?: [number, number]; // [4, 3]
  widthRatio?: number; // 0.90
  portraitHeightRatio?: number; // 0.75
  landscapeHeightRatio?: number; // 0.88
  maxWidthPx?: number; // 480
  textScale?: number; // 0.085
  detailsScale?: number; // 0.05
  dotLimit?: number; // 12 — dots up to this many cards, a counter above it
  showCategory?: boolean; // false
  friction?: number; // 0.35 — resistance past the first/last card
  swipeThreshold?: number; // 0.18 — fraction of card width to commit navigation
  gradeThreshold?: number; // 0.15 — fraction of card height to commit a grade
  injectStyles?: boolean; // true — set false alongside the standalone stylesheet above
  title?: TitleConfig; // an optional overlay shown before the first card
  info?: InfoConfig; // application text shown alongside the always-available ⓘ panel
  onCardShown?: (index: number) => void;
  onFlip?: (index: number, side: Side) => void;
  onGrade?: (index: number, grade: Grade) => void;
}
```

### Methods

- **`goTo(index: number, options?: { animate?: boolean }): void`** — navigates to `index`, clamped to the
  deck's valid range; a no-op on an empty deck. `animate` defaults to `false` (`LIB-6.3`).
- **`getState(): { index: number; side: Side; count: number }`** — the current position, visible side, and
  card count, for hosts that prefer polling to callbacks (`LIB-6.4`).
- **`destroy(): void`** — removes every listener, timer, and observer the deck added, and empties the
  container. Safe to call more than once (`LIB-6.5`).

### Callbacks

All three are optional, plain functions — there is no event-emitter API and no DOM `CustomEvent`s (`LIB-6.7`).
A callback that throws is caught; it cannot corrupt the deck's internal state or stop later
navigation/flips/grades from working (`LIB-6.12`).

- **`onCardShown(index)`** — fires once a card has been the current one, settled, for **≥ 400ms**. Flipping the
  card before 400ms elapses fires it immediately instead of waiting. Fires at most once per card for the life
  of the instance — swiping quickly through many cards fires it only for the ones actually settled on, and
  returning to an already-reported card never fires it again (`LIB-6.8`, `LIB-6.9`).
- **`onFlip(index, side)`** — fires on every flip (tap/click or Enter/Space), reporting the side now visible
  (`LIB-6.10`).
- **`onGrade(index, grade)`** — fires on every committed vertical swipe or `↑`/`↓` key, with `"easy"` (up) or
  `"hard"` (down) (`LIB-6.11`).

### What's out of scope

The library renders no application-defined controls — no action slots, no host-supplied buttons (`LIB-6.13`).
It reads and writes no storage of any kind and makes no network requests, ever (`LIB-10.1`, `LIB-10.2`); card
storage, IDs, spaced-repetition scheduling, and persistence are entirely the application's job
(`LIB-10.1`–`LIB-10.4`).

## Demo

[`demo/index.html`](demo/index.html) mounts a real `FlashcardDeck` from `../dist/index.js` with a small sample
deck defined in [`demo/cards.js`](demo/cards.js) — a library-only showcase with no routing, no content
pipeline, and no application code, distinct from the application's own demo deck (T-20's `everyday-german`,
mounted in T-31). Requires a real HTTP server (`npm run build` then `npm run serve`, or any static server
pointed at the repository root) — `file://` is not supported. It's also published continuously to GitHub Pages
alongside the app (see [T-00b](../docs/tasks/T-00b-pages-deploy.md)).

## Design constraints

- No runtime dependencies (`LIB-9.5`).
- Presentation and interaction only — it stores nothing, not even which cards have been seen (`LIB-10.2`).
- Plain ESM plus `.d.ts`, compiled by `tsc` with no bundler
  ([D4](../docs/decisions/D4-typescript-no-bundler.md)).
- Relative imports must carry explicit `.js` extensions — `nodenext` resolution enforces this, because the
  browser loads the output directly.
- Targets the last two versions of Chrome, Edge, Firefox, and Safari; iOS Safari 16.4+ (`LIB-9.1`). No backend,
  no authentication (`LIB-9.2`, `LIB-9.3`).
- The deck's own chrome uses logical CSS properties for RTL; arrow *keys* keep their literal left/right meaning
  regardless of text direction (`LIB-9.6`).

## Commands

Run from the repository root:

```sh
npm run build     # tsc → dist/ (ESM + .d.ts + flashcards.css)
npm test          # Vitest, against src/ rather than dist/
npm run lint      # ESLint + typecheck
```
