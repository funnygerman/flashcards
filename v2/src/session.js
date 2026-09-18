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

import { gradedToday, isDue, reviewState } from "./review.js";

/**
 * How many cards one sitting asks for. A cap rather than the whole dictionary:
 * an uncapped deck of everything would simply bury the overdue cards among
 * cards that are not due yet. It is a sitting's worth and not the day's — a
 * session worked all the way through is dealt again out of what is left
 * (V2-13.15), so the cap chunks the work rather than ending it.
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
 * `onlyUnanswered` drops the cards the reader has already graded today
 * (V2-13.14). It is the selection half of "one grade per card per day"
 * (V2-11.10): a card that has had its answer cannot be graded again today
 * (V2-5.16), so a session that offered it would be offering a card nothing can
 * be done with — which is exactly what a reader reloading part-way through a
 * finished session used to get, the whole deck dealt back to them with every
 * card refusing them. It is a separate question from `onlyDue` because a
 * `harder` grade puts a card in box 0, due immediately: the schedule says yes
 * and the day says no, and it is the day that has the final word.
 *
 * The two are set independently because the reader's own filter (V2-13.13)
 * turns the schedule off and not the day: "every card" means every card in the
 * pool, today's answered ones included and wearing their marks, which is where
 * a reader meets `V2-5.16`'s refusal at all. Only a session dealt *again*, a
 * spent one having run out (V2-13.15), asks for unanswered cards regardless of
 * the schedule.
 *
 * `storage` and `now` are injectable for the same reason they are in review.js.
 */
export function chooseSession(
  cards,
  { now = Date.now(), limit = SESSION_LIMIT, storage, onlyDue = false, onlyUnanswered = false } = {},
) {
  /* Read each card's schedule once: reviewState goes to storage every call, and
     a sort asks about the same card many times over. */
  const state = new Map(cards.map((card) => [card, reviewState(card.key, storage, now)]));
  const sorted = [...cards].sort((a, b) => state.get(a).dueAt - state.get(b).dueAt);

  const wanted = (card) =>
    (!onlyDue || isDue(state.get(card), now)) && (!onlyUnanswered || !gradedToday(card.key, storage, now));

  const chosen = onlyDue || onlyUnanswered ? sorted.filter(wanted) : sorted;

  return chosen.slice(0, limit);
}
