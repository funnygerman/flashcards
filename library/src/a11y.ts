/**
 * ARIA attributes and accessible names for the deck chrome (T-08).
 *
 * See docs/library/requirements.md §8 (LIB-8.1–LIB-8.9). Pure formatting
 * and attribute-setting helpers only — no event wiring, no focus movement;
 * those stay in `index.ts` where the deck's state lives.
 */

import type { Flashcard, Side } from "./types.js";

export const PREV_ARROW_LABEL = "Previous card";
export const NEXT_ARROW_LABEL = "Next card";

/** LIB-8.2: `"Card 3 of 42, front"`. `index` is 0-based; the label is
 * 1-based, matching the counter indicator's own `3 / 42` formatting. */
export function formatCardLabel(index: number, count: number, side: Side): string {
  return `Card ${index + 1} of ${count}, ${side}`;
}

/** LIB-8.4: `"Go to card 4"`. */
export function formatDotLabel(index: number): string {
  return `Go to card ${index + 1}`;
}

/** LIB-8.2: applies role, accessible label, and roving `tabindex` to one
 * card element. Only the current card is `tabindex="0"`; the rest are
 * `-1` so Tab does not visit cards that are not the one on screen — the
 * label alone can't convey "position changed" if every card stayed in the
 * tab order at once. */
export function applyCardA11y(cardEl: Element, index: number, count: number, side: Side, isCurrent: boolean): void {
  cardEl.setAttribute("role", "button");
  cardEl.setAttribute("aria-label", formatCardLabel(index, count, side));
  cardEl.setAttribute("tabindex", isCurrent ? "0" : "-1");
}

/** LIB-8.3: the text a flip announces — the newly revealed side's own
 * `text`, never `details`, the whole card, or anything else on the page. */
export function revealedSideText(card: Flashcard, side: Side): string {
  return side === "front" ? card.front.text : card.back.text;
}
