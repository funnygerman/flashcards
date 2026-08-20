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

  it.each(LANGS)("gives %s the same shape as English: settled, allLabel, four guide cards", (lang) => {
    const strings = stringsFor(lang);

    expect(typeof strings.settled).toBe("string");
    expect(strings.settled.length).toBeGreaterThan(0);
    expect(typeof strings.allLabel).toBe("string");
    expect(strings.allLabel.length).toBeGreaterThan(0);
    expect(strings.guide).toHaveLength(4);

    for (const card of strings.guide) {
      expect(Object.keys(card).sort()).toEqual(["backDetails", "backText", "category", "frontDetails", "frontText"]);
      for (const value of Object.values(card)) expect(value.length).toBeGreaterThan(0);
    }
  });

  it("keeps no card keyed, in every language, the same as the English guide (V2-6.3)", () => {
    for (const lang of LANGS) {
      for (const card of stringsFor(lang).guide) expect(card.key).toBeUndefined();
    }
  });
});
