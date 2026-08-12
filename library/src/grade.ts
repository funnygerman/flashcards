/**
 * The vertical-direction-to-grade mapping (T-08).
 *
 * See docs/library/requirements.md §5.2 (LIB-5.8) and LIB-5.21. T-06's
 * gesture engine hasn't landed yet, so there is no swipe to share this
 * with today — the keyboard path (`FlashcardDeck._grade` in `index.ts`)
 * is the only caller for now. It is kept in its own pure function, named
 * for reuse, so T-06 calls the same mapping from a committed vertical
 * gesture instead of growing a second one.
 */

import type { Grade } from "./types.js";

// LIB-5.8: swipe up is "easy", swipe down is "difficult" — LIB-5.21 makes
// ↑/↓ the keyboard equivalent of exactly this mapping.
export function gradeForDirection(direction: "up" | "down"): Grade {
  return direction === "up" ? "easy" : "hard";
}
