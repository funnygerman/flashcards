import { beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY, allCards, syncCards } from "./store.js";

/** An in-memory Storage stand-in; `fail` makes both operations throw. */
function createStorage(initial = null, fail = false) {
  let value = initial;

  return {
    getItem: () => {
      if (fail) throw new Error("blocked");
      return value;
    },
    setItem: (_key, next) => {
      if (fail) throw new Error("blocked");
      value = next;
    },
    read: () => value,
  };
}

const card = { key: "wasser-water", frontText: "das Wasser", backText: "water" };

describe("syncCards", () => {
  let storage;

  beforeEach(() => {
    storage = createStorage();
  });

  it("stores cards the dictionary has not seen", () => {
    syncCards([card], storage);

    expect(JSON.parse(storage.read())).toEqual({ [card.key]: card });
  });

  it("overwrites the stored copy when the deck's has changed", () => {
    const stored = { ...card, backText: "water (stored)" };
    storage = createStorage(JSON.stringify({ [card.key]: stored }));

    expect(syncCards([card], storage)).toEqual([card]);
    expect(JSON.parse(storage.read())).toEqual({ [card.key]: card });
  });

  it("does not rewrite storage when the deck's copy matches what is stored", () => {
    const initial = JSON.stringify({ [card.key]: card });
    storage = createStorage(initial);

    expect(syncCards([card], storage)).toEqual([card]);
    expect(storage.read()).toBe(initial);
  });

  it("adds new cards to a dictionary that already holds others", () => {
    const other = { key: "brot-bread", frontText: "das Brot", backText: "bread" };
    storage = createStorage(JSON.stringify({ [other.key]: other }));

    syncCards([card], storage);

    expect(JSON.parse(storage.read())).toEqual({ [other.key]: other, [card.key]: card });
  });

  it("starts empty when the stored value is corrupt", () => {
    storage = createStorage("{not json");

    expect(syncCards([card], storage)).toEqual([card]);
    expect(JSON.parse(storage.read())).toEqual({ [card.key]: card });
  });

  it("starts empty when the stored value is not a map of cards", () => {
    storage = createStorage(JSON.stringify([card]));

    syncCards([card], storage);

    expect(JSON.parse(storage.read())).toEqual({ [card.key]: card });
  });

  it("reads a card keyed like an Object.prototype member as its own entry", () => {
    /* `"constructor" in {}` is true, so `in` would hand back the Object
       constructor and the card would render blank forever. */
    const named = { key: "constructor", frontText: "der Konstrukteur", backText: "the builder" };

    expect(syncCards([named], storage)).toEqual([named]);
    expect(JSON.parse(storage.read())).toEqual({ constructor: named });
  });

  it("replaces a stored entry that is not a card", () => {
    /* Left in place, a null entry breaks rendering on every future visit. */
    storage = createStorage(JSON.stringify({ [card.key]: null }));

    expect(syncCards([card], storage)).toEqual([card]);
    expect(JSON.parse(storage.read())).toEqual({ [card.key]: card });
  });

  it("shows keyless cards without storing them", () => {
    const keyless = { frontText: "no key", backText: "not stored" };

    expect(syncCards([keyless], storage)).toEqual([keyless]);
    expect(storage.read()).toBe(null);
  });

  it("still renders the deck when storage is unavailable", () => {
    storage = createStorage(null, true);

    expect(syncCards([card], storage)).toEqual([card]);
  });

  it("uses one storage key for the whole dictionary", () => {
    expect(STORAGE_KEY).toBe("flashcards.cards");
  });

  it("keeps the stored dictionary even while other fields are overwritten", () => {
    const stored = { ...card, backText: "water (stored)", dictionary: "french" };
    storage = createStorage(JSON.stringify({ [card.key]: stored }));

    const expected = { ...card, dictionary: "french" };
    expect(syncCards([{ ...card, dictionary: "german" }], storage)).toEqual([expected]);
    expect(JSON.parse(storage.read())).toEqual({ [card.key]: expected });
  });
});

/* What V2-6.6 said the dictionary was groundwork for: a deck page with no cards
   of its own studies all of them (§13). */
describe("allCards", () => {
  const other = { key: "brot-bread", frontText: "das Brot", backText: "bread" };

  it("gives back every card the dictionary holds", () => {
    const storage = createStorage();
    syncCards([card, other], storage);

    expect(allCards(storage)).toEqual([card, other]);
  });

  it("is empty for a reader who has opened nothing", () => {
    expect(allCards(createStorage())).toEqual([]);
  });

  it("skips an unusable entry rather than handing it on", () => {
    const storage = createStorage(JSON.stringify({ a: card, b: null, c: "not a card", d: other }));

    expect(allCards(storage)).toEqual([card, other]);
  });

  it("degrades to an empty deck when storage is unusable", () => {
    expect(allCards(createStorage(null, true))).toEqual([]);
    expect(allCards(createStorage("{ not json"))).toEqual([]);
  });

  it("reads a card keyed like an Object property, not one inherited from it", () => {
    const constructorCard = { key: "constructor", frontText: "der Konstruktor", backText: "constructor" };
    const storage = createStorage(JSON.stringify({ constructor: constructorCard }));

    expect(allCards(storage)).toEqual([constructorCard]);
  });

  /* Splitting one storage bucket into several non-overlapping dictionaries
     (V2-13.7): a reader learning English and French wants two, not one that
     mixes both. */
  describe("scoped to a dictionary", () => {
    const french = { ...card, dictionary: "french" };
    const german = { ...other, dictionary: "german" };

    it("matches only cards carrying the same dictionary", () => {
      const storage = createStorage(JSON.stringify({ [french.key]: french, [german.key]: german }));

      expect(allCards(storage, "french")).toEqual([french]);
      expect(allCards(storage, "german")).toEqual([german]);
    });

    it("matches only dictionary-less cards when no dictionary is asked for", () => {
      const storage = createStorage(JSON.stringify({ [french.key]: french, [other.key]: other }));

      expect(allCards(storage)).toEqual([other]);
    });

    it("reads an old, undivided storage bucket exactly as it always did", () => {
      const storage = createStorage();
      syncCards([card, other], storage);

      expect(allCards(storage)).toEqual([card, other]);
    });
  });
});

/* Whether a deck page should offer a link to the dictionary at all: not "how
   many decks are there" — storage records cards, not decks (V2-13.7) — but
   "would that link show the reader anything they cannot see here?". */

/* V2-6.4: storage holding something that is not a card degrades to an empty
   dictionary. Any non-null object used to pass, and the dictionary dealt it to
   the reader as a blank card with a progress row under it. */
describe("allCards, an entry that is not a card", () => {
  const bucket = (entries) => createStorage(JSON.stringify(entries));

  it.each([
    ["an empty object", {}],
    ["an array", [1, 2]],
    ["some other tool's record", { note: "left here by something else" }],
    ["a card with no back", { key: "x", frontText: "eins" }],
    ["a card with no front", { key: "x", backText: "one" }],
    ["a card whose text is blank", { key: "x", frontText: "", backText: "" }],
    ["a card whose text is not text", { key: "x", frontText: 12, backText: true }],
  ])("skips %s rather than dealing a blank card", (_name, entry) => {
    expect(allCards(bucket({ x: entry }), undefined)).toEqual([]);
  });

  it("keeps the readable cards beside it", () => {
    const good = { key: "ok", frontText: "eins", backText: "one" };

    expect(allCards(bucket({ bad: {}, ok: good }), undefined)).toEqual([good]);
  });

  /* V2-6.5's replacement reaches it on a deck page, which has a card to
     repair itself with; the dictionary has none, which is why the skip
     above matters. */
  it("lets a deck replace such an entry under its own key", () => {
    const storage = bucket({ x: { note: "not a card" } });
    const card = { key: "x", frontText: "eins", backText: "one" };

    expect(syncCards([card], storage)).toEqual([card]);
    expect(allCards(storage, undefined)).toEqual([card]);
  });
});

/* The other half of V2-6.4's "not a card": an entry that is not an object at
   all. `{}` and an array are the shapes a bucket picks up from another tool;
   a string, a number, a boolean or a null are what a half-finished write or a
   hand-edited bucket leaves behind, and none of them has a front or a back to
   deal. */
describe("allCards, an entry that is not even an object", () => {
  it.each([
    ["null", null],
    ["a string", "das Wasser"],
    ["a number", 42],
    ["a boolean", true],
  ])("skips %s rather than dealing a blank card", (_name, entry) => {
    expect(allCards(createStorage(JSON.stringify({ x: entry })), undefined)).toEqual([]);
  });
});

/* A card's key is a string and nothing else is inferred from it (V2-6.9).
   `constructor` is covered above; `__proto__` is the one that actually broke,
   because the write — not the read — was where it went wrong: `stored[key] =
   card` on an ordinary object set the prototype, `JSON.stringify` wrote `{}`
   back, and the card vanished from the dictionary while the whole bucket was
   rewritten on every single visit. */
describe("a card keyed like a prototype's own business", () => {
  const AWKWARD = ["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf"];

  const named = (key) => ({ key, frontText: `front ${key}`, backText: `back ${key}` });

  it.each(AWKWARD)("stores a card keyed %s and reads it back as its own entry", (key) => {
    const storage = createStorage();

    expect(syncCards([named(key)], storage)).toEqual([named(key)]);
    expect(Object.hasOwn(JSON.parse(storage.read()), key)).toBe(true);
    expect(allCards(storage)).toEqual([named(key)]);
  });

  /* And the bucket settles: an unchanged card is not rewritten on the next
     visit. A card that could not be stored read back as missing every time,
     which meant a full rewrite of the dictionary on every visit to the deck. */
  it.each(AWKWARD)("leaves the bucket alone on a second visit to a card keyed %s", (key) => {
    const storage = createStorage();

    syncCards([named(key)], storage);
    const settled = storage.read();
    expect(Object.hasOwn(JSON.parse(settled), key)).toBe(true); /* there is something there to leave alone */

    syncCards([named(key)], storage);

    expect(storage.read()).toBe(settled);
  });

  it.each(AWKWARD)("keeps an ordinary card beside one keyed %s", (key) => {
    const storage = createStorage();
    const ordinary = { key: "wasser-water", frontText: "das Wasser", backText: "water" };

    syncCards([named(key), ordinary], storage);

    expect(allCards(storage)).toEqual([named(key), ordinary]);
  });
});
