/**
 * A card's key, derived from the card.
 *
 * `key` is the card's identity in storage and opaque to the library (V2-2.3):
 * nothing reads it, nothing displays it, and nothing derives meaning from it.
 * That is exactly why it can be derived *into* — a deck author who omits it is
 * not withholding information the library wanted, only the label it will file
 * the card under.
 *
 * And it was always a label they were writing by hand. Every key in both decks
 * this repository ships is the front word and the back word, hyphenated, with
 * the article dropped: `das Wasser`/`water` filed as `wasser-water`. Thirty-five
 * of thirty-seven were reproduced exactly by the rule below before a line of it
 * was wired up, which is the argument for it — not that this is a good scheme,
 * but that it is already the scheme, transcribed by hand once per card.
 *
 * Front *and* back, rather than the front alone, because the front is not
 * unique: `laufen` is two cards, `to run` and `to operate`, and a key derived
 * from the front would collide them into one schedule. It is the pair that
 * identifies a card, which is also why the pair is what the existing keys are
 * made of.
 *
 * **A derived key moves when the text it is derived from moves.** V2-6.2 lets a
 * word list fix a typo or reword a translation and expects readers to see it;
 * do that to a card whose key is derived and the card is not corrected but
 * replaced — a new key, an empty schedule, and the old entry left in the
 * dictionary with nobody to claim it. So derivation is for a card being written
 * for the first time. Once written, pin it: an explicit `key` always wins
 * (`keyed` below never overwrites one), and pinning is what makes the text safe
 * to edit afterwards. A deck generated from a word list should have its keys
 * derived once, at the moment a row is added, and written back into the list.
 */

/** German-aware, because the words being filed are German. */
const TRANSLITERATIONS = [
  [/ä/g, "ae"],
  [/ö/g, "oe"],
  [/ü/g, "ue"],
  [/ß/g, "ss"],
];

/**
 * One side of a card, as a key fragment.
 *
 * The umlauts are spelled out before the accents are stripped, and that order
 * is the whole point: `fünf` is `fuenf`, the way German writes it without the
 * diaeresis, not `funf`, which is what dropping the mark would give. Anything
 * else carrying a mark — a `café`, a borrowed `naïve` — has no such convention,
 * so the mark simply comes off.
 *
 * The definite article goes, since `das Wasser` and `wasser` are the same word
 * filed twice. Only where something follows it: a deck teaching `die` as a word
 * in its own right keeps it, because the article is the card.
 */
export function slug(text) {
  let out = String(text ?? "")
    .toLowerCase()
    .replace(/^(der|die|das)\s+/, "");

  for (const [pattern, replacement] of TRANSLITERATIONS) out = out.replace(pattern, replacement);

  return out
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The key `card` would be filed under, or "" if its text yields none.
 *
 * Empty rather than a fallback, because there is no honest fallback: a key made
 * from a counter or a hash would be unique and meaningless, and would differ
 * between two decks naming the same word — which is the one thing a key must
 * not do (V2-13.7). A card that cannot be filed is better left unfiled, and
 * V2-6.3 already says what that means: displayed, not stored.
 */
export function deriveKey(card) {
  return [slug(card.frontText), slug(card.backText)].filter(Boolean).join("-");
}

/**
 * `cards` with a key on each, deriving only where one is missing.
 *
 * An explicit key wins outright — it is the pin described above, and a deck
 * that carries one is a deck whose text can be edited freely. A derived key
 * that comes out empty is dropped rather than set, so the card stays keyless in
 * the sense V2-6.3 means, instead of keyed to the empty string.
 */
export function keyed(cards) {
  return cards.map((card) => {
    if (card.key) return card;

    const derived = deriveKey(card);
    return derived ? { ...card, key: derived } : card;
  });
}
