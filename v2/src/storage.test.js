import { describe, expect, it } from "vitest";

import { pageStorage, readMap, writeMap } from "./storage.js";

/** An in-memory Storage stand-in; `fail` makes both operations throw. */
function memoryStorage(initial = null, fail = false) {
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

describe("pageStorage", () => {
  it("returns localStorage where it is reachable", () => {
    expect(pageStorage()).toBe(localStorage);
  });

  it("returns null rather than throwing where the property itself throws", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });

    try {
      expect(pageStorage()).toBe(null);
    } finally {
      Object.defineProperty(globalThis, "localStorage", original);
    }
  });
});

describe("readMap", () => {
  it("returns what was written", () => {
    const storage = memoryStorage(JSON.stringify({ a: 1 }));
    expect(readMap(storage, "k")).toEqual({ a: 1 });
  });

  it("returns an empty map when nothing is stored", () => {
    expect(readMap(memoryStorage(), "k")).toEqual({});
  });

  it("returns an empty map for corrupt JSON", () => {
    expect(readMap(memoryStorage("{not json"), "k")).toEqual({});
  });

  it("returns an empty map for a value that is not a map", () => {
    expect(readMap(memoryStorage(JSON.stringify([1, 2])), "k")).toEqual({});
  });

  it("returns an empty map rather than throwing when storage is unusable", () => {
    expect(readMap(memoryStorage(null, true), "k")).toEqual({});
    expect(readMap(null, "k")).toEqual({});
  });
});

describe("writeMap", () => {
  it("persists the map as JSON", () => {
    const storage = memoryStorage();
    writeMap(storage, "k", { a: 1 });
    expect(JSON.parse(storage.read())).toEqual({ a: 1 });
  });

  it("fails silently when storage is unusable", () => {
    expect(() => writeMap(memoryStorage(null, true), "k", { a: 1 })).not.toThrow();
    expect(() => writeMap(null, "k", { a: 1 })).not.toThrow();
  });
});

/* Every module reading one of these maps guards its lookups with
   `Object.hasOwn`, against a card keyed `constructor` or `toString`. The
   writes were plain indexing, and `map.__proto__ = entry` on an ordinary
   object sets the prototype rather than storing anything (V2-6.9). */
describe("readMap, a key that is a prototype's own business", () => {
  const AWKWARD = ["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf"];

  it("hands back a map nothing is inherited through", () => {
    expect(Object.getPrototypeOf(readMap(memoryStorage(), "k"))).toBe(null);
    expect(Object.getPrototypeOf(readMap(memoryStorage('{"a":1}'), "k"))).toBe(null);
  });

  it.each(AWKWARD)("stores and reads back an entry keyed %s", (key) => {
    const storage = memoryStorage();
    const map = readMap(storage, "k");

    map[key] = { box: 3 };
    writeMap(storage, "k", map);

    const read = readMap(storage, "k");

    expect(Object.hasOwn(read, key)).toBe(true);
    expect(read[key]).toEqual({ box: 3 });
  });

  it.each(AWKWARD)("keeps the rest of the map when %s is in it", (key) => {
    const storage = memoryStorage();
    const map = readMap(storage, "k");

    map[key] = { box: 1 };
    map.ordinary = { box: 2 };
    writeMap(storage, "k", map);

    expect(Object.keys(readMap(storage, "k")).sort()).toEqual([key, "ordinary"].sort());
  });
});

/* A bucket written before this existed — or by another tab, or by an older
   build — arrives as raw JSON rather than through `writeMap`, and that is the
   path `Object.assign` onto a prototype-less target exists for: `JSON.parse`
   makes `__proto__` an own property, and copying it onto an ordinary object
   would hand the prototype back the key (V2-6.9). */
describe("readMap, a bucket that already holds an awkward key", () => {
  it("reads a stored __proto__ entry as an ordinary key, prototype still empty", () => {
    const map = readMap(memoryStorage('{"__proto__":{"box":4},"ordinary":{"box":1}}'), "k");

    expect(Object.getPrototypeOf(map)).toBe(null);
    expect(Object.hasOwn(map, "__proto__")).toBe(true);
    expect(map["__proto__"]).toEqual({ box: 4 });
    expect(Object.keys(map).sort()).toEqual(["__proto__", "ordinary"]);
  });

  it("does not take the entry for a prototype to inherit through", () => {
    const map = readMap(memoryStorage('{"__proto__":{"box":4}}'), "k");

    expect(map.box).toBeUndefined();
  });
});
