/**
 * The flip commit rule (T-05).
 *
 * See docs/library/requirements.md §5.3 (LIB-5.12–LIB-5.15).
 */

/** The measurements `shouldCommitFlip` decides on. */
export interface FlipCommitInput {
  /** Total pointer movement between press and release, in CSS pixels. */
  readonly distance: number;
  /** Elapsed time between press and release, in milliseconds. */
  readonly duration: number;
  /** `window.getSelection()?.isCollapsed` at release time. */
  readonly selectionCollapsed: boolean;
}

// LIB-5.13
export const FLIP_DISTANCE_THRESHOLD_PX = 8;
export const FLIP_DURATION_THRESHOLD_MS = 500;

/** LIB-5.13, LIB-5.15: whether a pointer press commits a flip on release.
 * Pure, so it is table-tested without a browser. All three conditions are
 * strict `<` — a value exactly at a threshold does not commit. This single
 * rule is what lets a drag-to-select release without flipping the card
 * (`selectionCollapsed` goes `false`) and is also what cancels a pending
 * flip under a long-press text selection on touch (`LIB-5.15`), since that
 * too leaves the selection non-collapsed at release. */
export function shouldCommitFlip(input: FlipCommitInput): boolean {
  return (
    input.distance < FLIP_DISTANCE_THRESHOLD_PX &&
    input.duration < FLIP_DURATION_THRESHOLD_MS &&
    input.selectionCollapsed
  );
}
