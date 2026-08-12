# T-03 — DOM skeleton, styles, and teardown

**Milestone:** M1 · **Depends on:** T-01 · **Blocks:** T-04 … T-09
**Requirements covered:** `LIB-4.1`, `LIB-4.2`, `LIB-4.32`–`LIB-4.34`, `LIB-6.5`, `LIB-7.1`–`LIB-7.10`,
`LIB-9.4`

## Goal

Build the library's DOM structure, inject its styles once, and tear everything down cleanly. After this task
the deck renders N blank cards with no interaction.

## Public contract

```ts
class FlashcardDeck {
  constructor(target: string | Element, cards: Flashcard[], options?: DeckOptions);
  destroy(): void;
}
```

DOM shape inside the container:

```html
<div class="fc-root">
  <div class="fc-viewport"><div class="fc-track"><div class="fc-card">…</div>…</div></div>
  <div class="fc-indicators"></div>
  <button class="fc-arrow fc-arrow--prev"></button>
  <button class="fc-arrow fc-arrow--next"></button>
  <button class="fc-info"></button>
</div>
```

`.fc-viewport` is the fixed one-card-wide clipping window (`overflow: hidden`);
`.fc-track` is the sliding reel inside it that holds every `.fc-card` and
carries the paging `translateX`. A `transform` moves an element's whole box,
clip region included, so the two roles can't be the same element (`LIB-5.2`).

## Acceptance criteria

1. **Given** a selector or an element, **when** constructing, **then** the structure is built inside it and
   nothing outside the container is modified except the injected `<style>` (`LIB-7.2`).
2. **Given** two decks constructed on one page, **then** `<head>` contains exactly one
   `<style data-fc-styles>` (`LIB-7.4`, `LIB-7.5`).
3. **Given** two separately imported copies of the module, **then** there is still exactly one style element —
   the guard is a DOM query, not only a module flag (`LIB-7.5`).
4. **Given** `injectStyles: false`, **then** no style element is created and the deck still builds
   (`LIB-7.6`).
5. **Given** a constructed deck, **when** `destroy()` runs, **then** the container is empty, every listener
   the library added (including on the container and the viewport) is removed, and pending timers and
   animation frames are cancelled (`LIB-6.5`).
6. **Given** a destroyed deck, **when** `destroy()` is called again, **then** nothing throws (`LIB-6.5`).
7. **Given** the rendered output, **then** every class name begins `fc-` (`LIB-7.9`), and every colour is
   defined as a `--fc-*` custom property on `.fc-root` (`LIB-4.33`).
8. **Given** `accentColor`, **then** `--fc-accent` reflects it (`LIB-4.32`).
9. **Given** the container, **then** the library sets width and height to 100 % and never sets a
   viewport-relative height (`LIB-7.10`).
10. **Given** the stylesheet, **then** no `prefers-color-scheme` rule exists — theming is the application's
    job (`LIB-4.34`).
11. **Given** the built package, **then** it exports ESM with `.d.ts` and ships `flashcards.css` (`LIB-9.4`).

## Test plan

jsdom tests for structure, single style injection (including a re-imported module), teardown completeness
(spy on `addEventListener`/`removeEventListener` and assert they balance), and the container-height rule.

## Out of scope

Card content (T-04), any interaction (T-05, T-06), indicators and arrow behaviour (T-07) — the elements exist
here but do nothing.
