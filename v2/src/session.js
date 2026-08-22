/**
 * Which cards a session asks for, out of everything it could.
 *
 * Host-side, like review.js and for the same reason (V2-5.9, V2-11.1): the
 * library shuffles whatever deck it is handed and knows nothing about boxes or
 * due dates, so deciding *which* cards make up that deck belongs out here.
 *
 * A deck and the dictionary both study what is due, out of their own pool of
 * cards — a deck's own, the dictionary every card the reader has ever opened
 * (V2-13.4). `onlyDue` stays a parameter rather than an assumption: a future
 * "study everything in this deck regardless of schedule" mode wants the same
 * selection with it turned off, not a second function. Both take at most a
 * sitting's worth, and both take it in the order of what wants studying most.
 *
 * Review state selects rather than orders. Sorting the cards into due order and
 * handing that to mount() would not survive anyway — the deck is shuffled on
 * mount (V2-3.3), and it should be: a fixed order studied every session teaches
 * the order along with the cards. So this picks the set and lets the shuffle
 * arrange it, which is enough for what the order was for — keeping the cards
 * that want studying most inside the sitting, rather than dictating which of
 * them comes first.
 */

import { isDue, reviewState } from "./review.js";

/**
 * How many cards one sitting asks for. A cap rather than the whole dictionary:
 * a session has no end (V2-3.5), so an uncapped deck of everything would simply
 * bury the overdue cards among cards that are not due yet.
 */
export const SESSION_LIMIT = 50;

/**
 * The cards to study, out of `cards`.
 *
 * Ordered by how much they want studying: ascending `dueAt`, which puts the
 * longest-overdue card first and — past the ones that are due — the soonest-due
 * next. A card the reader has never graded reads as box 0, due now (V2-11.7),
 * so an unopened deck is entirely "due" and comes back in its own arbitrary
 * order, and in a large deck the cards never seen lead the ones already
 * scheduled into the future.
 *
 * `onlyDue` narrows the pool to cards that are due, out of everything passed
 * in (V2-13.4). `openDeck` sets it for both a deck and the dictionary, because
 * "all of it" is not a session either way; cards that are not due are held
 * back unless nothing at all is due, in which case the nearest are better
 * than an empty deck (V2-13.5). Left off — the default — nothing is held
 * back, which is what a mode for browsing or cramming a deck regardless of
 * its schedule would want.
 *
 * `storage` and `now` are injectable for the same reason they are in review.js.
 */
export function chooseSession(cards, { now = Date.now(), limit = SESSION_LIMIT, storage, onlyDue = false } = {}) {
  /* Read each card's schedule once: reviewState goes to storage every call, and
     a sort asks about the same card many times over. */
  const state = new Map(cards.map((card) => [card, reviewState(card.key, storage, now)]));
  const sorted = [...cards].sort((a, b) => state.get(a).dueAt - state.get(b).dueAt);

  if (!onlyDue) return sorted.slice(0, limit);

  const due = sorted.filter((card) => isDue(state.get(card), now));
  return (due.length > 0 ? due : sorted).slice(0, limit);
}
