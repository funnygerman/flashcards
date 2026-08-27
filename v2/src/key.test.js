import { describe, expect, it } from "vitest";

import { deriveKey, keyed, slug } from "./key.js";

describe("slug", () => {
  it("lower-cases and hyphenates", () => {
    expect(slug("guten Morgen")).toBe("guten-morgen");
  });

  it("drops the definite article, which is not part of the word", () => {
    expect(slug("das Wasser")).toBe("wasser");
    expect(slug("der Montag")).toBe("montag");
    expect(slug("die Katze")).toBe("katze");
  });

  it("keeps an article that is the card, rather than the card's", () => {
    expect(slug("die")).toBe("die");
  });

  it("keeps a card's own script rather than transliterating it", () => {
    expect(slug("fünf")).toBe("fünf");
    expect(slug("Straße")).toBe("straße");
    expect(slug("хороший")).toBe("хороший");
    expect(slug("σπίτι")).toBe("σπίτι");
  });

  it("keeps a combining mark attached to its letter instead of stripping it", () => {
    /* Arabic's harakat, Hebrew's niqqud, and the vowel signs of Devanagari and
       Thai combine with the letter before them -- folding a mark into "not a
       letter" and stripping it, the way an accent might be, would shatter one
       word into several hyphen-joined letters instead of leaving it whole. */
    const arabicWithHarakat = "\u0628\u064E\u064A\u0652\u062A";
    const hebrewWithNiqqud = "\u05D1\u05B7\u05BC\u05D9\u05B4\u05EA";
    const devanagariWithMatra = "\u0915\u093F\u0924\u093E\u092C";

    expect(slug(arabicWithHarakat)).toBe(arabicWithHarakat);
    expect(slug(hebrewWithNiqqud)).toBe(hebrewWithNiqqud);
    expect(slug(devanagariWithMatra)).toBe(devanagariWithMatra);
  });

  it("treats two spellings of the same word as the same key", () => {
    /* "schön" typed on one system and pasted from another can be `ö` as one
       code point (NFC) or `o` plus a combining diaeresis (NFD) — visually
       identical, `===` false, and a naive slug would key the same card two
       ways depending on where the text came from. */
    const nfc = "schön";
    const nfd = "schön";

    expect(nfc).not.toBe(nfd);
    expect(slug(nfc)).toBe(slug(nfd));
  });

  it("leaves no punctuation, and no hyphen at either end", () => {
    expect(slug("Wie spät ist es?")).toBe("wie-spät-ist-es");
    expect(slug("— nicht! —")).toBe("nicht");
  });

  it("has nothing to say about text it cannot spell a key from", () => {
    expect(slug("…")).toBe("");
    expect(slug(undefined)).toBe("");
  });
});

describe("deriveKey", () => {
  it("files a card under both its words", () => {
    expect(deriveKey({ frontText: "das Wasser", backText: "water" })).toBe("wasser-water");
  });

  it("keeps two cards sharing a front apart, which the front alone could not", () => {
    const run = deriveKey({ frontText: "laufen", backText: "to run" });
    const operate = deriveKey({ frontText: "laufen", backText: "to operate" });

    expect(run).toBe("laufen-to-run");
    expect(operate).toBe("laufen-to-operate");
  });

  /* The same guarantee, but for a deck whose back text is not in Latin script
     at all — the collision a front-only or transliterated key would miss. */
  it("keeps two cards sharing a front apart in a non-Latin dictionary too", () => {
    const one = deriveKey({ frontText: "gleich", backText: "одинаковый" });
    const other = deriveKey({ frontText: "gleich", backText: "сразу" });

    expect(one).not.toBe(other);
  });

  it("keeps a script the rule was never told about, rather than dropping it", () => {
    expect(deriveKey({ frontText: "das Haus", backText: "σπίτι" })).toBe("haus-σπίτι");
    expect(deriveKey({ frontText: "das Haus", backText: "بيت" })).toBe("haus-بيت");
  });

  it("ignores the details, so a reworded hint does not move the card", () => {
    const bare = { frontText: "schnell", backText: "fast" };

    expect(deriveKey({ ...bare, backDetails: "also: quick" })).toBe(deriveKey(bare));
  });

  it("gives no key at all rather than a meaningless one", () => {
    expect(deriveKey({ frontText: "…", backText: "???" })).toBe("");
  });

  it("reproduces the keys both shipped decks were written with by hand", () => {
    const written = [
      ["guten Morgen", "good morning", "guten-morgen-good-morning"],
      ["auf Wiedersehen", "goodbye", "auf-wiedersehen-goodbye"],
      ["sein", "to be", "sein-to-be"],
      ["das Haus", "house", "haus-house"],
      ["die Katze", "cat", "katze-cat"],
      ["schlecht", "bad", "schlecht-bad"],
      ["der Samstag", "Saturday", "samstag-saturday"],
      ["morgen", "tomorrow", "morgen-tomorrow"],
    ];

    for (const [frontText, backText, key] of written) {
      expect(deriveKey({ frontText, backText })).toBe(key);
    }
  });
});

describe("keyed", () => {
  it("fills in a key where a card has none", () => {
    expect(keyed([{ frontText: "das Brot", backText: "bread" }])).toEqual([
      { key: "brot-bread", frontText: "das Brot", backText: "bread" },
    ]);
  });

  it("never overwrites a pinned key, which is what makes the text safe to edit", () => {
    const pinned = { key: "hundert-hundred", frontText: "hundert", backText: "a hundred" };

    expect(keyed([pinned])).toEqual([pinned]);
  });

  it("leaves the card it cannot key alone, rather than keying it to nothing", () => {
    const unkeyable = { frontText: "…", backText: "???" };

    expect(keyed([unkeyable])).toEqual([unkeyable]);
    expect(keyed([unkeyable])[0]).not.toHaveProperty("key");
  });

  it("leaves the cards it is given untouched", () => {
    const cards = [{ frontText: "gut", backText: "good" }];

    keyed(cards);

    expect(cards).toEqual([{ frontText: "gut", backText: "good" }]);
  });
});
