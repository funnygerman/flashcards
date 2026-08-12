/**
 * Card content rendering (T-04).
 *
 * See docs/library/requirements.md §3 (content formatting and security) and
 * §4.3, §4.7 (typography, faces).
 */

import type { Flashcard, ResolvedOptions } from "./types.js";

/** LIB-3.4, LIB-3.7: the only path text ever takes into the DOM in this
 * library — a `textContent` assignment, never an HTML-parsing DOM API or a
 * template-string-built markup fragment — so markup is structurally
 * impossible to inject through card, title, or info content (LIB-3.3,
 * LIB-3.5). Exported so T-09's title/info panel reuses this exact path
 * rather than growing its own. */
export function setPlainText(element: Element, text: string): void {
  element.textContent = text;
}

// LIB-4.14: shrink in bounded 10%-of-base steps down to a 60% floor; beyond
// that the content area scrolls (via `.fc-face-content`'s `overflow-y:
// auto`) rather than clipping content with no way to reach it.
const SHRINK_FLOOR = 0.6;
const SHRINK_STEP = 0.1;

/** Shrinks `content`'s text in bounded steps while it overflows its own box.
 * `scrollHeight`/`clientHeight` are 0 in jsdom absent a stub, so this is a
 * no-op there unless a test stubs them — see rendering.test.ts. */
function shrinkToFit(content: HTMLElement): void {
  let scale = 1;
  while (scale > SHRINK_FLOOR && content.scrollHeight > content.clientHeight) {
    scale = Math.max(SHRINK_FLOOR, scale - SHRINK_STEP);
    content.style.setProperty("--fc-shrink", scale.toFixed(2));
  }
}

/** Renders one face (front or back) of a card into `face`. */
function renderFace(
  face: Element,
  content: { readonly text: string; readonly details?: string },
  category: string | undefined,
  showCategory: boolean,
): void {
  face.replaceChildren();

  // LIB-4.31: category is a small label, shown only when the application
  // opts in and the card actually has one.
  if (showCategory && category !== undefined) {
    const categoryEl = document.createElement("p");
    categoryEl.className = "fc-category";
    setPlainText(categoryEl, category);
    face.append(categoryEl);
  }

  const body = document.createElement("div");
  body.className = "fc-face-content";

  const text = document.createElement("p");
  text.className = "fc-text";
  setPlainText(text, content.text);
  body.append(text);

  if (content.details !== undefined) {
    const details = document.createElement("p");
    details.className = "fc-details";
    setPlainText(details, content.details);
    body.append(details);
  }

  face.append(body);
  shrinkToFit(body);
}

/** LIB-3.1–LIB-3.7, LIB-4.11, LIB-4.12, LIB-4.14, LIB-4.29–LIB-4.31: render
 * `card`'s front and back faces as plain text into `element` (a `.fc-card`).
 * Which face is visible, and any flip transition between them, is T-05's
 * concern — this only builds and fills the two `.fc-face` containers. Safe
 * to call more than once on the same element; it always rebuilds rather
 * than appending. */
export function _renderCard(card: Flashcard, element: Element, options: ResolvedOptions): void {
  element.replaceChildren();

  const front = document.createElement("div");
  front.className = "fc-face fc-face--front";
  renderFace(front, card.front, card.category, options.showCategory);

  const back = document.createElement("div");
  back.className = "fc-face fc-face--back";
  renderFace(back, card.back, card.category, options.showCategory);

  element.append(front, back);
}
