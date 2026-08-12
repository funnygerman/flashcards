/**
 * Position-indicator mode and rendering (T-07). T-08 turns each dot into a
 * real, labelled `<button>` (LIB-8.4).
 *
 * See docs/library/requirements.md §4.4 (LIB-4.15–LIB-4.18) and §8.
 */

import { formatDotLabel } from "./a11y.js";

/** Which indicator UI applies for a given card count. */
export type IndicatorMode = "empty" | "hidden" | "dots" | "counter";

// LIB-4.16, LIB-4.17, LIB-4.18: dots up to dotLimit, a counter above it,
// hidden for a single card, and a distinct empty state for zero cards.
export function resolveIndicatorMode(count: number, dotLimit: number): IndicatorMode {
  if (count === 0) return "empty";
  if (count === 1) return "hidden";
  return count <= dotLimit ? "dots" : "counter";
}

/** Rebuilds `container`'s indicator markup for the current `count`/`index`.
 * Cheap to call on every navigation — it always replaces its children rather
 * than diffing, since the indicator set is small. `onSelect` is called with
 * a dot's 0-based index when it's activated (LIB-8.4); rebuilding on every
 * call means the listener is always freshly bound, never stale. */
export function renderIndicators(
  container: Element,
  count: number,
  index: number,
  dotLimit: number,
  onSelect: (index: number) => void,
): void {
  container.replaceChildren();

  switch (resolveIndicatorMode(count, dotLimit)) {
    case "empty": {
      const message = document.createElement("p");
      message.className = "fc-empty";
      message.textContent = "No cards to show.";
      container.append(message);
      break;
    }
    case "hidden":
      break;
    case "dots":
      for (let i = 0; i < count; i++) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = i === index ? "fc-indicator-dot fc-indicator-dot--active" : "fc-indicator-dot";
        dot.setAttribute("aria-label", formatDotLabel(i));
        dot.addEventListener("click", () => onSelect(i));
        container.append(dot);
      }
      break;
    case "counter": {
      const counter = document.createElement("span");
      counter.className = "fc-indicator-counter";
      counter.textContent = `${index + 1} / ${count}`;
      container.append(counter);
      break;
    }
  }
}
