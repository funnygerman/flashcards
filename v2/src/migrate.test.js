import { beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY as CARDS_KEY } from "./store.js";
import { STORAGE_KEY as REVIEW_KEY } from "./review.js";
import { migrateKeys } from "./migrate.js";

/** An in-memory Storage stand-in; `fail` makes both operations throw. */
function createStorage(initial = {}, fail = false) {
  const buckets = { ...initial };

  return {
    getItem: (key) => {
      if (fail) throw new Error("blocked");
      return buckets[key] ?? null;
    },
    setItem: (key, value) => {
      if (fail) throw new Error("blocked");
      buckets[key] = value;
    },
    read: (key) => JSON.parse(buckets[key] ?? "null"),
  };
}

const withCards = (map) => ({ [CARDS_KEY]: JSON.stringify(map) });
const withReview = (map) => ({ [REVIEW_KEY]: JSON.stringify(map) });

const renamed = { key: "hundert-one-hundred", frontText: "hundert", backText: "one hundred", wasKey: "hundert-a-hundred" };

describe("migrateKeys", () => {
  let storage;

  beforeEach(() => {
    storage = createStorage();
  });

  it("moves the reader's schedule to the card's current key", () => {
    storage = createStorage(withReview({ "hundert-a-hundred": { box: 4, dueAt: 1000 } }));

    migrateKeys([renamed], storage);

    expect(storage.read(REVIEW_KEY)).toEqual({ "hundert-one-hundred": { box: 4, dueAt: 1000 } });
  });

  it("moves the dictionary entry too, and corrects the key it carries", () => {
    storage = createStorage(withCards({ "hundert-a-hundred": { key: "hundert-a-hundred", frontText: "hundert", backText: "a hundred" } }));

    migrateKeys([renamed], storage);

    expect(storage.read(CARDS_KEY)).toEqual({
      "hundert-one-hundred": { key: "hundert-one-hundred", frontText: "hundert", backText: "a hundred" },
    });
  });

  /* The two buckets are independent (V2-6.6), so a reader can have one and not
     the other — each is worth moving on its own. */
  it("moves a schedule whose dictionary entry was lost", () => {
    storage = createStorage(withReview({ "hundert-a-hundred": { box: 2, dueAt: 5 } }));

    migrateKeys([renamed], storage);

    expect(storage.read(REVIEW_KEY)).toEqual({ "hundert-one-hundred": { box: 2, dueAt: 5 } });
    expect(storage.read(CARDS_KEY)).toBe(null);
  });

  it("leaves nothing behind under the old key", () => {
    storage = createStorage(withReview({ "hundert-a-hundred": { box: 4, dueAt: 1000 } }));

    migrateKeys([renamed], storage);

    expect(Object.keys(storage.read(REVIEW_KEY))).toEqual(["hundert-one-hundred"]);
  });

  /* Kept, it would outlive the rename as a card no deck can name and no reader
     can grade away — the duplicate this module exists to prevent. */
  it("drops the old entry rather than overwrite a key the reader is already using", () => {
    storage = createStorage(withReview({
      "hundert-a-hundred": { box: 1, dueAt: 1 },
      "hundert-one-hundred": { box: 5, dueAt: 999 },
    }));

    migrateKeys([renamed], storage);

    expect(storage.read(REVIEW_KEY)).toEqual({ "hundert-one-hundred": { box: 5, dueAt: 999 } });
  });

  it("collects either key from a card that has been renamed twice", () => {
    const twice = { key: "c", frontText: "x", backText: "y", wasKey: ["b", "a"] };

    for (const stale of ["a", "b"]) {
      storage = createStorage(withReview({ [stale]: { box: 3, dueAt: 7 } }));
      migrateKeys([twice], storage);
      expect(storage.read(REVIEW_KEY)).toEqual({ c: { box: 3, dueAt: 7 } });
    }
  });

  it("does nothing on a second visit, which is what makes it safe to run every time", () => {
    storage = createStorage(withReview({ "hundert-a-hundred": { box: 4, dueAt: 1000 } }));

    migrateKeys([renamed], storage);
    const afterFirst = JSON.stringify(storage.read(REVIEW_KEY));
    migrateKeys([renamed], storage);

    expect(JSON.stringify(storage.read(REVIEW_KEY))).toBe(afterFirst);
  });

  it("writes nothing for a reader who never had the old key", () => {
    migrateKeys([renamed], storage);

    expect(storage.read(REVIEW_KEY)).toBe(null);
    expect(storage.read(CARDS_KEY)).toBe(null);
  });

  it("ignores a card renamed onto the key it already has", () => {
    storage = createStorage(withReview({ same: { box: 2, dueAt: 3 } }));

    migrateKeys([{ key: "same", frontText: "x", backText: "y", wasKey: "same" }], storage);

    expect(storage.read(REVIEW_KEY)).toEqual({ same: { box: 2, dueAt: 3 } });
  });

  it("takes the note off the card, so it is never stored or compared as content", () => {
    expect(migrateKeys([renamed], storage)).toEqual([
      { key: "hundert-one-hundred", frontText: "hundert", backText: "one hundred" },
    ]);
  });

  it("hands back the very cards it was given where none asks for a rename", () => {
    const cards = [{ key: "a", frontText: "x", backText: "y" }];

    expect(migrateKeys(cards, storage)[0]).toBe(cards[0]);
  });

  it("degrades to doing nothing when storage is unusable, rather than throwing", () => {
    const blocked = createStorage(withReview({ "hundert-a-hundred": { box: 4, dueAt: 1 } }), true);

    expect(() => migrateKeys([renamed], blocked)).not.toThrow();
  });

  it("has nothing to do for a keyless card", () => {
    storage = createStorage(withReview({ old: { box: 1, dueAt: 1 } }));

    migrateKeys([{ frontText: "x", backText: "y", wasKey: "old" }], storage);

    expect(storage.read(REVIEW_KEY)).toEqual({ old: { box: 1, dueAt: 1 } });
  });
});
