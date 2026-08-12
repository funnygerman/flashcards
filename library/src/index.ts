/**
 * @flashcards/library — public entry point.
 *
 * T-01 adds the data and configuration types plus `resolveOptions`. T-02
 * adds the sizing engine's pure `computeCardSize`. The rest of the surface
 * arrives with:
 *   T-03  the FlashcardDeck class and destroy()
 *   T-10  goTo, getState, and the onCardShown / onFlip / onGrade callbacks
 *
 * See docs/tasks/README.md.
 */

export type * from "./types.js";
export { resolveOptions } from "./config.js";
export { computeCardSize } from "./sizing.js";
export type { CardSize, SizingOptions } from "./sizing.js";

/** Package version, exported so the scaffold has an observable surface. */
export const VERSION = "0.0.0";
