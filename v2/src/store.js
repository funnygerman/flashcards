/**
 * The card dictionary in local storage.
 *
 * Every card the reader has ever opened accumulates under one key, so a later
 * dictionary view and the review step have something to read. This module only
 * remembers cards; it does not track progress — see review.js for that.
 */

import { pageStorage, readMap, writeMap } from "./storage.js";

export const STORAGE_KEY = "flashcards.cards";

/**
 * The card stored under `key`, or null if there is nothing usable there.
 * `Object.hasOwn` rather than `in`, so a card keyed `constructor` or `toString`
 * reads its own entry instead of one inherited from Object.prototype.
 */
function storedCard(stored, key) {
  if (!Object.hasOwn(stored, key)) return null;

  const card = stored[key];
  return card && typeof card === "object" ? card : null;
}

/**
 * Every card belonging to one dictionary, as a deck.
 *
 * This is what V2-6.6 said a dictionary view was groundwork for: a page with
 * no cards of its own studies all of them (§13). Unusable entries are skipped
 * rather than handed on — the same posture syncCards takes when it reads one
 * back — and storage that is absent, blocked or corrupt gives an empty deck.
 *
 * `dictionary` splits one storage bucket into several non-overlapping
 * dictionaries — a reader learning English and French wants two, not one
 * that mixes both (V2-13.7). Left unset, it matches only cards that carry no
 * dictionary of their own, which is every card written before this existed:
 * an old, undivided storage bucket reads exactly as it always did, not as
 * suddenly empty.
 */
export function allCards(storage = pageStorage(), dictionary = undefined) {
  const stored = readMap(storage, STORAGE_KEY);

  return Object.keys(stored)
    .map((key) => storedCard(stored, key))
    .filter(Boolean)
    .filter((card) => card.dictionary === dictionary);
}

/**
 * Whether the same `dictionary` holds a card that `cards` does not.
 *
 * What a deck page really wants to know before offering a link to it (§13):
 * not "how many decks are there" — storage records cards, not decks
 * (V2-13.7) — but "would that link show the reader anything they cannot see
 * here?". False for the only deck a reader has ever opened, and false again
 * where storage is unusable, since a dictionary that cannot be read has
 * nothing to offer either. Scoped to `dictionary` for the same reason
 * `allCards` is: a card belonging to a different one is not "more" to offer,
 * it is a different dictionary.
 */
export function holdsMoreThan(cards, storage = pageStorage(), dictionary = undefined) {
  const own = new Set(cards.map((card) => card.key));

  return allCards(storage, dictionary).some((card) => !own.has(card.key));
}

/**
 * Merge a deck into its dictionary and return the cards to display.
 *
 * A card the dictionary has not seen is written to it; a card it has seen is
 * loaded from it. Card content is assumed not to change, so the stored copy
 * wins — `dictionary` included, first write settling it the same way a
 * disagreement over `frontText` would: whichever deck this reader opened
 * first keeps it, even if a later deck passes a different one for the same
 * key. Cards without a `key` are displayed but not stored.
 */
export function syncCards(cards, storage = pageStorage()) {
  const stored = readMap(storage, STORAGE_KEY);
  let added = false;

  const resolved = cards.map((card) => {
    if (!card.key) return card;

    const known = storedCard(stored, card.key);
    if (known) return known;

    /* Anything unusable under this key is replaced rather than left to break
       every future visit the same way. */
    stored[card.key] = card;
    added = true;
    return card;
  });

  if (added) writeMap(storage, STORAGE_KEY, stored);

  return resolved;
}
