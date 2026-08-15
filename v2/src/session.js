/**
 * Which cards a session asks for, out of everything it could.
 *
 * Host-side, like review.js and for the same reason (V2-5.9, V2-11.1): the
 * library shuffles whatever deck it is handed and knows nothing about boxes or
 * due dates, so deciding *which* cards make up that deck belongs out here.
 *
 * Review state selects rather than orders. Sorting the cards into due order and
 * handing that to mount() would not survive anyway — the deck is shuffled on
 * mount (V2-3.3), and it should be: a fixed order studied every session teaches
 * the order along with the cards. So this picks the set and lets the shuffle
 * arrange it, which is enough to keep the reader from meeting a card that is
 * not due while due ones are still waiting.
 */

import { isDue, reviewState } from "./review.js";

/**
 * How many cards one sitting asks for. A cap rather than the whole dictionary:
 * a session has no end (V2-3.5), so an uncapped deck of everything would simply
 * bury the overdue cards among cards that are not due yet.
 */
export const SESSION_LIMIT = 20;

/**
 * The cards to study, out of `cards`.
 *
 * Everything due, the most overdue first; and when nothing is due at all, the
 * cards closest to being due instead — so there is always something to study
 * and it is always the most useful thing available. Both are the same ordering,
 * which is why one sort serves both: ascending `dueAt` puts the longest-overdue
 * card and the soonest-due card at the same end.
 *
 * A card the reader has never graded reads as box 0, due now (V2-11.7), so a
 * fresh deck is entirely "due" and comes back in its own arbitrary order.
 *
 * `storage` and `now` are injectable for the same reason they are in review.js.
 */
export function chooseSession(cards, { now = Date.now(), limit = SESSION_LIMIT, storage } = {}) {
  /* Read each card's schedule once: reviewState goes to storage every call, and
     a sort asks about the same card many times over. */
  const state = new Map(cards.map((card) => [card, reviewState(card.key, storage, now)]));

  const sorted = [...cards].sort((a, b) => state.get(a).dueAt - state.get(b).dueAt);
  const due = sorted.filter((card) => isDue(state.get(card), now));

  return (due.length > 0 ? due : sorted).slice(0, limit);
}
