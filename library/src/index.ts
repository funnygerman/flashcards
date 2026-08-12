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
 * keyboard grade path (`_grade`) that T-06 reuses for swipes. T-06 adds the
 * pointer-driven gesture engine (`gesture.ts`'s `reduceGesture`): horizontal
 * drag-to-navigate, vertical drag-to-grade, and the wiring that keeps a
 * committed drag from also firing T-05's tap-flip. T-09 adds the optional
 * title-screen overlay and the always-available info panel (`panels.ts`),
 * including the focus trap and ⓘ-return-on-close T-08 left as a documented
 * gap (`LIB-8.8`) until this panel existed. T-10 closes out M1: it wires
 * `onCardShown`/`onFlip`/`onGrade` (config.ts already resolved the three
 * since T-01), wires T-02's `_sizeCard`/`_observeViewportSize` into the
 * constructor/`destroy()` — the one gap T-06's integration pass explicitly
 * left open — and locks the public surface down to exactly what's documented
 * in `library/README.md`.
 *
 * See docs/tasks/README.md.
 */

import { applyCardA11y, INFO_BUTTON_LABEL, PREV_ARROW_LABEL, NEXT_ARROW_LABEL, revealedSideText } from "./a11y.js";
import { resolveOptions } from "./config.js";
import { shouldCommitFlip } from "./flip.js";
import { IDLE_GESTURE_STATE, reduceGesture } from "./gesture.js";
import type { GestureContext, GestureState } from "./gesture.js";
import { gradeForDirection } from "./grade.js";
import { renderIndicators } from "./indicators.js";
import { createInfoPanel, createTitleScreen, detectTouchCapability, focusableElements } from "./panels.js";
import { _renderCard } from "./rendering.js";
import { _observeViewportSize, _sizeCard } from "./sizing.js";
import type { ViewportSizeObserver } from "./sizing.js";
import { STYLES } from "./styles.js";
import type { DeckOptions, Flashcard, Grade, ResolvedOptions, Side } from "./types.js";

// LIB-6.6, LIB-6.13: the only runtime export. `resolveOptions`,
// `computeCardSize`, and the T-00 `VERSION` scaffolding constant were
// deliberately dropped here — none of them is part of the documented public
// surface (`library/README.md`), and each stays reachable internally through
// its own module. Types are a separate story: `export type *` below has no
// runtime footprint, so it can re-export everything a consumer needs to
// annotate a constructor call (`Flashcard`, `DeckOptions`, `Side`, `Grade`,
// …) without adding to the *runtime* surface this task locks down.
export type * from "./types.js";

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
 * Each listener the deck binds is removed in `destroy()`; T-10 extends the
 * same teardown to dispose T-02's viewport-size observer and cancel the
 * pending `onCardShown` settle timer, keeping LIB-6.5 satisfied as the deck
 * grows. */
export class FlashcardDeck {
  private readonly _container: Element;
  private readonly _options: ResolvedOptions;
  private readonly _cards: readonly Flashcard[];

  private readonly _root: HTMLDivElement;
  // LIB-5.2: `_viewport` is the fixed one-card-wide clipping window
  // (`overflow: hidden`, sized from `--fc-card-w`); `_track` is the sliding
  // reel inside it that actually holds every `.fc-card` and receives the
  // paging `translateX`. Splitting the two is required, not stylistic — a
  // `transform` moves an element's own box, clip region included, so a
  // single element can't both clip to one card's width and slide its
  // contents within that same fixed window.
  private readonly _viewport: HTMLDivElement;
  private readonly _track: HTMLDivElement;
  private readonly _indicators: HTMLDivElement;
  private readonly _prevArrow: HTMLButtonElement;
  private readonly _nextArrow: HTMLButtonElement;
  private readonly _infoButton: HTMLButtonElement;
  // LIB-8.3: visually hidden (`.fc-sr-only`), `aria-live="polite"`.
  private readonly _liveRegion: HTMLDivElement;

  // LIB-4.25–LIB-4.28: the info panel is always built (the ⓘ control is
  // permanently available, LIB-4.25) — `info` config only affects whether
  // `_infoPanel` carries application text alongside the library-generated
  // interaction list. Starts hidden; `_infoOpen` is the single source of
  // truth for whether it's currently shown.
  private readonly _infoBackdrop: HTMLDivElement;
  private readonly _infoPanel: HTMLDivElement;
  private readonly _infoCloseButton: HTMLButtonElement;
  private _infoOpen = false;

  // LIB-4.19–LIB-4.24: only built when `title` is configured; `null` from
  // the start otherwise (LIB-4.24 — no flag, no storage, just this). Set
  // back to `null` the moment it's dismissed, permanently, for the life of
  // the instance (LIB-4.21).
  private _titleEl: HTMLDivElement | null = null;

  /** LIB-6.4: current position. */
  private _index = 0;
  // LIB-5.14: one entry per card, so flip state persists independently as
  // the user navigates away from a card and back.
  private readonly _sides: Side[];

  // LIB-5.13, LIB-5.15: the in-flight press this pointer sequence might
  // commit as a flip on release; cleared on pointerup and pointercancel.
  private _pendingFlip: { index: number; x: number; y: number; t: number } | null = null;

  // T-06: the pure gesture engine's own state for the in-flight pointer
  // sequence, plus the DOM it was measured against — `null` outside a
  // gesture, i.e. idle between pointer sequences.
  private _gestureState: GestureState = IDLE_GESTURE_STATE;
  private _gestureCardEl: Element | null = null;
  private _gestureContentEl: HTMLElement | null = null;

  private _destroyed = false;

  // T-02, LIB-4.5, LIB-4.10, LIB-4.11, LIB-4.13: keeps `--fc-card-w` current
  // as the viewport changes. Started in the constructor, disposed in
  // `destroy()`.
  private readonly _viewportSizeObserver: ViewportSizeObserver;

  // LIB-6.8, LIB-6.9: cards already reported never re-fire `onCardShown`, for
  // the life of the instance. `_cardShownTimer`/`_cardShownIndex` track the
  // single in-flight 400ms settle timer — only the current card can ever be
  // mid-settle, so one timer is always enough; `_setIndex` cancels/restarts
  // it on every navigation (`_scheduleCardShown`), and a flip before it fires
  // reports immediately instead of waiting (`_reportCardShown`).
  private readonly _shownIndices = new Set<number>();
  private _cardShownTimer: ReturnType<typeof setTimeout> | null = null;
  private _cardShownIndex: number | null = null;

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

    // LIB-4.21: while the title screen is up, Enter/Space/→ dismiss it —
    // permanently — instead of flipping or navigating, and every other key
    // is swallowed (the overlay is meant to block interaction with the deck
    // underneath, not just the keys that happen to dismiss it).
    if (this._titleEl) {
      if (key === "Enter" || key === " " || key === "ArrowRight") {
        if (key === " ") keyboardEvent.preventDefault();
        this._dismissTitle();
      }
      return;
    }

    // LIB-4.26, LIB-8.8: while the info panel is open, Esc closes it and Tab
    // cycles within its own focus trap — neither reaches the deck's own
    // navigation/flip/grade handling below.
    if (this._infoOpen) {
      if (key === "Escape") this._closeInfoPanel();
      else if (key === "Tab") this._trapFocus(keyboardEvent);
      return;
    }

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
      this._grade(gradeForDirection(key === "ArrowUp" ? "up" : "down"));
    }
  };

  // LIB-5.12, LIB-5.13, LIB-5.15: tap/click flip commit. Bound to `_track`
  // (not per-card) so one pair of listeners covers every card; the pressed
  // card is found via `closest(".fc-card")` on the event target. This does
  // not drive navigation on its own — a committed drag clears `_pendingFlip`
  // in `_handlePointerMove` below, and `shouldCommitFlip`'s distance/duration
  // check keeps a real drag that fell just short of any threshold from also
  // registering as a tap.
  private readonly _handlePointerDown: EventListener = (event) => {
    const pointerEvent = event as PointerEvent;
    const cardEl = (pointerEvent.target as Element | null)?.closest(".fc-card") ?? null;
    const index = cardEl ? Array.from(this._track.children).indexOf(cardEl) : -1;
    this._pendingFlip =
      index === -1 ? null : { index, x: pointerEvent.clientX, y: pointerEvent.clientY, t: pointerEvent.timeStamp };

    this._gestureState = IDLE_GESTURE_STATE;
    this._gestureCardEl = null;
    this._gestureContentEl = null;
    // Every pointer type — mouse included — feeds the gesture engine, so a
    // mouse drag pages/grades exactly like a touch or pen drag does. (Mouse
    // was previously excluded here per LIB-5.16/5.17, in favour of leaving
    // it free for text selection; that trade reversed once .fc-card's
    // user-select: none made a mouse drag select nothing anyway — see
    // styles.ts.)
    if (cardEl) {
      this._gestureCardEl = cardEl;
      this._gestureContentEl = (pointerEvent.target as Element | null)?.closest<HTMLElement>(".fc-face-content") ?? null;
      const [state] = reduceGesture(
        IDLE_GESTURE_STATE,
        { type: "down", x: pointerEvent.clientX, y: pointerEvent.clientY, t: pointerEvent.timeStamp },
        this._gestureContext(),
      );
      this._gestureState = state;
    }
  };

  // LIB-5.2, LIB-5.9, LIB-5.10: feeds every move into `reduceGesture` and
  // applies whatever it decides — real-time track/card following while an
  // axis is locked, nothing while still deciding (including while a
  // scrollable content area is left to handle the movement itself).
  private readonly _handlePointerMove: EventListener = (event) => {
    if (this._gestureState.phase === "idle") return;

    const pointerEvent = event as PointerEvent;
    const [state, outcome] = reduceGesture(
      this._gestureState,
      { type: "move", x: pointerEvent.clientX, y: pointerEvent.clientY, t: pointerEvent.timeStamp },
      this._gestureContext(),
    );
    this._gestureState = state;

    if (outcome.kind !== "dragging") return;

    // LIB-5.7: a real, axis-locked drag is underway — the tap-flip path
    // above must not also fire when this same pointer sequence releases.
    this._pendingFlip = null;

    if (outcome.axis === "x") this._applyTrackDragOffset(outcome.offset);
    else this._applyCardDragOffset(outcome.offset);
  };

  private readonly _handlePointerUp: EventListener = (event) => {
    const pointerEvent = event as PointerEvent;
    this._commitGesture(pointerEvent);

    const pending = this._pendingFlip;
    this._pendingFlip = null;
    if (!pending) return;

    const distance = Math.hypot(pointerEvent.clientX - pending.x, pointerEvent.clientY - pending.y);
    const duration = pointerEvent.timeStamp - pending.t;
    const selection = window.getSelection();

    if (shouldCommitFlip({ distance, duration, selectionCollapsed: selection === null || selection.isCollapsed })) {
      this._flip(pending.index);
    }
  };

  private readonly _handlePointerCancel: EventListener = (): void => {
    this._pendingFlip = null;
    this._abandonGesture();
  };

  // LIB-4.21: tap/click dismissal — bound directly to the title element
  // itself, since (unlike the arrows/info button) it isn't wired through the
  // container's keydown handler for pointer input.
  private readonly _handleTitleClick = (): void => this._dismissTitle();

  private readonly _handleInfoButtonClick = (): void => this._openInfoPanel();
  private readonly _handleInfoCloseClick = (): void => this._closeInfoPanel();
  // LIB-4.26: closes on a click that lands on the backdrop itself, not one
  // that bubbled up from the panel's own content.
  private readonly _handleBackdropClick: EventListener = (event) => {
    if (event.target === this._infoBackdrop) this._closeInfoPanel();
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

    // LIB-4.5, LIB-4.10, LIB-4.11, LIB-4.13: size synchronously from the
    // real viewport first — so `--fc-card-w` is correct before first paint,
    // not just after the observer's own first animation frame — then start
    // the observer for every viewport change after that.
    _sizeCard(this._root, this._options);
    this._viewportSizeObserver = _observeViewportSize(this._root, () => this._options);

    this._viewport = document.createElement("div");
    this._viewport.className = "fc-viewport";

    this._track = document.createElement("div");
    this._track.className = "fc-track";
    cards.forEach((card) => {
      const cardEl = document.createElement("div");
      cardEl.className = "fc-card";
      _renderCard(card, cardEl, this._options);
      this._track.append(cardEl);
    });
    this._viewport.append(this._track);

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
    // LIB-8.4-style: no visible text, so this is its only accessible name.
    this._infoButton.setAttribute("aria-label", INFO_BUTTON_LABEL);
    this._infoButton.setAttribute("aria-haspopup", "dialog");
    this._infoButton.setAttribute("aria-expanded", "false");
    this._infoButton.textContent = "ⓘ";

    // LIB-8.3: holds only the just-revealed side's text between flips —
    // never appended to, always replaced (see `_flip`).
    this._liveRegion = document.createElement("div");
    this._liveRegion.className = "fc-sr-only";
    this._liveRegion.setAttribute("aria-live", "polite");
    this._liveRegion.setAttribute("aria-atomic", "true");

    // LIB-4.27, LIB-4.28: the interaction list is generated once from facts
    // that don't change over the instance's life (device touch capability,
    // card count) — never from the application's own `info` text, which is
    // shown alongside it untouched (LIB-3.7).
    const { backdrop, panel, closeButton } = createInfoPanel(this._options.info ?? {}, {
      touch: detectTouchCapability(),
      cardCount: cards.length,
    });
    this._infoBackdrop = backdrop;
    this._infoPanel = panel;
    this._infoCloseButton = closeButton;

    this._root.append(
      this._viewport,
      this._indicators,
      this._prevArrow,
      this._nextArrow,
      this._infoButton,
      this._liveRegion,
      this._infoBackdrop,
    );

    // LIB-4.19: mounted last so it stacks above everything else — a pure
    // overlay, not a `.fc-track` slide, so it never touches card indices,
    // indicator counts, or `goTo` arguments (LIB-4.20).
    if (this._options.title !== undefined) {
      this._titleEl = createTitleScreen(this._options.title);
      this._root.append(this._titleEl);
    }

    this._container.replaceChildren(this._root);

    // LIB-5.18, LIB-5.19, LIB-5.23: arrow clicks and the container's own
    // keyboard handler — never bound to `document`, so two decks on one page
    // don't compete for arrow keys.
    this._prevArrow.addEventListener("click", this._handlePrevClick);
    this._nextArrow.addEventListener("click", this._handleNextClick);
    this._container.addEventListener("keydown", this._handleKeydown);
    this._track.addEventListener("pointerdown", this._handlePointerDown);
    this._track.addEventListener("pointermove", this._handlePointerMove);
    this._track.addEventListener("pointerup", this._handlePointerUp);
    this._track.addEventListener("pointercancel", this._handlePointerCancel);
    this._infoButton.addEventListener("click", this._handleInfoButtonClick);
    this._infoCloseButton.addEventListener("click", this._handleInfoCloseClick);
    this._infoBackdrop.addEventListener("click", this._handleBackdropClick);
    if (this._titleEl) this._titleEl.addEventListener("click", this._handleTitleClick);
    this._titleEl?.focus();

    this._updateChrome();
    // LIB-6.8: card 0 is already "current" the instant the deck is
    // constructed — `_setIndex` never runs for it, so this is scheduled
    // separately here rather than only from `_setIndex`.
    this._scheduleCardShown(this._index);
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
   * activation, and T-06's committed horizontal gestures — funnels
   * through, so index state and chrome updates never drift out of sync
   * between callers. LIB-8.6: also moves focus to the newly current card,
   * so keyboard and screen-reader users stay oriented regardless of how
   * navigation was triggered. */
  private _setIndex(index: number, options: { animate?: boolean } = {}): void {
    const count = this._cards.length;
    if (count === 0) return;

    this._index = Math.min(Math.max(index, 0), count - 1);
    this._settleTrack(options.animate ?? false);
    this._updateChrome();
    // LIB-5.2: preventScroll, because `.fc-viewport`'s overflow: hidden makes
    // it a native scroll container — without this, focusing a card outside
    // the visible window triggers the browser's own scroll-into-view on top
    // of `_settleTrack`'s manual translateX, doubling the offset.
    (this._track.children[this._index] as HTMLElement | undefined)?.focus({ preventScroll: true });
    // LIB-6.8: (re)starts the 400ms settle timer for whichever card is now
    // current — cancelling whatever was pending for the card just left, so
    // swiping through several cards inside 400ms never fires for the ones
    // that were only ever passed through.
    this._scheduleCardShown(this._index);
  }

  /** LIB-5.12, LIB-5.14: toggles `index`'s face and reflects it on the DOM
   * via `.fc-card--flipped` (the flip transition itself lives in the
   * stylesheet). LIB-8.2, LIB-8.3: refreshes that card's accessible label
   * (the side just changed) and announces the newly revealed side's text
   * alone through the live region. LIB-6.8: a flip before the 400ms settle
   * timer elapses reports `onCardShown` immediately rather than waiting.
   * LIB-6.10: `onFlip` fires with the side now visible on every flip. */
  private _flip(index: number): void {
    const currentSide = this._sides[index];
    if (currentSide === undefined) return;

    const nextSide: Side = currentSide === "front" ? "back" : "front";
    this._sides[index] = nextSide;
    this._track.children[index]?.classList.toggle("fc-card--flipped", nextSide === "back");
    this._updateCardA11y();
    this._liveRegion.textContent = revealedSideText(this._cards[index]!, nextSide);
    this._reportCardShown(index);
    this._invokeCallback(() => this._options.onFlip?.(index, nextSide));
  }

  /** LIB-5.8, LIB-5.21, LIB-6.11: emits `onGrade` for the current card. Both
   * callers — the keyboard handler above and `_commitGesture` below —
   * compute the `Grade` themselves via `gradeForDirection`, so the up/down-
   * to-grade mapping lives in exactly one place (`grade.ts`) rather than
   * being duplicated here. */
  private _grade(grade: Grade): void {
    this._invokeCallback(() => this._options.onGrade?.(this._index, grade));
  }

  /** LIB-6.8: (re)starts the 400ms settle timer for `index` — cancelling
   * whatever was pending for a previous index first, so only one timer is
   * ever in flight. A no-op for an empty deck or a card already reported
   * (LIB-6.9), so a rebuilt timer is never scheduled for nothing. */
  private _scheduleCardShown(index: number): void {
    this._clearCardShownTimer();
    if (this._cards.length === 0 || this._shownIndices.has(index)) return;

    this._cardShownIndex = index;
    this._cardShownTimer = setTimeout(() => {
      this._cardShownTimer = null;
      this._reportCardShown(index);
    }, 400);
  }

  /** LIB-6.8, LIB-6.9: reports `index` as shown — cancelling its pending
   * settle timer first, if this is the card it belongs to (the early-flip
   * path) — and never fires twice for the same index in this instance's
   * life. */
  private _reportCardShown(index: number): void {
    if (this._cardShownIndex === index) this._clearCardShownTimer();
    if (this._shownIndices.has(index)) return;

    this._shownIndices.add(index);
    this._invokeCallback(() => this._options.onCardShown?.(index));
  }

  private _clearCardShownTimer(): void {
    if (this._cardShownTimer !== null) {
      clearTimeout(this._cardShownTimer);
      this._cardShownTimer = null;
    }
    this._cardShownIndex = null;
  }

  /** LIB-6.12: every callback invocation funnels through here so a throwing
   * host callback can never corrupt the deck's own state or stop later
   * navigation/flips/grades from working — whatever this wraps has already
   * finished updating `this` by the time it's called. */
  private _invokeCallback(invoke: () => void): void {
    try {
      invoke();
    } catch (error) {
      console.error("@flashcards/library: a callback threw an error.", error);
    }
  }

  /** LIB-4.21: removes the title overlay and clears `_titleEl` so it can
   * never reappear for the life of the instance — the only state this
   * behaviour needs, and it lives only in memory (LIB-4.24). */
  private _dismissTitle(): void {
    const titleEl = this._titleEl;
    if (!titleEl) return;

    this._titleEl = null;
    titleEl.removeEventListener("click", this._handleTitleClick);
    titleEl.remove();
  }

  /** LIB-4.26: opens the info panel and moves focus inside it — the first
   * step of the focus trap (LIB-8.8), which `_trapFocus` maintains for as
   * long as the panel stays open. */
  private _openInfoPanel(): void {
    if (this._infoOpen) return;

    this._infoOpen = true;
    this._infoBackdrop.hidden = false;
    this._infoButton.setAttribute("aria-expanded", "true");
    (focusableElements(this._infoPanel)[0] ?? this._infoCloseButton).focus();
  }

  /** LIB-4.26, LIB-8.8: closes the panel by whichever path triggered it
   * (Esc, the close control, or a click outside) and restores focus to the
   * `ⓘ` control that opened it. */
  private _closeInfoPanel(): void {
    if (!this._infoOpen) return;

    this._infoOpen = false;
    this._infoBackdrop.hidden = true;
    this._infoButton.setAttribute("aria-expanded", "false");
    this._infoButton.focus();
  }

  /** LIB-8.8: keeps `Tab`/`Shift+Tab` cycling within the panel's own
   * focusable elements. Recomputed on every press rather than cached (see
   * `focusableElements`'s own doc comment); wrapping happens only at the
   * boundaries (or when focus has somehow left the panel entirely), so a
   * `Tab` in the middle of the list behaves exactly as the browser's default
   * tab order already would. */
  private _trapFocus(event: KeyboardEvent): void {
    const focusables = focusableElements(this._infoPanel);
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !focusables.includes(active as HTMLElement)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !focusables.includes(active as HTMLElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  /** T-06: measured fresh for every `reduceGesture` call (see `gesture.ts`'s
   * own doc comment for why) from whichever card the current pointer
   * sequence started on. `getBoundingClientRect` reads whatever the browser
   * actually laid out — 0 before first layout, or in jsdom — rather than
   * assuming a specific CSS sizing scheme, so the thresholds below are
   * correct regardless of how a card ends up sized. */
  private _gestureContext(): GestureContext {
    const cardEl = this._gestureCardEl as HTMLElement | null;
    const rect = cardEl?.getBoundingClientRect();
    const contentEl = this._gestureContentEl;

    return {
      cardWidth: rect?.width ?? 0,
      cardHeight: rect?.height ?? 0,
      friction: this._options.friction,
      swipeThreshold: this._options.swipeThreshold,
      gradeThreshold: this._options.gradeThreshold,
      hasPrev: this._index > 0,
      hasNext: this._index < this._cards.length - 1,
      // LIB-5.10: `dy > 0` is a downward drag, which would reveal content
      // above — possible only if the content isn't already scrolled to its
      // top; `dy < 0` is upward, possible only if it isn't at its bottom.
      verticalScrollBlocksGesture: (dy: number): boolean => {
        if (!contentEl || contentEl.scrollHeight <= contentEl.clientHeight) return false;
        if (dy > 0) return contentEl.scrollTop > 0;
        if (dy < 0) return contentEl.scrollTop + contentEl.clientHeight < contentEl.scrollHeight;
        return false;
      },
    };
  }

  /** T-06: the card width the current gesture (or, absent one, the current
   * index) is measured against — see `_gestureContext`'s doc comment. */
  private _trackCardWidth(): number {
    const cardEl = (this._gestureCardEl ?? this._track.children[this._index]) as HTMLElement | undefined;
    return cardEl?.getBoundingClientRect().width ?? 0;
  }

  /** LIB-5.2: positions the track at the current index, plus `offsetPx` for
   * a live horizontal drag (0 at rest). Assumes every card occupies an equal
   * slot — true of the stylesheet's `.fc-card` sizing (T-06; see
   * `styles.ts`) — so `index * cardWidth` is the resting position for any
   * card, not just the one just measured. */
  private _applyTrackTransform(offsetPx: number): void {
    const cardWidth = this._trackCardWidth();
    this._track.style.transform = `translateX(${-(this._index * cardWidth) + offsetPx}px)`;
  }

  /** Settles the track at its resting position for the current index —
   * after a commit (`_setIndex`), a horizontal `snapBack`, or an abandoned
   * gesture. `animate` toggles the 250ms settle transition (`LIB-4.35`). */
  private _settleTrack(animate: boolean): void {
    this._track.classList.toggle("fc-track--animate", animate);
    this._applyTrackTransform(0);
  }

  /** LIB-5.2: moves the whole track with the pointer in real time while a
   * horizontal drag is in progress — no transition, so it tracks exactly,
   * not with a 250ms lag. */
  private _applyTrackDragOffset(offsetPx: number): void {
    this._track.classList.remove("fc-track--animate");
    this._applyTrackTransform(offsetPx);
  }

  /** The vertical counterpart of `_applyTrackDragOffset`: while a grade
   * gesture is in progress, only the one card being dragged moves, and the
   * rest of the track (including the flip transform on `.fc-face`, a
   * separate element) is untouched. */
  private _applyCardDragOffset(offsetPx: number): void {
    const cardEl = this._gestureCardEl as HTMLElement | null;
    if (!cardEl) return;
    cardEl.classList.remove("fc-card--settling");
    cardEl.style.transform = `translateY(${offsetPx}px)`;
  }

  /** Springs the in-gesture card back to its resting position — after a
   * vertical `snapBack`, a `grade` commit, or an abandoned gesture — with
   * the 250ms settle transition (`LIB-4.35`). */
  private _settleCard(): void {
    const cardEl = this._gestureCardEl as HTMLElement | null;
    if (!cardEl) return;
    cardEl.classList.add("fc-card--settling");
    cardEl.style.transform = "";
  }

  /** LIB-5.6, LIB-5.8, LIB-5.11: reduces the release itself and applies
   * whatever `reduceGesture` decides — navigate (via `_setIndex`, the same
   * seam every other navigation path uses), grade, or a snap-back on either
   * axis. A no-op when no gesture was in progress, e.g. a plain tap that
   * never crossed the "pressed" phase. */
  private _commitGesture(pointerEvent: PointerEvent): void {
    if (this._gestureState.phase === "idle") return;
    const axis = this._gestureState.phase === "dragging" ? this._gestureState.axis : null;

    const [state, outcome] = reduceGesture(
      this._gestureState,
      { type: "up", x: pointerEvent.clientX, y: pointerEvent.clientY, t: pointerEvent.timeStamp },
      this._gestureContext(),
    );
    this._gestureState = state;

    if (outcome.kind === "navigate") {
      this._setIndex(this._index + outcome.direction, { animate: true });
    } else if (outcome.kind === "grade") {
      this._grade(outcome.grade);
      this._settleCard();
    } else if (outcome.kind === "snapBack") {
      if (axis === "y") this._settleCard();
      else this._settleTrack(true);
    }

    this._gestureCardEl = null;
    this._gestureContentEl = null;
  }

  /** A `pointercancel` mid-gesture leaves nothing visually mid-drag —
   * settles whichever axis, if any, was locked. */
  private _abandonGesture(): void {
    if (this._gestureState.phase === "dragging") {
      if (this._gestureState.axis === "x") this._settleTrack(true);
      else this._settleCard();
    }
    this._gestureState = IDLE_GESTURE_STATE;
    this._gestureCardEl = null;
    this._gestureContentEl = null;
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

    this._viewportSizeObserver.dispose();
    this._clearCardShownTimer();

    this._prevArrow.removeEventListener("click", this._handlePrevClick);
    this._nextArrow.removeEventListener("click", this._handleNextClick);
    this._container.removeEventListener("keydown", this._handleKeydown);
    this._track.removeEventListener("pointerdown", this._handlePointerDown);
    this._track.removeEventListener("pointermove", this._handlePointerMove);
    this._track.removeEventListener("pointerup", this._handlePointerUp);
    this._track.removeEventListener("pointercancel", this._handlePointerCancel);
    this._infoButton.removeEventListener("click", this._handleInfoButtonClick);
    this._infoCloseButton.removeEventListener("click", this._handleInfoCloseClick);
    this._infoBackdrop.removeEventListener("click", this._handleBackdropClick);
    this._titleEl?.removeEventListener("click", this._handleTitleClick);

    this._container.replaceChildren();
  }
}
