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
  flex: none;
  background: var(--fc-card-bg);
  border: 1px solid var(--fc-card-border);
  border-radius: 0.75rem;
  box-shadow: 0 0.25rem 1rem var(--fc-shadow-color);
}

.fc-indicators {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  min-block-size: 1.5rem;
}

.fc-indicator-dot {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 50%;
  background: var(--fc-card-border);
}

.fc-indicator-dot--active {
  background: var(--fc-accent);
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
`.trim();
