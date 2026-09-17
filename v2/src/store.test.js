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
