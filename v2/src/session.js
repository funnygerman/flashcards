/**
 * Which cards a session asks for, out of everything it could.
 *
 * Host-side, like review.js and for the same reason (V2-5.9, V2-11.1): the
 * library shuffles whatever deck it is handed and knows nothing about boxes or
 * due dates, so deciding *which* cards make up that deck belongs out here.
 *
 * A deck and the dictionary both study what is due, out of their own pool of
 * cards — a deck's own, the dictionary every card the reader has ever opened
 * (V2-13.4). `onlyDue` is what the reader's own filter turns off (V2-13.12):
 * with it on, a session is exactly what wants repeating today and nothing
 * else; with it off, the same pool regardless of schedule, which is what
 * browsing or cramming a deck asks for. Both take at most a sitting's worth,
 * and both take it in the order of what wants studying most.
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
 * "all of it" is not a session either way — and it narrows without a floor: a
 * pool with nothing due selects nothing at all, rather than standing the
 * nearest-due cards in (V2-13.5 withdrawn). Being shown a card the schedule
 * had put a fortnight away, because there was nothing else to show, is what
 * readers reported as the app not respecting its own stars. What a page does
 * with an empty selection is the page's business, not this module's
 * (V2-13.12). Left off — the default — nothing is held back, which is the
 * reader's own "every card, regardless of stars" filter (V2-13.13).
 *
 * `storage` and `now` are injectable for the same reason they are in review.js.
 */
export function chooseSession(cards, { now = Date.now(), limit = SESSION_LIMIT, storage, onlyDue = false } = {}) {
  /* Read each card's schedule once: reviewState goes to storage every call, and
     a sort asks about the same card many times over. */
  const state = new Map(cards.map((card) => [card, reviewState(card.key, storage, now)]));
  const sorted = [...cards].sort((a, b) => state.get(a).dueAt - state.get(b).dueAt);

  const chosen = onlyDue ? sorted.filter((card) => isDue(state.get(card), now)) : sorted;

  return chosen.slice(0, limit);
}
