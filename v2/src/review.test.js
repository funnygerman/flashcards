import { beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY, isDue, recordGrade, reviewState } from "./review.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-01-01T00:00:00Z");

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

describe("reviewState", () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("starts an ungraded card at box 0, due now", () => {
    expect(reviewState("a", storage, NOW)).toEqual({ box: 0, dueAt: NOW });
  });

  it("reads back a schedule recordGrade wrote", () => {
    recordGrade("a", "easier", storage, NOW);
    expect(reviewState("a", storage, NOW)).toEqual({ box: 1, dueAt: NOW + DAY });
  });

  it("treats a corrupt entry as ungraded", () => {
    storage = memoryStorage(JSON.stringify({ a: { box: "not a number" }, b: null, c: { box: 1 } }));

    expect(reviewState("a", storage, NOW)).toEqual({ box: 0, dueAt: NOW });
    expect(reviewState("b", storage, NOW)).toEqual({ box: 0, dueAt: NOW });
    expect(reviewState("c", storage, NOW)).toEqual({ box: 0, dueAt: NOW }); /* missing dueAt */
  });

  it("treats an out-of-range box as ungraded", () => {
    storage = memoryStorage(JSON.stringify({ a: { box: 99, dueAt: NOW } }));
    expect(reviewState("a", storage, NOW)).toEqual({ box: 0, dueAt: NOW });
  });
});

describe("recordGrade", () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("promotes one box on easier, with a longer interval each time", () => {
    expect(recordGrade("a", "easier", storage, NOW)).toEqual({ box: 1, dueAt: NOW + DAY });
    expect(recordGrade("a", "easier", storage, NOW)).toEqual({ box: 2, dueAt: NOW + 2 * DAY });
    expect(recordGrade("a", "easier", storage, NOW)).toEqual({ box: 3, dueAt: NOW + 4 * DAY });
  });

  it("caps promotion at the last box", () => {
    for (let i = 0; i < 6; i += 1) recordGrade("a", "easier", storage, NOW);
    const atCap = recordGrade("a", "easier", storage, NOW);

    expect(atCap.box).toBe(6);
    const again = recordGrade("a", "easier", storage, NOW);
    expect(again).toEqual(atCap);
  });

  it("sends a card back to box 0, due immediately, on harder", () => {
    for (let i = 0; i < 4; i += 1) recordGrade("a", "easier", storage, NOW);

    expect(recordGrade("a", "harder", storage, NOW)).toEqual({ box: 0, dueAt: NOW });
  });

  it("keeps each card's schedule independent", () => {
    recordGrade("a", "easier", storage, NOW);
    recordGrade("b", "harder", storage, NOW);

    expect(JSON.parse(storage.read())).toEqual({
      a: { box: 1, dueAt: NOW + DAY },
      b: { box: 0, dueAt: NOW },
    });
  });

  it("replaces a corrupt stored entry rather than building on it", () => {
    storage = memoryStorage(JSON.stringify({ a: { box: "bogus" } }));
    expect(recordGrade("a", "easier", storage, NOW)).toEqual({ box: 1, dueAt: NOW + DAY });
  });

  it("still returns a schedule when storage is unusable", () => {
    storage = memoryStorage(null, true);
    expect(recordGrade("a", "easier", storage, NOW)).toEqual({ box: 1, dueAt: NOW + DAY });
    expect(recordGrade("a", "easier", null, NOW)).toEqual({ box: 1, dueAt: NOW + DAY });
  });

  it("uses one storage key for the whole schedule", () => {
    expect(STORAGE_KEY).toBe("flashcards.review");
  });
});

describe("isDue", () => {
  it("is due once the clock reaches dueAt, not only after", () => {
    expect(isDue({ box: 0, dueAt: NOW }, NOW)).toBe(true);
    expect(isDue({ box: 0, dueAt: NOW }, NOW - 1)).toBe(false);
    expect(isDue({ box: 0, dueAt: NOW }, NOW + 1)).toBe(true);
  });
});
