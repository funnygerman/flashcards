# T-08 — Accessibility layer

**Milestone:** M1 · **Depends on:** T-05, T-07 · **Blocks:** T-10
**Requirements covered:** `LIB-5.21`, `LIB-5.23`, `LIB-8.1`–`LIB-8.9`

## Goal

Make the deck usable by keyboard and screen reader, with a concrete semantic model rather than "appropriate
ARIA".

## Public contract

No public API change. Attributes and focus behaviour become part of the observable contract.

## Acceptance criteria

1. **Given** the container, **then** it has `role="group"` and `aria-roledescription="flashcard deck"`
   (`LIB-8.1`).
2. **Given** a card, **then** it is `tabindex="0"`, `role="button"`, labelled `"Card 3 of 42, front"`, and the
   label updates when the side or position changes (`LIB-8.2`).
3. **Given** a flip, **then** a visually hidden `aria-live="polite"` region announces **only** the newly
   revealed side's text — not the whole card, not unrelated content (`LIB-8.3`).
4. **Given** arrows and dots, **then** they are real `<button>` elements named `"Previous card"`,
   `"Next card"`, `"Go to card 4"` (`LIB-8.4`).
5. **Given** navigation by any means, **then** focus moves to the newly current card (`LIB-8.6`).
6. **Given** any focusable element, **then** focus is visibly indicated using `--fc-accent`, and no rule
   removes the outline without replacing it (`LIB-8.7`).
7. **Given** `↑` / `↓` on a focused card, **then** they grade it exactly as the vertical gestures do
   (`LIB-5.21`).
8. **Given** two decks on one page, **when** arrow keys are pressed, **then** only the deck containing focus
   responds — listeners are on the container, never on `document` (`LIB-5.23`).
9. **Given** the information panel is open, **then** focus is trapped inside it and returns to the `ⓘ` control
   on close (`LIB-8.8`).
10. **Given** an alternative semantic implementation, **then** it is acceptable provided every behaviour above
    still holds (`LIB-8.9`).

## Test plan

Playwright with `@axe-core/playwright` for a zero-violations baseline, plus explicit tests for: live-region
content after a flip (asserting the announced string is the revealed side alone), focus following navigation,
the two-deck keyboard isolation case, and the info panel focus trap. jsdom covers label formatting.

## Out of scope

Screen-reader-specific verification on real assistive technology, which is manual and tracked separately.
