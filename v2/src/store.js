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
 * Merge a deck into the dictionary and return the cards to display.
 *
 * A card the dictionary has not seen is written to it; a card it has seen is
 * loaded from it. Card content is assumed not to change, so the stored copy
 * wins. Cards without a `key` are displayed but not stored.
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
