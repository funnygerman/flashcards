/**
 * @flashcards/library — public entry point.
 *
 * T-01 added the data and configuration types plus `resolveOptions`. T-02
 * added the sizing engine's pure `computeCardSize`. T-03 added the
 * `FlashcardDeck` class: its DOM skeleton, style injection, and teardown.
 * T-07 adds `goTo`, `getState`, and the arrow/indicator chrome. T-04 adds
 * `_renderCard`, filling each `.fc-card` with its plain-text faces. T-05
 * adds `_flip` and its pointer/keyboard commit paths. T-08 adds the ARIA
 * roles/labels, the flip live region, focus-follows-navigation, and the
 * keyboard grade path (`_grade`) that T-06 will reuse for swipes. The rest
 * of the surface arrives with:
 *   T-06, T-09  gestures, title/info
 *   T-10  the onCardShown / onFlip callbacks, wiring T-06's gestures into
 *         `_flip`/`_grade`, and final packaging
 *
 * See docs/tasks/README.md.
 */

import { applyCardA11y, PREV_ARROW_LABEL, NEXT_ARROW_LABEL, revealedSideText } from "./a11y.js";
import { resolveOptions } from "./config.js";
import { shouldCommitFlip } from "./flip.js";
import { gradeForDirection } from "./grade.js";
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
 * (T-02's viewport resize handler, T-06's pointer listeners, and any
 * timers or animation frames they schedule) must track what they add and
 * extend `destroy()` to remove it, keeping LIB-6.5 satisfied as the deck
 * grows. */
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
  // LIB-8.3: visually hidden (`.fc-sr-only`), `aria-live="polite"`.
  private readonly _liveRegion: HTMLDivElement;

  /** LIB-6.4: current position. */
  private _index = 0;
  // LIB-5.14: one entry per card, so flip state persists independently as
  // the user navigates away from a card and back.
  private readonly _sides: Side[];

  // LIB-5.13, LIB-5.15: the in-flight press this pointer sequence might
  // commit as a flip on release; cleared on pointerup and pointercancel.
  private _pendingFlip: { index: number; x: number; y: number; t: number } | null = null;

  private _destroyed = false;

  // LIB-5.18, LIB-5.19: arrow clicks and ←/→ both funnel through `_setIndex`.
  private readonly _handlePrevClick = (): void => this._setIndex(this._index - 1, { animate: true });
  private readonly _handleNextClick = (): void => this._setIndex(this._index + 1, { animate: true });
  // `_container` is typed as `Element`, not `HTMLElement` (it may be a plain
  // selector match), so `addEventListener`'s `ElementEventMap` overload
  // doesn't know "keydown" — hence the explicit `EventListener` type and the
  // cast below rather than a `(event: KeyboardEvent) => void` parameter.
  private readonly _handleKeydown: EventListener = (event) => {
    const keyboardEvent = event as KeyboardEvent;
    const key = keyboardEvent.key;
    if (key === "ArrowLeft") this._setIndex(this._index - 1, { animate: true });
    else if (key === "ArrowRight") this._setIndex(this._index + 1, { animate: true });
    else if (key === "Enter" || key === " ") {
      // LIB-5.22: Space must not scroll the page when used to flip a card.
      if (key === " ") keyboardEvent.preventDefault();
      this._flip(this._index);
    } else if (key === "ArrowUp" || key === "ArrowDown") {
      // LIB-5.21: ↑/↓ grade the focused card — only when a card, not an
      // arrow or the info button, is what's actually focused.
      const cardEl = (keyboardEvent.target as Element | null)?.closest(".fc-card");
      if (!cardEl) return;
      keyboardEvent.preventDefault();
      this._grade(key === "ArrowUp" ? "up" : "down");
    }
  };

  // LIB-5.12, LIB-5.13, LIB-5.15: tap/click flip commit. Bound to `_track`
  // (not per-card) so one pair of listeners covers every card; the pressed
  // card is found via `closest(".fc-card")` on the event target. This does
  // not drive navigation — dragging across the track to select text, or a
  // touch long-press selection, both leave `window.getSelection()`
  // non-collapsed at release, so `shouldCommitFlip` alone keeps the flip
  // from firing. T-06's swipe/grade gestures are a separate, later concern.
  private readonly _handlePointerDown: EventListener = (event) => {
    const pointerEvent = event as PointerEvent;
    const cardEl = (pointerEvent.target as Element | null)?.closest(".fc-card") ?? null;
    const index = cardEl ? Array.from(this._track.children).indexOf(cardEl) : -1;
    this._pendingFlip =
      index === -1 ? null : { index, x: pointerEvent.clientX, y: pointerEvent.clientY, t: pointerEvent.timeStamp };
  };

  private readonly _handlePointerUp: EventListener = (event) => {
    const pending = this._pendingFlip;
    this._pendingFlip = null;
    if (!pending) return;

    const pointerEvent = event as PointerEvent;
    const distance = Math.hypot(pointerEvent.clientX - pending.x, pointerEvent.clientY - pending.y);
    const duration = pointerEvent.timeStamp - pending.t;
    const selection = window.getSelection();

    if (shouldCommitFlip({ distance, duration, selectionCollapsed: selection === null || selection.isCollapsed })) {
      this._flip(pending.index);
    }
  };

  private readonly _handlePointerCancel: EventListener = (): void => {
    this._pendingFlip = null;
  };

  constructor(target: string | Element, cards: readonly Flashcard[], options: DeckOptions = {}) {
    this._container = resolveTarget(target);
    this._options = resolveOptions(options);
    this._cards = cards;
    this._sides = cards.map(() => "front");

    if (this._options.injectStyles) injectStylesOnce();

    this._root = document.createElement("div");
    this._root.className = "fc-root";
    // LIB-8.1: the deck is a single composite widget, not a generic <div>.
    this._root.setAttribute("role", "group");
    this._root.setAttribute("aria-roledescription", "flashcard deck");
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
    // LIB-8.4: the arrows carry no visible text, so this is their only name.
    this._prevArrow.setAttribute("aria-label", PREV_ARROW_LABEL);

    this._nextArrow = document.createElement("button");
    this._nextArrow.type = "button";
    this._nextArrow.className = "fc-arrow fc-arrow--next";
    this._nextArrow.setAttribute("aria-label", NEXT_ARROW_LABEL);

    this._infoButton = document.createElement("button");
    this._infoButton.type = "button";
    this._infoButton.className = "fc-info";

    // LIB-8.3: holds only the just-revealed side's text between flips —
    // never appended to, always replaced (see `_flip`).
    this._liveRegion = document.createElement("div");
    this._liveRegion.className = "fc-sr-only";
    this._liveRegion.setAttribute("aria-live", "polite");
    this._liveRegion.setAttribute("aria-atomic", "true");

    this._root.append(
      this._track,
      this._indicators,
      this._prevArrow,
      this._nextArrow,
      this._infoButton,
      this._liveRegion,
    );
    this._container.replaceChildren(this._root);

    // LIB-5.18, LIB-5.19, LIB-5.23: arrow clicks and the container's own
    // keyboard handler — never bound to `document`, so two decks on one page
    // don't compete for arrow keys.
    this._prevArrow.addEventListener("click", this._handlePrevClick);
    this._nextArrow.addEventListener("click", this._handleNextClick);
    this._container.addEventListener("keydown", this._handleKeydown);
    this._track.addEventListener("pointerdown", this._handlePointerDown);
    this._track.addEventListener("pointerup", this._handlePointerUp);
    this._track.addEventListener("pointercancel", this._handlePointerCancel);

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
    return { index: this._index, side: this._sides[this._index] ?? "front", count: this._cards.length };
  }

  /** The single seam every navigation path — arrows, keys, `goTo`, dot
   * activation, and eventually T-06's committed gestures — funnels
   * through, so index state and chrome updates never drift out of sync
   * between callers. LIB-8.6: also moves focus to the newly current card,
   * so keyboard and screen-reader users stay oriented regardless of how
   * navigation was triggered. */
  private _setIndex(index: number, options: { animate?: boolean } = {}): void {
    const count = this._cards.length;
    if (count === 0) return;

    this._index = Math.min(Math.max(index, 0), count - 1);
    this._track.classList.toggle("fc-track--animate", options.animate ?? false);
    this._updateChrome();
    (this._track.children[this._index] as HTMLElement | undefined)?.focus();
  }

  /** LIB-5.12, LIB-5.14: toggles `index`'s face and reflects it on the DOM
   * via `.fc-card--flipped` (the flip transition itself lives in the
   * stylesheet). LIB-8.2, LIB-8.3: refreshes that card's accessible label
   * (the side just changed) and announces the newly revealed side's text
   * alone through the live region. `onFlip` (LIB-6.10) is wired by T-10 —
   * this only owns the flip itself and its accessible reflection. */
  private _flip(index: number): void {
    const currentSide = this._sides[index];
    if (currentSide === undefined) return;

    const nextSide: Side = currentSide === "front" ? "back" : "front";
    this._sides[index] = nextSide;
    this._track.children[index]?.classList.toggle("fc-card--flipped", nextSide === "back");
    this._updateCardA11y();
    this._liveRegion.textContent = revealedSideText(this._cards[index]!, nextSide);
  }

  /** LIB-5.8, LIB-5.21: the keyboard equivalent of a committed vertical
   * grading gesture. T-06's swipe engine has not landed yet, so this is
   * the only caller today; it exists as its own method, named for reuse,
   * so T-06 calls it again from a committed swipe instead of duplicating
   * the direction-to-grade mapping and the callback invocation. */
  private _grade(direction: "up" | "down"): void {
    this._options.onGrade?.(this._index, gradeForDirection(direction));
  }

  /** LIB-4.15–LIB-4.18, LIB-5.4: rebuilds the indicators for the current
   * index/count and disables whichever arrow (or both) has nowhere to go —
   * navigation never wraps. Also refreshes every card's ARIA role, label,
   * and roving `tabindex` (LIB-8.2) for the new index. */
  private _updateChrome(): void {
    const count = this._cards.length;
    this._prevArrow.disabled = count === 0 || this._index <= 0;
    this._nextArrow.disabled = count === 0 || this._index >= count - 1;
    renderIndicators(this._indicators, count, this._index, this._options.dotLimit, (i) =>
      this._setIndex(i, { animate: true }),
    );
    this._updateCardA11y();
  }

  /** LIB-8.2: applies role, accessible label, and roving `tabindex` to
   * every card for the current index/sides. Cheap enough to call in full
   * on every navigation and flip, same as `renderIndicators`. */
  private _updateCardA11y(): void {
    const count = this._cards.length;
    Array.from(this._track.children).forEach((cardEl, i) => {
      applyCardA11y(cardEl, i, count, this._sides[i] ?? "front", i === this._index);
    });
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
    this._track.removeEventListener("pointerdown", this._handlePointerDown);
    this._track.removeEventListener("pointerup", this._handlePointerUp);
    this._track.removeEventListener("pointercancel", this._handlePointerCancel);

    this._container.replaceChildren();
  }
}
