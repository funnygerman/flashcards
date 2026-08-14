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
