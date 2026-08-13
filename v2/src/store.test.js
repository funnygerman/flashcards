import { beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY, syncCards } from "./store.js";

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
