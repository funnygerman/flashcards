import { beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY, gradedToday, isDue, recordGrade, reviewState } from "./review.js";

const DAY = 24 * 60 * 60 * 1000;

/* Midday, so that the local calendar day a grade lands on (review.js grades by
   the reader's own day, not by UTC) is the same one in every time zone a test
   might run in, and NOW + DAY is reliably the next one. */
const NOW = Date.parse("2026-01-01T12:00:00Z");

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

  /** Grade a card once a day for `days` days running, and give back the last. */
  const promote = (days, level = "easier") => {
    let last;
    for (let day = 0; day < days; day += 1) last = recordGrade("a", level, storage, NOW + day * DAY);
    return last;
  };

  it("promotes one box on easier, with a longer interval each time", () => {
    expect(recordGrade("a", "easier", storage, NOW)).toEqual({ box: 1, dueAt: NOW + DAY });
    expect(recordGrade("a", "easier", storage, NOW + DAY)).toEqual({ box: 2, dueAt: NOW + 3 * DAY });
    expect(recordGrade("a", "easier", storage, NOW + 2 * DAY)).toEqual({ box: 3, dueAt: NOW + 6 * DAY });
  });

  it("caps promotion at the last box", () => {
    expect(promote(6).box).toBe(6);

    const atCap = recordGrade("a", "easier", storage, NOW + 6 * DAY);
    expect(atCap.box).toBe(6);
    expect(recordGrade("a", "easier", storage, NOW + 7 * DAY)).toEqual({ box: 6, dueAt: NOW + (7 + 32) * DAY });
  });

  it("sends a card back to box 0, due immediately, on harder", () => {
    promote(4);

    const later = NOW + 4 * DAY;
    expect(recordGrade("a", "harder", storage, later)).toEqual({ box: 0, dueAt: later });
  });

  it("keeps a never-graded card at box 0 and due now on neutral", () => {
    expect(recordGrade("a", "neutral", storage, NOW)).toEqual({ box: 0, dueAt: NOW });
  });

  it("neither promotes nor demotes an already-graded card on neutral, but renews its interval", () => {
    promote(2); // one grade a day for two days: box 2

    const later = NOW + 2 * DAY; // later still, the reader sees it again and pages past it
    expect(recordGrade("a", "neutral", storage, later)).toEqual({ box: 2, dueAt: later + 2 * DAY });
  });

  it("keeps each card's schedule independent", () => {
    recordGrade("a", "easier", storage, NOW);
    recordGrade("b", "harder", storage, NOW);

    expect(Object.keys(JSON.parse(storage.read()))).toEqual(["a", "b"]);
    expect(reviewState("a", storage, NOW)).toEqual({ box: 1, dueAt: NOW + DAY });
    expect(reviewState("b", storage, NOW)).toEqual({ box: 0, dueAt: NOW });
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

describe("one grade per day", () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  /* The reader's day is theirs to spend once. Everything below is the same
     card being graded more than once in a day — by changing their mind on the
     card, or by reloading the page and grading it again — and none of it may
     move the card further than a single grade would have. */

  it("moves a card one step from where the day found it, however often it is graded", () => {
    recordGrade("a", "easier", storage, NOW); // box 1
    recordGrade("a", "easier", storage, NOW + DAY); // box 2
    recordGrade("a", "easier", storage, NOW + 2 * DAY); // box 3

    const today = NOW + 3 * DAY;

    expect(recordGrade("a", "easier", storage, today)).toEqual({ box: 4, dueAt: today + 8 * DAY });
    expect(recordGrade("a", "harder", storage, today)).toEqual({ box: 0, dueAt: today });

    /* Not box 1: the second easier replaces the harder rather than following
       it, so the reader ends the day exactly one box up from box 3 — where
       saying "easier" once would have left them. */
    expect(recordGrade("a", "easier", storage, today)).toEqual({ box: 4, dueAt: today + 8 * DAY });
  });

  it("does not promote a second time when the reader reloads and grades again", () => {
    const first = recordGrade("a", "easier", storage, NOW);

    /* A reload keeps nothing but storage, so this is the same call again. */
    expect(recordGrade("a", "easier", storage, NOW + 60_000)).toEqual({ ...first, dueAt: first.dueAt + 60_000 });
    expect(reviewState("a", storage, NOW).box).toBe(1);
  });

  it("starts the next day from where the last one left the card", () => {
    recordGrade("a", "easier", storage, NOW); // box 0 -> 1
    recordGrade("a", "harder", storage, NOW); // still the same day: box 0 -> 0

    const tomorrow = NOW + DAY;
    expect(recordGrade("a", "easier", storage, tomorrow)).toEqual({ box: 1, dueAt: tomorrow + DAY });
  });

  it("does not spend the day on neutral, which is not an opinion", () => {
    recordGrade("a", "neutral", storage, NOW);

    expect(gradedToday("a", storage, NOW)).toBe(null);
    expect(recordGrade("a", "easier", storage, NOW)).toEqual({ box: 1, dueAt: NOW + DAY });
  });

  it("keeps the day's grade when the card is only paged past afterwards", () => {
    recordGrade("a", "easier", storage, NOW);
    recordGrade("a", "neutral", storage, NOW);

    expect(gradedToday("a", storage, NOW)).toBe("easier");
    expect(reviewState("a", storage, NOW).box).toBe(1);
  });

  it("reports the grade a card carries today, and only today", () => {
    expect(gradedToday("a", storage, NOW)).toBe(null);

    recordGrade("a", "harder", storage, NOW);
    expect(gradedToday("a", storage, NOW)).toBe("harder");
    expect(gradedToday("a", storage, NOW + DAY)).toBe(null);
    expect(gradedToday("b", storage, NOW)).toBe(null);
  });

  it("reads an entry written before grades were remembered as ungraded today", () => {
    storage = memoryStorage(JSON.stringify({ a: { box: 3, dueAt: NOW } }));

    expect(gradedToday("a", storage, NOW)).toBe(null);
    expect(reviewState("a", storage, NOW)).toEqual({ box: 3, dueAt: NOW });
    expect(recordGrade("a", "easier", storage, NOW)).toEqual({ box: 4, dueAt: NOW + 8 * DAY });
  });

  it("ignores a half-written record of today's grade without losing the schedule", () => {
    const day = { box: 3, dueAt: NOW, day: "2026-01-01", grade: "easier" }; /* no baseBox */
    storage = memoryStorage(JSON.stringify({ a: day }));

    expect(gradedToday("a", storage, NOW)).toBe(null);
    expect(reviewState("a", storage, NOW)).toEqual({ box: 3, dueAt: NOW });
  });

  it("keeps the schedule to box and dueAt, whatever else it remembers", () => {
    recordGrade("a", "easier", storage, NOW);

    expect(Object.keys(reviewState("a", storage, NOW))).toEqual(["box", "dueAt"]);
  });
});

describe("isDue", () => {
  it("is due once the clock reaches dueAt, not only after", () => {
    expect(isDue({ box: 0, dueAt: NOW }, NOW)).toBe(true);
    expect(isDue({ box: 0, dueAt: NOW }, NOW - 1)).toBe(false);
    expect(isDue({ box: 0, dueAt: NOW }, NOW + 1)).toBe(true);
  });
});
