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
 * Whether `a` and `b` describe the same card — every field, not just the ones
 * one side happens to carry, so a field dropped from a deck's word list is a
 * change too.
 */
function sameCard(a, b) {
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

/**
 * Merge a deck into its dictionary and return the cards to display.
 *
 * A card the dictionary has not seen is written to it. A card it has seen is
 * updated from the deck's copy — a word list is allowed to fix a typo or
 * reword a translation, and readers should see that the next time they open
 * the deck, not the version frozen from their first visit. `dictionary` is
 * the one field this does not touch: it stays whatever it was first set to,
 * the same way it always has, since a deck passing a different one for the
 * same key is a mistake to shrug off rather than a real move to another
 * dictionary. Cards without a `key` are displayed but not stored.
 *
 * Storage is only rewritten when something in it actually changed —
 * `writeMap` serializes the whole dictionary, so paying that cost on every
 * visit to an unchanged deck would be wasteful.
 */
export function syncCards(cards, storage = pageStorage()) {
  const stored = readMap(storage, STORAGE_KEY);
  let changed = false;

  const resolved = cards.map((card) => {
    if (!card.key) return card;

    const known = storedCard(stored, card.key);
    const merged = known ? { ...card, dictionary: known.dictionary } : card;

    /* Anything unusable under this key, or genuinely different from it, is
       replaced rather than left to break every future visit the same way. */
    if (known && sameCard(merged, known)) return known;

    stored[card.key] = merged;
    changed = true;
    return merged;
  });

  if (changed) writeMap(storage, STORAGE_KEY, stored);

  return resolved;
}
