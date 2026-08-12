/**
 * The library's single stylesheet (T-03).
 *
 * This is the source of truth for both the injected `<style data-fc-styles>`
 * (see `index.ts`) and the standalone `dist/flashcards.css` shipped for
 * strict-CSP hosts (`LIB-7.6`, `LIB-9.4`) — `scripts/emit-css.mjs` writes the
 * compiled form of this module straight to that file after `tsc`, so the two
 * can never drift apart.
 *
 * Every colour lives as a `--fc-*` custom property declared on `.fc-root`
 * (`LIB-4.33`); every other rule only ever reads one via `var()`. There is no
 * `prefers-color-scheme` rule — retheming is the application's job
 * (`LIB-4.34`). Positioning uses logical properties (`LIB-9.6`). No rule sets
 * a viewport-relative height (`LIB-7.10`).
 */
export const STYLES = `
.fc-root {
  --fc-accent: #4a6fa5;
  --fc-bg: #ffffff;
  --fc-fg: #1a1a1a;
  --fc-card-bg: #ffffff;
  --fc-card-border: #d8dce1;
  --fc-shadow-color: rgb(0 0 0 / 15%);
  --fc-text-scale: 0.085;
  --fc-details-scale: 0.05;

  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: system-ui, sans-serif;
  color: var(--fc-fg);
  background: var(--fc-bg);
}

.fc-root *,
.fc-root *::before,
.fc-root *::after {
  box-sizing: border-box;
}

.fc-track {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  overflow: hidden;
}

.fc-card {
  position: relative;
  flex: none;
  background: var(--fc-card-bg);
  border: 1px solid var(--fc-card-border);
  border-radius: 0.75rem;
  box-shadow: 0 0.25rem 1rem var(--fc-shadow-color);
  /* LIB-4.35: the depth the two faces rotate through. */
  perspective: 1200px;
}

/* LIB-8.7: cards are tabindex="0" (T-08's roving focus); the ring must be
   visible, never just the browser default. */
.fc-card:focus-visible {
  outline: 2px solid var(--fc-accent);
  outline-offset: 2px;
}

/* LIB-4.29, LIB-4.30, LIB-4.35: both faces sit stacked on top of each other
   (inset: 0 inside the now-relative .fc-card) and only one faces the viewer
   at a time — .fc-face--back starts pre-rotated away, and .fc-card--flipped
   (set by T-05's _flip) rotates both faces another 180deg over 300ms. */
.fc-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow: hidden;
  backface-visibility: hidden;
  transform: rotateY(0deg);
  transition: transform 300ms;
}

.fc-face--back {
  transform: rotateY(180deg);
}

.fc-card--flipped .fc-face--front {
  transform: rotateY(180deg);
}

.fc-card--flipped .fc-face--back {
  transform: rotateY(360deg);
}

.fc-category {
  flex: none;
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}

/* LIB-4.14: the scrollable remainder of the face, once shrinking (via
   --fc-shrink, set in bounded steps by _renderCard) still isn't enough. */
.fc-face-content {
  flex: 1 1 auto;
  min-block-size: 0;
  overflow-y: auto;
}

.fc-text,
.fc-details {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.fc-text + .fc-details {
  margin-block-start: 0.5rem;
}

/* LIB-4.11, LIB-4.12: sized from the published card width and the
   configured scale factor, never tied to the viewport directly (LIB-4.13). */
.fc-text {
  font-size: calc(var(--fc-card-w) * var(--fc-text-scale) * var(--fc-shrink, 1));
}

.fc-details {
  font-size: calc(var(--fc-card-w) * var(--fc-details-scale) * var(--fc-shrink, 1));
  opacity: 0.75;
}

.fc-indicators {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-block-size: 1.5rem;
}

/* LIB-8.4: a real <button>, so the box-model/border/background reset below
   undoes the browser's default button chrome down to the same plain dot. */
.fc-indicator-dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--fc-card-border);
  cursor: pointer;
}

.fc-indicator-dot--active {
  background: var(--fc-accent);
}

/* LIB-8.7 */
.fc-indicator-dot:focus-visible {
  outline: 2px solid var(--fc-accent);
  outline-offset: 2px;
}

.fc-indicator-counter {
  font-size: 0.8rem;
  color: var(--fc-fg);
  opacity: 0.7;
}

.fc-empty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--fc-fg);
  opacity: 0.6;
}

.fc-track--animate {
  transition: transform 250ms ease;
}

/* LIB-4.36: flips and navigation apply instantly, with no transition, when
   the user has asked the OS for reduced motion. Everything else (colours,
   focus rings, etc.) is unaffected. */
@media (prefers-reduced-motion: reduce) {
  .fc-face,
  .fc-track--animate {
    transition: none;
  }
}

.fc-arrow,
.fc-info {
  position: absolute;
  border: none;
  background: transparent;
  color: var(--fc-accent);
  cursor: pointer;
}

.fc-arrow {
  inset-block-start: 50%;
  transform: translateY(-50%);
}

.fc-arrow--prev {
  inset-inline-start: 0.5rem;
}

.fc-arrow--next {
  inset-inline-end: 0.5rem;
}

.fc-info {
  inset-block-start: 0.5rem;
  inset-inline-end: 0.5rem;
}

.fc-arrow:focus-visible,
.fc-info:focus-visible {
  outline: 2px solid var(--fc-accent);
  outline-offset: 2px;
}

.fc-arrow:disabled {
  opacity: 0.35;
  cursor: default;
}

/* LIB-8.3: the flip live region — visually hidden but still reachable by
   assistive tech, via the standard clip-to-1px technique rather than
   display:none/visibility:hidden, which would pull it out of the
   accessibility tree along with the viewport. */
.fc-sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`.trim();
