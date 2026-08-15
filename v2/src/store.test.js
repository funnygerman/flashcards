import { beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY, allCards, holdsMoreThan, syncCards } from "./store.js";

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

  it("loads the stored copy instead of the deck's, and does not rewrite it", () => {
    const stored = { ...card, backText: "water (stored)" };
    storage = createStorage(JSON.stringify({ [card.key]: stored }));

    expect(syncCards([card], storage)).toEqual([stored]);
    expect(JSON.parse(storage.read())).toEqual({ [card.key]: stored });
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
});

/* Whether a deck page should offer a link to the dictionary at all: not "how
   many decks are there" — storage records cards, not decks (V2-13.7) — but
   "would that link show the reader anything they cannot see here?". */
describe("holdsMoreThan", () => {
  const other = { key: "brot-bread", frontText: "das Brot", backText: "bread" };

  it("is false for the only deck a reader has ever opened", () => {
    const storage = createStorage();
    syncCards([card, other], storage);

    expect(holdsMoreThan([card, other], storage)).toBe(false);
  });

  it("is true once another deck has left a card behind", () => {
    const storage = createStorage();
    syncCards([card, other], storage);

    expect(holdsMoreThan([card], storage)).toBe(true);
  });

  it("is false before any deck has been opened", () => {
    expect(holdsMoreThan([card], createStorage())).toBe(false);
  });

  /* A dictionary that cannot be read has nothing to offer either, so the link
     stays away rather than leading to a page that cannot render (V2-13.8). */
  it("is false when storage is unusable", () => {
    expect(holdsMoreThan([card], createStorage(null, true))).toBe(false);
    expect(holdsMoreThan([card], createStorage("{ not json"))).toBe(false);
  });

  it("ignores an unusable stored entry rather than counting it as more", () => {
    const storage = createStorage(JSON.stringify({ [card.key]: card, junk: null }));

    expect(holdsMoreThan([card], storage)).toBe(false);
  });

  it("counts a stored card the deck no longer carries", () => {
    /* A card dropped from a deck file still sits in the dictionary, and is
       still something this page cannot show. */
    const storage = createStorage(JSON.stringify({ [other.key]: other }));

    expect(holdsMoreThan([card], storage)).toBe(true);
  });
});
