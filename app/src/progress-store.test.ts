import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createProgressStore } from "./progress-store.js";

class MockStorage implements Storage {
  private data = new Map<string, string>();
  throwOnGet = false;
  throwOnSet = false;

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    if (this.throwOnGet) throw new Error("mock: read failed");
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw new Error("mock: write failed (quota exceeded)");
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  seed(value: unknown): void {
    this.data.set("fc.v1.progress", JSON.stringify(value));
  }

  seedRaw(value: string): void {
    this.data.set("fc.v1.progress", value);
  }
}

let storage: MockStorage;

beforeEach(() => {
  storage = new MockStorage();
  vi.stubGlobal("localStorage", storage);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createProgressStore — debouncing", () => {
  it("never writes synchronously on recordShown", () => {
    const setItem = vi.spyOn(storage, "setItem");
    const store = createProgressStore();

    store.recordShown("card-1");

    expect(setItem).not.toHaveBeenCalled();
  });

  it("collapses 500 rapid recordShown calls into a single debounced write", () => {
    const setItem = vi.spyOn(storage, "setItem");
    const store = createProgressStore();

    for (let i = 0; i < 500; i++) {
      store.recordShown(`card-${i}`);
    }
    expect(setItem).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(store.get("card-499")?.seenCount).toBe(1);
  });
});

describe("createProgressStore — lifecycle flush", () => {
  it("flushes exactly once on pagehide", () => {
    const setItem = vi.spyOn(storage, "setItem");
    const store = createProgressStore();

    store.recordShown("card-1");
    window.dispatchEvent(new Event("pagehide"));

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(store.persistent).toBe(true);
  });

  it("flushes exactly once when visibilitychange fires with a hidden document", () => {
    const setItem = vi.spyOn(storage, "setItem");
    createProgressStore().recordShown("card-1");

    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("does not double-write when the debounce timer later elapses after a flush", () => {
    const setItem = vi.spyOn(storage, "setItem");
    const store = createProgressStore();

    store.recordShown("card-1");
    store.flush();
    vi.runAllTimers();

    expect(setItem).toHaveBeenCalledTimes(1);
  });
});

describe("createProgressStore — migration", () => {
  it("migrates an older version to current and persists the upgraded shape", () => {
    storage.seed({ version: 0, cards: { "card-1": { seenCount: 3, lastSeen: "2026-01-01T00:00:00.000Z" } } });

    const store = createProgressStore();

    expect(store.get("card-1")).toEqual({ seenCount: 3, lastSeen: "2026-01-01T00:00:00.000Z" });

    store.flush();
    const persisted = JSON.parse(storage.getItem("fc.v1.progress") ?? "{}");
    expect(persisted.version).toBe(1);
    expect(persisted.visitedDecks).toEqual([]);
  });

  it("treats a newer, not-yet-understood version as empty and leaves it untouched", () => {
    storage.seed({ version: 99, cards: { "card-1": { seenCount: 1, lastSeen: "2026-01-01T00:00:00.000Z" } } });
    const setItem = vi.spyOn(storage, "setItem");

    const store = createProgressStore();

    expect(store.all()).toEqual({});
    expect(store.get("card-1")).toBeUndefined();
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe("createProgressStore — corrupt payload", () => {
  it("treats corrupt JSON as empty without propagating it, and stays persistent", () => {
    storage.seedRaw("{not valid json");

    const store = createProgressStore();

    expect(store.all()).toEqual({});
    expect(store.persistent).toBe(true);
  });
});

describe("createProgressStore — storage failure", () => {
  it("degrades to memory-only when localStorage throws on read", () => {
    storage.throwOnGet = true;

    const store = createProgressStore();

    expect(store.persistent).toBe(false);
    expect(() => store.recordShown("card-1")).not.toThrow();
    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it("degrades to memory-only when localStorage throws on write (quota exceeded)", () => {
    storage.throwOnSet = true;
    const store = createProgressStore();

    store.recordShown("card-1");
    expect(() => store.flush()).not.toThrow();

    expect(store.persistent).toBe(false);
    expect(store.get("card-1")?.seenCount).toBe(1);
  });

  it("never throws even when accessing the localStorage global itself throws", () => {
    const stubbed = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError");
      },
    });

    try {
      let store: ReturnType<typeof createProgressStore> | undefined;
      expect(() => {
        store = createProgressStore();
      }).not.toThrow();
      expect(store?.persistent).toBe(false);
    } finally {
      if (stubbed) Object.defineProperty(globalThis, "localStorage", stubbed);
    }
  });
});

describe("createProgressStore — size warning", () => {
  it("emits exactly one console.warn when serialized state exceeds 1 MB", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const store = createProgressStore();

    store.recordShown("x".repeat(1_100_000));
    store.flush();

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn for state well under 1 MB", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const store = createProgressStore();

    store.recordShown("card-1");
    store.flush();

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("createProgressStore — never persists card content", () => {
  it("exposes only identifier/progress-taking methods, no content parameter", () => {
    const store = createProgressStore();

    expect(Object.keys(store).sort()).toEqual(
      ["all", "flush", "get", "persistent", "recordDeckVisit", "recordGrade", "recordShown"].sort(),
    );

    // Every mutator takes only ids/grades (strings), never a content payload.
    expect(store.recordShown.length).toBe(1);
    expect(store.recordGrade.length).toBe(2);
    expect(store.recordDeckVisit.length).toBe(1);
    expect(store.get.length).toBe(1);
    expect(store.all.length).toBe(0);
    expect(store.flush.length).toBe(0);
  });

  it("round-trips through localStorage as identifiers and progress only", () => {
    const store = createProgressStore();
    store.recordShown("card-1");
    store.recordGrade("card-1", "easy");
    store.recordDeckVisit("deck-1");
    store.flush();

    const persisted = JSON.parse(storage.getItem("fc.v1.progress") ?? "{}");
    expect(persisted).toEqual({
      version: 1,
      cards: { "card-1": { seenCount: 1, lastSeen: expect.any(String), grade: "easy" } },
      visitedDecks: ["deck-1"],
      prefs: {},
    });
  });
});
