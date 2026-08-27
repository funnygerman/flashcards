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
 * the article dropped: `das Wasser`/`water` filed as `wasser-water`. Reproducing
 * the ones already written by hand, rather than inventing a new scheme, is the
 * whole argument for deriving at all.
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
 *
 * This file is imported directly, at this path, by the CSV tooling in
 * `funnygerman/wortschatz` — fetched live from this project's deployed site
 * rather than copied, so the two can never disagree about what a key is. Moving
 * or renaming it, or changing what `deriveKey`/`slug` take or return, breaks
 * that import with no warning on this side. Keep the path and the signatures
 * stable, or update that project in the same change.
 */

/**
 * The words `slug` will drop from the front of a card's text, given them.
 *
 * German, because these decks are German — but named and passed in rather than
 * built in, because nothing else here is language-specific and this was.
 * Hard-coded, the rule quietly mangled any deck whose text was not German:
 * `die young` filed as `young`, `das casas` as `casas`, and the author would
 * never see it happen. A list a deck opts into cannot do that to a deck that
 * did not ask for it.
 */
export const GERMAN_ARTICLES = ["der", "die", "das"];

/** Built once per list — `slug` runs twice a card, and this is a regex. */
const patterns = new Map();

function articlePattern(articles) {
  if (!articles || articles.length === 0) return null;

  const cacheKey = articles.join("\u0000");
  let pattern = patterns.get(cacheKey);

  if (!pattern) {
    /* Escaped, since an article is a caller's string and this is a regex. */
    const alternatives = articles
      .map((article) => String(article).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    pattern = new RegExp(`^(?:${alternatives})\\s+`);
    patterns.set(cacheKey, pattern);
  }

  return pattern;
}

/**
 * One side of a card, as a key fragment.
 *
 * A card's own script is kept, not transliterated: `fünf` stays `fünf`,
 * `хороший` stays `хороший`, `σπίτι` stays `σπίτι`. A transliteration table
 * was tried first and dropped — one was needed per script (German's umlauts,
 * Cyrillic, eventually Greek, Arabic, Hebrew, Devanagari, ...), each with its
 * own house style to invent and maintain, and every one of them was pure
 * guesswork for a script nobody had written a rule for yet. Keeping the script
 * needs none of that: `\p{L}` already knows what a letter is in every one of
 * them.
 *
 * `\p{M}` — combining marks — stay too, and separately from `\p{L}`, because a
 * mark is not a letter of its own: Arabic's harakat, Hebrew's niqqud, and the
 * vowel signs of Devanagari and Thai are marks that combine with the letter
 * before them. Folding them into "not a letter" and stripping them, the way an
 * accent on a Latin letter might be, would shatter `بَيْت` into `ب-ي-ت` — three
 * hyphen-joined letters standing in for one word, only because Arabic happens
 * to write its short vowels as marks rather than letters.
 *
 * `.normalize("NFC")` first, because two spellings of the same word can be
 * different strings: `schön` typed on one system and `schön` pasted from
 * another can be `ö` as one code point or `o` plus a separate combining
 * diaeresis — visually identical, `===` false. Normalizing before slugging
 * means both give the same key; skipping it would key the same card two ways
 * depending on where the text came from, with nothing to see in an editor that
 * says why.
 *
 * A leading article in `articles` goes, since `das Wasser` and `wasser` are the
 * same word filed twice. Only where something follows it: a deck teaching `die`
 * as a word in its own right keeps it, because there the article is the card.
 *
 * Nothing is dropped unless a caller asks. This used to strip `der|die|das`
 * always, which is right for German and silently wrong for everything else —
 * an English `die young` filed as `young`, a Portuguese `das casas` as `casas`,
 * with nothing to see in the key that says why. Opting in is what keeps a rule
 * about one language from reaching a deck written in another.
 */
export function slug(text, articles = []) {
  const pattern = articlePattern(articles);
  let out = String(text ?? "").toLowerCase();

  if (pattern) out = out.replace(pattern, "");

  return out
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
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
export function deriveKey(card, articles = []) {
  return [slug(card.frontText, articles), slug(card.backText, articles)].filter(Boolean).join("-");
}

/**
 * `cards` with a key on each, deriving only where one is missing.
 *
 * An explicit key wins outright — it is the pin described above, and a deck
 * that carries one is a deck whose text can be edited freely. A derived key
 * that comes out empty is dropped rather than set, so the card stays keyless in
 * the sense V2-6.3 means, instead of keyed to the empty string.
 */
export function keyed(cards, articles = []) {
  return cards.map((card) => {
    if (card.key) return card;

    const derived = deriveKey(card, articles);
    return derived ? { ...card, key: derived } : card;
  });
}
