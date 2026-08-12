/**
 * Card sizing engine (T-02).
 *
 * See docs/library/requirements.md §4.2 (card sizing) and §4.3 (typography).
 */

import type { ResolvedOptions } from "./types.js";

/** The subset of `ResolvedOptions` the sizing formula depends on. */
export type SizingOptions = Pick<
  ResolvedOptions,
  "aspectRatio" | "widthRatio" | "portraitHeightRatio" | "landscapeHeightRatio" | "maxWidthPx"
>;

/** The result of `computeCardSize`: integer CSS pixels (LIB-4.5). */
export interface CardSize {
  readonly width: number;
  readonly height: number;
}

/** LIB-4.5–LIB-4.9: compute the card's pixel dimensions from the viewport and
 * the configured aspect ratio / sizing ratios. Pure — no DOM access, so it
 * can be tested exhaustively without a browser. Clamps a degenerate (or
 * otherwise negative) viewport to 0×0 rather than producing NaN or negative
 * output; `ar.h` is always positive on a `ResolvedOptions`, so the division
 * below never divides by zero. */
export function computeCardSize(
  viewport: { width: number; height: number },
  options: SizingOptions,
): CardSize {
  const vw = Math.max(0, viewport.width);
  const vh = Math.max(0, viewport.height);
  const [arWidth, arHeight] = options.aspectRatio;

  // LIB-4.8: decided in JS as `>=`, so landscape ratios win the vw === vh tie.
  const isLandscape = vw >= vh;
  const heightRatio = isLandscape ? options.landscapeHeightRatio : options.portraitHeightRatio;
  const maxH = vh * heightRatio;

  // LIB-4.6, LIB-4.7: width is the tightest of the width ratio, the absolute
  // cap, and the height-derived limit; LIB-4.9 falls out of taking the min.
  const width = Math.floor(Math.min(vw * options.widthRatio, options.maxWidthPx, (maxH * arWidth) / arHeight));
  const height = Math.round((width * arHeight) / arWidth);

  return { width, height };
}

/** LIB-4.10: reads the current viewport, preferring `window.visualViewport`
 * so an on-screen keyboard or browser UI chrome is accounted for. */
function _readViewport(): { width: number; height: number } {
  const visualViewport = window.visualViewport;
  if (visualViewport) return { width: visualViewport.width, height: visualViewport.height };
  return { width: window.innerWidth, height: window.innerHeight };
}

/** LIB-4.5, LIB-4.11, LIB-4.13: apply the computed size to `container` by
 * publishing `--fc-card-w` in pixels — never `vw` — so font sizes derived
 * from it (T-04) never depend on the viewport directly. */
export function _sizeCard(
  container: HTMLElement,
  options: SizingOptions,
  viewport: { width: number; height: number } = _readViewport(),
): CardSize {
  const size = computeCardSize(viewport, options);
  container.style.setProperty("--fc-card-w", `${size.width}px`);
  return size;
}

/** A live resize/orientation watcher started by `_observeViewportSize`. */
export interface ViewportSizeObserver {
  /** Removes every listener the observer added and cancels any pending
   * animation frame (LIB-6.5, applied by the caller on `destroy()`). */
  dispose(): void;
}

/** LIB-4.10: recompute and apply the card size on resize and orientation
 * change, throttled to at most one recompute per animation frame no matter
 * how many events fire within it. `getOptions` is read lazily on each
 * recompute so a live options update is picked up on the next frame. */
export function _observeViewportSize(
  container: HTMLElement,
  getOptions: () => SizingOptions,
): ViewportSizeObserver {
  let frame: number | null = null;

  const recompute = (): void => {
    frame = null;
    _sizeCard(container, getOptions());
  };

  const scheduleRecompute = (): void => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(recompute);
  };

  window.addEventListener("resize", scheduleRecompute);
  window.addEventListener("orientationchange", scheduleRecompute);
  window.visualViewport?.addEventListener("resize", scheduleRecompute);

  scheduleRecompute();

  return {
    dispose(): void {
      window.removeEventListener("resize", scheduleRecompute);
      window.removeEventListener("orientationchange", scheduleRecompute);
      window.visualViewport?.removeEventListener("resize", scheduleRecompute);
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    },
  };
}
