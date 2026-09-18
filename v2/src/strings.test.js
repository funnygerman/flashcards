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

  /* Every word the menu is made of, group by group (§16), so a language that
     gains a row keeps the others rather than quietly losing one. */
  const MENU = {
    side: ["front", "back", "random"],
    pool: ["deck", "all"],
    scope: ["due", "every"],
  };

  it.each(LANGS)("gives %s the same shape as English: labels, a done card and five guide cards", (lang) => {
    const strings = stringsFor(lang);

    expect(typeof strings.menu.open).toBe("string");
    expect(strings.menu.open.length).toBeGreaterThan(0);
    expect(strings.guide).toHaveLength(5);

    for (const level of ["easier", "harder"]) {
      expect(typeof strings.grades[level]).toBe("string");
      expect(strings.grades[level].length).toBeGreaterThan(0);
    }

    for (const [group, rows] of Object.entries(MENU)) {
      expect(Object.keys(strings.menu[group]).sort()).toEqual([...rows].sort());

      for (const row of rows) expect(strings.menu[group][row].length).toBeGreaterThan(0);
    }

    for (const card of [...strings.guide, strings.done]) {
      expect(Object.keys(card).sort()).toEqual(["backDetails", "backText", "category", "frontDetails", "frontText"]);
      for (const value of Object.values(card)) expect(value.length).toBeGreaterThan(0);
    }
  });

  /* A grading gesture that is dropped leaves the card with nothing to show —
     nothing about it moves — so the page says it in words (V2-5.16, V2-5.17,
     V2-15.2). Keyed by the reason it answers, so the two cannot drift apart. */
  const REASONS = ["settled", "nothing"];

  it.each(LANGS)("carries a sentence for every refusal reason in %s", (lang) => {
    expect(Object.keys(stringsFor(lang).refusal).sort()).toEqual([...REASONS].sort());

    for (const reason of REASONS) expect(stringsFor(lang).refusal[reason].length).toBeGreaterThan(0);
  });

  /* They go on the band the grade labels go on, which across a phone-sized
     card holds about four words. */
  it.each(LANGS)("keeps every refusal short enough for the band in %s", (lang) => {
    for (const reason of REASONS) {
      expect(stringsFor(lang).refusal[reason].split(" ").length).toBeLessThanOrEqual(4);
    }
  });

  it("keeps no card keyed, in every language, the same as the English guide (V2-6.3)", () => {
    for (const lang of LANGS) {
      for (const card of [...stringsFor(lang).guide, stringsFor(lang).done]) expect(card.key).toBeUndefined();
    }
  });
});
