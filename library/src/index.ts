/**
 * @flashcards/library — public entry point.
 *
 * T-01 added the data and configuration types plus `resolveOptions`. T-02
 * added the sizing engine's pure `computeCardSize`. T-03 added the
 * `FlashcardDeck` class: its DOM skeleton, style injection, and teardown.
 * T-07 adds `goTo`, `getState`, and the arrow/indicator chrome. T-04 adds
 * `_renderCard`, filling each `.fc-card` with its plain-text faces. The rest
 * of the surface arrives with:
 *   T-05, T-06, T-08, T-09  flip, gestures, a11y, title/info
 *   T-10  the onCardShown / onFlip / onGrade callbacks and final packaging
 *
 * See docs/tasks/README.md.
 */

import { resolveOptions } from "./config.js";
import { renderIndicators } from "./indicators.js";
import { _renderCard } from "./rendering.js";
import { STYLES } from "./styles.js";
import type { DeckOptions, Flashcard, ResolvedOptions, Side } from "./types.js";

export type * from "./types.js";
export { resolveOptions } from "./config.js";
export { computeCardSize } from "./sizing.js";
export type { CardSize, SizingOptions } from "./sizing.js";

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

/** LIB-6.1–LIB-6.5, LIB-7.1–LIB-7.10: the reusable flashcard deck. T-03 built
 * the DOM skeleton and teardown. T-07 (this task) adds `goTo`/`getState`,
 * the arrow buttons, the below-card indicators, and the container's
 * `keydown` handler for `←`/`→` — see docs/tasks/T-07-chrome.md.
 *
 * Each listener the deck binds is removed in `destroy()`. Later tasks
 * (T-02's viewport resize handler, T-06's pointer listeners, T-08's
 * `↑`/`↓` grading on the same container `keydown` handler, and any timers
 * or animation frames they schedule) must track what they add and extend
 * `destroy()` to remove it, keeping LIB-6.5 satisfied as the deck grows. */
export class FlashcardDeck {
  private readonly _container: Element;
  private readonly _options: ResolvedOptions;
  private readonly _cards: readonly Flashcard[];

  private readonly _root: HTMLDivElement;
  private readonly _track: HTMLDivElement;
  private readonly _indicators: HTMLDivElement;
  private readonly _prevArrow: HTMLButtonElement;
  private readonly _nextArrow: HTMLButtonElement;
  private readonly _infoButton: HTMLButtonElement;

  /** LIB-6.4: current position and visible side. `_side` is a placeholder
   * until T-05 lands per-card flip state — it stays "front" for now. */
  private _index = 0;
  private _side: Side = "front";

  private _destroyed = false;

  // LIB-5.18, LIB-5.19: arrow clicks and ←/→ both funnel through `_setIndex`.
  private readonly _handlePrevClick = (): void => this._setIndex(this._index - 1, { animate: true });
  private readonly _handleNextClick = (): void => this._setIndex(this._index + 1, { animate: true });
  // `_container` is typed as `Element`, not `HTMLElement` (it may be a plain
  // selector match), so `addEventListener`'s `ElementEventMap` overload
  // doesn't know "keydown" — hence the explicit `EventListener` type and the
  // cast below rather than a `(event: KeyboardEvent) => void` parameter.
  private readonly _handleKeydown: EventListener = (event) => {
    const key = (event as KeyboardEvent).key;
    if (key === "ArrowLeft") this._setIndex(this._index - 1, { animate: true });
    else if (key === "ArrowRight") this._setIndex(this._index + 1, { animate: true });
  };

  constructor(target: string | Element, cards: readonly Flashcard[], options: DeckOptions = {}) {
    this._container = resolveTarget(target);
    this._options = resolveOptions(options);
    this._cards = cards;

    if (this._options.injectStyles) injectStylesOnce();

    this._root = document.createElement("div");
    this._root.className = "fc-root";
    if (this._options.accentColor !== undefined) {
      this._root.style.setProperty("--fc-accent", this._options.accentColor);
    }
    // LIB-4.11, LIB-4.12: published so `.fc-text`/`.fc-details` can read them
    // through calc(var(--fc-card-w) * k) without the stylesheet itself
    // knowing about per-instance configuration.
    this._root.style.setProperty("--fc-text-scale", String(this._options.textScale));
    this._root.style.setProperty("--fc-details-scale", String(this._options.detailsScale));

    this._track = document.createElement("div");
    this._track.className = "fc-track";
    cards.forEach((card) => {
      const cardEl = document.createElement("div");
      cardEl.className = "fc-card";
      _renderCard(card, cardEl, this._options);
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

    // LIB-5.18, LIB-5.19, LIB-5.23: arrow clicks and the container's own
    // keyboard handler — never bound to `document`, so two decks on one page
    // don't compete for arrow keys.
    this._prevArrow.addEventListener("click", this._handlePrevClick);
    this._nextArrow.addEventListener("click", this._handleNextClick);
    this._container.addEventListener("keydown", this._handleKeydown);

    this._updateChrome();
  }

  /** LIB-6.3: navigate to `index`, clamped to the deck's valid range. A
   * no-op on an empty deck. Defaults to `animate: false`. */
  goTo(index: number, options: { animate?: boolean } = {}): void {
    this._setIndex(index, options);
  }

  /** LIB-6.4: current index, visible side, and card count, for hosts that
   * prefer polling to callbacks. */
  getState(): { index: number; side: Side; count: number } {
    return { index: this._index, side: this._side, count: this._cards.length };
  }

  /** The single seam every navigation path — arrows, keys, `goTo`, and
   * eventually T-06's committed gestures — funnels through, so index state
   * and chrome updates never drift out of sync between callers. */
  private _setIndex(index: number, options: { animate?: boolean } = {}): void {
    const count = this._cards.length;
    if (count === 0) return;

    this._index = Math.min(Math.max(index, 0), count - 1);
    this._track.classList.toggle("fc-track--animate", options.animate ?? false);
    this._updateChrome();
  }

  /** LIB-4.15–LIB-4.18, LIB-5.4: rebuilds the indicators for the current
   * index/count and disables whichever arrow (or both) has nowhere to go —
   * navigation never wraps. */
  private _updateChrome(): void {
    const count = this._cards.length;
    this._prevArrow.disabled = count === 0 || this._index <= 0;
    this._nextArrow.disabled = count === 0 || this._index >= count - 1;
    renderIndicators(this._indicators, count, this._index, this._options.dotLimit);
  }

  /** LIB-6.5: removes every listener the library added, cancels pending
   * timers and animation frames, and empties the container. Safe to call
   * more than once. */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this._prevArrow.removeEventListener("click", this._handlePrevClick);
    this._nextArrow.removeEventListener("click", this._handleNextClick);
    this._container.removeEventListener("keydown", this._handleKeydown);

    this._container.replaceChildren();
  }
}
