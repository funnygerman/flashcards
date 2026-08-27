/**
 * Following a card whose key has changed.
 *
 * A key is a card's identity in storage, and the reader's copy of it is the
 * only copy: their schedule and their dictionary live in their own browser,
 * filed under whatever key the deck named the day they first opened it. So
 * renaming a key is not an edit to a word list, it is an edit to data this
 * project cannot reach — do it plainly and the card does not move, it is
 * replaced. The reader gets an empty schedule for a word they have known for a
 * month, and the entry they built keeps turning up in the dictionary as a
 * duplicate nobody can grade away.
 *
 * `wasKey` is the deck author saying which entry the card used to be, so the
 * rename is carried out in the reader's storage instead of merely happening to
 * them:
 *
 * ```js
 * { key: "hundert-one-hundred", wasKey: "hundert-a-hundred", frontText: "hundert", backText: "one hundred" }
 * ```
 *
 * On the reader's next visit the entry filed under `hundert-a-hundred` is moved
 * to `hundert-one-hundred`, in both the dictionary and the schedule, and the
 * card carries on with the box it had.
 *
 * A key that never changes needs nothing here — most do not, and that is the
 * cheap case. This exists for the ones that have to: a typo baked into a key, a
 * key written before a naming convention settled, an old one being brought into
 * line with the rest of a word list.
 *
 * It costs nothing after it has run. The old entry is gone once it is moved, so
 * the next visit finds nothing to move and does nothing, and a reader who never
 * had the old key never had anything to move in the first place. That is why
 * there is no flag recording that a migration happened: the absence of the old
 * entry is the record.
 */

import { STORAGE_KEY as CARDS_KEY } from "./store.js";
import { STORAGE_KEY as REVIEW_KEY } from "./review.js";
import { pageStorage, readMap, writeMap } from "./storage.js";

/**
 * The renames `cards` ask for, as `[from, to]` pairs.
 *
 * `wasKey` takes one key or several, because a card can be renamed more than
 * once over its life and the second rename must not strand readers who never
 * made the first: a card that went `a` → `b` → `c` says `wasKey: ["b", "a"]`
 * and collects either. A card renamed onto its own key asks for nothing.
 */
function renames(cards) {
  const pairs = [];

  for (const card of cards) {
    if (!card.key || !card.wasKey) continue;

    for (const from of [card.wasKey].flat()) {
      if (from && from !== card.key) pairs.push([from, card.key]);
    }
  }

  return pairs;
}

/**
 * Carry `pairs` out in one storage bucket.
 *
 * Where the new key is already taken, the old entry is dropped rather than
 * merged or kept. Kept, it would outlive the rename in the dictionary as a
 * card no deck can name any more and no reader can get rid of — which is the
 * duplicate this module exists to prevent. Merged, it would need a rule for
 * which of two boxes is the truth, and there isn't one worth inventing: the
 * entry under the current key is the one the reader has been grading since the
 * rename, so it wins.
 *
 * `heal` rewrites the moved value's own `key` field, which the dictionary's
 * entries carry and the schedule's do not. syncCards would correct it a moment
 * later anyway, for a card in the deck being opened; doing it here means the
 * bucket is never briefly self-inconsistent for anything else that reads it.
 */
function renameIn(storage, bucket, pairs, heal) {
  const stored = readMap(storage, bucket);
  let changed = false;

  for (const [from, to] of pairs) {
    if (!Object.hasOwn(stored, from)) continue;

    if (!Object.hasOwn(stored, to)) {
      const moved = stored[from];
      stored[to] = heal && moved && typeof moved === "object" ? { ...moved, key: to } : moved;
    }

    delete stored[from];
    changed = true;
  }

  if (changed) writeMap(storage, bucket, stored);
}

/**
 * Carry out every rename `cards` ask for, and hand back the cards without the
 * `wasKey` that asked.
 *
 * Stripped because `wasKey` is a note between the deck author and this
 * function, not content: it is not shown, and storing it would make it part of
 * what syncCards compares two copies of a card by (V2-6.2), so adding or
 * removing the note would read as the card itself having changed.
 *
 * Both buckets, separately, because they are independent by design (V2-6.6) —
 * a reader can easily have a schedule for a card whose dictionary entry was
 * lost to a bad write, or the reverse, and each is worth moving on its own.
 */
export function migrateKeys(cards, storage = pageStorage()) {
  const pairs = renames(cards);

  if (pairs.length > 0) {
    renameIn(storage, CARDS_KEY, pairs, true);
    renameIn(storage, REVIEW_KEY, pairs, false);
  }

  /* Per card, so a deck that asks for no rename is handed back the very
     objects it passed in rather than copies of them. */
  return cards.map((card) => {
    if (!card.wasKey) return card;

    const stripped = { ...card };
    delete stripped.wasKey;
    return stripped;
  });
}
