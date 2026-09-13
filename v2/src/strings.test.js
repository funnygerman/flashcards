import { describe, expect, it } from "vitest";

import { DEFAULT_LANG, stringsFor } from "./strings.js";

const LANGS = ["en", "de", "ru"];

describe("stringsFor", () => {
  it("falls back to English for an unknown language", () => {
    expect(stringsFor("xx")).toBe(stringsFor(DEFAULT_LANG));
  });

  it("falls back to English when no language is given", () => {
    expect(stringsFor(undefined)).toBe(stringsFor(DEFAULT_LANG));
  });

  it.each(LANGS)("gives %s the same shape as English: allLabel and five guide cards", (lang) => {
    const strings = stringsFor(lang);

    expect(typeof strings.allLabel).toBe("string");
    expect(strings.allLabel.length).toBeGreaterThan(0);
    expect(strings.guide).toHaveLength(5);

    for (const card of strings.guide) {
      expect(Object.keys(card).sort()).toEqual(["backDetails", "backText", "category", "frontDetails", "frontText"]);
      for (const value of Object.values(card)) expect(value.length).toBeGreaterThan(0);
    }
  });

  /* The refusal message went when the refusal did: a grade takes the card away
     and `previous` brings it back to be changed, so no gesture is dropped and
     there is nothing for the card to say about one (V2-15.2). */
  it.each(LANGS)("carries no refusal message for %s", (lang) => {
    expect(stringsFor(lang).settled).toBeUndefined();
  });

  it("keeps no card keyed, in every language, the same as the English guide (V2-6.3)", () => {
    for (const lang of LANGS) {
      for (const card of stringsFor(lang).guide) expect(card.key).toBeUndefined();
    }
  });
});
