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

  it("spells an umlaut out the way German does, instead of dropping the mark", () => {
    expect(slug("fünf")).toBe("fuenf");
    expect(slug("spät")).toBe("spaet");
    expect(slug("Löwe")).toBe("loewe");
    expect(slug("Straße")).toBe("strasse");
  });

  it("drops a mark that carries no such convention", () => {
    expect(slug("Café")).toBe("cafe");
  });

  it("leaves no punctuation, and no hyphen at either end", () => {
    expect(slug("Wie spät ist es?")).toBe("wie-spaet-ist-es");
    expect(slug("— nicht! —")).toBe("nicht");
  });

  it("has nothing to say about text it cannot spell", () => {
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
      ["fünf", "five", "fuenf-five"],
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
