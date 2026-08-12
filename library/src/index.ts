/**
 * @flashcards/library — public entry point.
 *
 * T-01 added the data and configuration types plus `resolveOptions`. T-03
 * adds the `FlashcardDeck` class: its DOM skeleton, style injection, and
 * teardown. The rest of the surface arrives with:
 *   T-04 … T-09  card rendering, flip, gestures, chrome, a11y, title/info
 *   T-10  goTo, getState, and the onCardShown / onFlip / onGrade callbacks
 *
 * See docs/tasks/README.md.
 */

import { resolveOptions } from "./config.js";
import { STYLES } from "./styles.js";
import type { DeckOptions, Flashcard, ResolvedOptions } from "./types.js";

export type * from "./types.js";
export { resolveOptions } from "./config.js";

/** Package version, exported so the scaffold has an observable surface. */
export const VERSION = "0.0.0";

const STYLE_ATTR = "data-fc-styles";

/** LIB-7.4, LIB-7.5: inject the stylesheet once. The guard is a DOM query —
 * not a module-level flag — so two separately-imported copies of this module
 * still produce exactly one `<style>` element. */
function injectStylesOnce(): void {
  if (document.head.querySelector(`style[${STYLE_ATTR}]`)) return;

  const style = document.createElement("style");
  style.setAttribute(STYLE_ATTR, "");
  style.textContent = STYLES;
  document.head.append(style);
}

/** Resolves the constructor's `target` argument to a live element. This is a
 * boundary between the application and the library, so — unlike option
 * resolution — an unresolvable target throws rather than silently no-oping. */
function resolveTarget(target: string | Element): Element {
  if (typeof target === "string") {
    const found = document.querySelector(target);
    if (!found) {
      throw new Error(`@flashcards/library: no element matches "${target}".`);
    }
    return found;
  }
  return target;
}

/** LIB-6.1–LIB-6.5, LIB-7.1–LIB-7.10: the reusable flashcard deck. This task
 * (T-03) builds the DOM skeleton and teardown; cards render blank and
 * nothing is interactive yet — see docs/tasks/T-03-dom-skeleton.md.
 *
 * T-03 itself binds no listeners and starts no timers, so `destroy()` has
 * nothing of its own to unwind yet beyond the container. Later tasks (T-02's
 * viewport resize handler, T-06's pointer listeners, T-08's container
 * keyboard handler, and any timers or animation frames they schedule) must
 * track what they add and extend `destroy()` to remove it, keeping LIB-6.5
 * satisfied as the deck grows. */
export class FlashcardDeck {
  private readonly _container: Element;
  private readonly _options: ResolvedOptions;

  private readonly _root: HTMLDivElement;
  private readonly _track: HTMLDivElement;
  private readonly _indicators: HTMLDivElement;
  private readonly _prevArrow: HTMLButtonElement;
  private readonly _nextArrow: HTMLButtonElement;
  private readonly _infoButton: HTMLButtonElement;

  private _destroyed = false;

  constructor(target: string | Element, cards: readonly Flashcard[], options: DeckOptions = {}) {
    this._container = resolveTarget(target);
    this._options = resolveOptions(options);

    if (this._options.injectStyles) injectStylesOnce();

    this._root = document.createElement("div");
    this._root.className = "fc-root";
    if (this._options.accentColor !== undefined) {
      this._root.style.setProperty("--fc-accent", this._options.accentColor);
    }

    this._track = document.createElement("div");
    this._track.className = "fc-track";
    cards.forEach(() => {
      const cardEl = document.createElement("div");
      cardEl.className = "fc-card";
      this._track.append(cardEl);
    });

    this._indicators = document.createElement("div");
    this._indicators.className = "fc-indicators";

    this._prevArrow = document.createElement("button");
    this._prevArrow.type = "button";
    this._prevArrow.className = "fc-arrow fc-arrow--prev";

    this._nextArrow = document.createElement("button");
    this._nextArrow.type = "button";
    this._nextArrow.className = "fc-arrow fc-arrow--next";

    this._infoButton = document.createElement("button");
    this._infoButton.type = "button";
    this._infoButton.className = "fc-info";

    this._root.append(this._track, this._indicators, this._prevArrow, this._nextArrow, this._infoButton);
    this._container.replaceChildren(this._root);
  }

  /** LIB-6.5: removes every listener the library added, cancels pending
   * timers and animation frames, and empties the container. Safe to call
   * more than once. T-03 adds none of those itself, so this currently only
   * has the container to empty; it is the seam later tasks extend. */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this._container.replaceChildren();
  }
}
