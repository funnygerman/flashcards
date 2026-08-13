/**
 * The card dictionary in local storage.
 *
 * Every card the reader has ever opened accumulates under one key, so a later
 * dictionary view and the review step have something to read. This module only
 * remembers cards; it does not track progress yet.
 */

export const STORAGE_KEY = "flashcards.cards";

/** The stored `{ [key]: card }` map, or an empty one if it is missing or unusable. */
function read(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    /* Absent, corrupt, or blocked storage all mean the same thing: start empty. */
    return {};
  }
}

/**
 * Merge a deck into the dictionary and return the cards to display.
 *
 * A card the dictionary has not seen is written to it; a card it has seen is
 * loaded from it. Card content is assumed not to change, so the stored copy
 * wins. Cards without a `key` are displayed but not stored.
 */
export function syncCards(cards, storage) {
  const stored = read(storage);
  let added = false;

  const resolved = cards.map((card) => {
    if (!card.key) return card;
    if (card.key in stored) return stored[card.key];

    stored[card.key] = card;
    added = true;
    return card;
  });

  if (added) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* Full or blocked storage costs persistence, not the session. */
    }
  }

  return resolved;
}
