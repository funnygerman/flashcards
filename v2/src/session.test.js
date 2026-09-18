import { beforeEach, describe, expect, it } from "vitest";

import { SESSION_LIMIT, chooseSession } from "./session.js";
import { STORAGE_KEY, recordGrade } from "./review.js";

const DAY = 24 * 60 * 60 * 1000;
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
  };
}

const card = (key) => ({ key, frontText: key, backText: key });

/** Storage holding a schedule per card key, as review.js writes it. */
const scheduled = (schedules) =>
  memoryStorage(
    JSON.stringify(Object.fromEntries(Object.entries(schedules).map(([key, dueAt]) => [key, { box: 1, dueAt }]))),
  );

const keys = (cards) => cards.map((c) => c.key);

/* The dictionary's half: only what is due, out of everything ever opened. */
describe("chooseSession, only what is due", () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("gives back nothing for nothing", () => {
    expect(chooseSession([], { now: NOW, storage, onlyDue: true })).toEqual([]);
  });

  it("takes every card of a deck the reader has never graded", () => {
    /* An ungraded card is box 0, due now (V2-11.7), so a fresh deck is all due. */
    const cards = [card("a"), card("b"), card("c")];

    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true })).toEqual(cards);
  });

  it("puts the longest-overdue card first", () => {
    const cards = [card("a"), card("b"), card("c")];
    storage = scheduled({ a: NOW - DAY, b: NOW - 5 * DAY, c: NOW - 2 * DAY });

    expect(keys(chooseSession(cards, { now: NOW, storage, onlyDue: true }))).toEqual(["b", "c", "a"]);
  });

  it("leaves out a card that is not due while due ones are waiting", () => {
    const cards = [card("soon"), card("overdue"), card("later")];
    storage = scheduled({ soon: NOW + DAY, overdue: NOW - DAY, later: NOW + 30 * DAY });

    expect(keys(chooseSession(cards, { now: NOW, storage, onlyDue: true }))).toEqual(["overdue"]);
  });

  it("counts a card due at this very moment as due", () => {
    const cards = [card("a")];
    storage = scheduled({ a: NOW });

    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true })).toEqual(cards);
  });

  /* Nothing due selects nothing at all: standing the nearest-due cards in was
     what made a card the reader had earned a fortnight of quiet look like one
     the schedule had ignored (V2-13.5 withdrawn). What a page shows instead is
     the page's business (V2-13.12), not this module's. */
  it("selects nothing when nothing is due, rather than the nearest", () => {
    const cards = [card("far"), card("near"), card("middle")];
    storage = scheduled({ far: NOW + 30 * DAY, near: NOW + DAY, middle: NOW + 7 * DAY });

    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true })).toEqual([]);
  });

  /* A full-star card is the case the readers actually complained about: it is
     a month away, and a month away means gone for a month. */
  it("holds back a card in the top box until its month is up", () => {
    const cards = [card("known")];
    storage = memoryStorage(JSON.stringify({ known: { box: 5, dueAt: NOW + 30 * DAY } }));

    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true })).toEqual([]);
    expect(chooseSession(cards, { now: NOW + 30 * DAY, storage, onlyDue: true })).toEqual(cards);
  });

  it("asks for no more than a session's worth", () => {
    const cards = Array.from({ length: SESSION_LIMIT + 5 }, (_, i) => card(`card-${i}`));

    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true })).toHaveLength(SESSION_LIMIT);
    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true, limit: 3 })).toHaveLength(3);
  });

  it("keeps the ones that are due even where most of the pool is not", () => {
    const cards = Array.from({ length: 8 }, (_, i) => card(`card-${i}`));
    storage = scheduled({ ...Object.fromEntries(cards.map((c, i) => [c.key, NOW + (8 - i) * DAY])), "card-3": NOW - DAY });

    expect(keys(chooseSession(cards, { now: NOW, storage, onlyDue: true }))).toEqual(["card-3"]);
  });

  it("does not reorder the caller's array", () => {
    const cards = [card("a"), card("b")];
    storage = scheduled({ a: NOW - DAY, b: NOW - 5 * DAY });

    chooseSession(cards, { now: NOW, storage, onlyDue: true });
    expect(keys(cards)).toEqual(["a", "b"]);
  });

  it("treats an unreadable schedule as a card due now rather than failing", () => {
    const cards = [card("a"), card("b")];
    storage = memoryStorage(null, true);

    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true })).toEqual(cards);
  });

  it("reads the schedules review.js actually writes", () => {
    expect(STORAGE_KEY).toBe("flashcards.review");
  });
});

/* The filter's half (V2-13.13): the same pool, schedule and all, for a reader
   who asked to see every card regardless of its stars. */
describe("chooseSession, every card in the pool", () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("keeps a card that is not due, rather than holding it back", () => {
    const cards = [card("soon"), card("overdue"), card("later")];
    storage = scheduled({ soon: NOW + DAY, overdue: NOW - DAY, later: NOW + 30 * DAY });

    expect(keys(chooseSession(cards, { now: NOW, storage }))).toEqual(["overdue", "soon", "later"]);
  });

  it("still leads with what wants studying most", () => {
    const cards = [card("a"), card("b"), card("c")];
    storage = scheduled({ a: NOW + 5 * DAY, b: NOW - 2 * DAY, c: NOW + DAY });

    expect(keys(chooseSession(cards, { now: NOW, storage }))).toEqual(["b", "c", "a"]);
  });

  it("takes no more than a sitting's worth of a large deck", () => {
    const cards = Array.from({ length: SESSION_LIMIT + 40 }, (_, i) => card(`card-${i}`));

    expect(chooseSession(cards, { now: NOW, storage })).toHaveLength(SESSION_LIMIT);
  });

  /* An ungraded card is due now (V2-11.7) and a scheduled one is due later, so
     a large deck feeds the reader what they have not seen before what they
     have — without either being filtered away. */
  it("leads a large deck with the cards never seen", () => {
    const seen = Array.from({ length: 3 }, (_, i) => card(`seen-${i}`));
    const unseen = Array.from({ length: 3 }, (_, i) => card(`unseen-${i}`));
    storage = scheduled(Object.fromEntries(seen.map((c, i) => [c.key, NOW + (i + 1) * DAY])));

    expect(keys(chooseSession([...seen, ...unseen], { now: NOW, storage, limit: 3 }))).toEqual([
      "unseen-0",
      "unseen-1",
      "unseen-2",
    ]);
  });

  it("gives back nothing for nothing", () => {
    expect(chooseSession([], { now: NOW, storage })).toEqual([]);
  });
});

/* The day's own filter, beside the schedule's. A card the reader has answered
   today cannot be answered again (V2-5.16), so a session that has to offer
   something to do leaves it out (V2-13.14) — and `harder`, which files a card
   in box 0 due immediately, is exactly the case the schedule alone gets wrong.
*/
describe("chooseSession, only what has not been answered today", () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  const deck = [card("a"), card("b"), card("c")];

  it("drops a card answered today, whatever its grade", () => {
    recordGrade("a", "easier", storage, NOW);
    recordGrade("b", "harder", storage, NOW);

    expect(keys(chooseSession(deck, { now: NOW, storage, onlyUnanswered: true }))).toEqual(["c"]);
  });

  it("keeps a card whose answer was yesterday's", () => {
    recordGrade("a", "harder", storage, NOW - DAY);

    expect(keys(chooseSession(deck, { now: NOW, storage, onlyUnanswered: true }))).toEqual(["a", "b", "c"]);
  });

  /* Left off, the pool comes back whole — which is what the reader's own
     "every card" filter asks for, marks, refusals and all (V2-13.13). */
  it("keeps today's answered cards when it is not asked to", () => {
    recordGrade("a", "easier", storage, NOW);

    expect(keys(chooseSession(deck, { now: NOW, storage }))).toHaveLength(3);
  });

  it("selects nothing at all once every card has had its answer", () => {
    for (const c of deck) recordGrade(c.key, "easier", storage, NOW);

    expect(chooseSession(deck, { now: NOW, storage, onlyUnanswered: true })).toEqual([]);
  });

  /* The two filters are independent questions, and a due session asks both:
     `harder` says the schedule wants the card back immediately and the day
     says the reader has already answered it. The day wins. */
  it("drops a card the schedule would have offered again today", () => {
    recordGrade("a", "harder", storage, NOW);

    expect(keys(chooseSession(deck, { now: NOW, storage, onlyDue: true }))).toEqual(["a", "b", "c"]);
    expect(keys(chooseSession(deck, { now: NOW, storage, onlyDue: true, onlyUnanswered: true }))).toEqual(["b", "c"]);
  });

  it("ignores a card with no key, which has no day to have answered", () => {
    expect(chooseSession([{ frontText: "guide" }], { now: NOW, storage, onlyUnanswered: true })).toHaveLength(1);
  });
});

/* A sitting's worth is a cap, not the end of the day (V2-13.15), so the two
   sizes either side of it are where that is decided: exactly the cap is a pool
   that comes back whole, one more is a pool that has a remainder to hand over
   once the first sitting has been answered. */
describe("chooseSession, at the size of a sitting", () => {
  let storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  const pool = (size) => Array.from({ length: size }, (_, i) => card(`card-${i}`));

  it("takes a pool of exactly a sitting's worth whole", () => {
    const cards = pool(SESSION_LIMIT);

    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true, onlyUnanswered: true })).toHaveLength(SESSION_LIMIT);
  });

  /* And the deal that follows it is the remainder, not the whole pool again:
     the fifty already answered are the day's (V2-13.14), so what is left over
     is the one card the cap held back. */
  it("hands over what the cap held back, once the sitting has been answered", () => {
    const cards = pool(SESSION_LIMIT + 1);
    const first = chooseSession(cards, { now: NOW, storage, onlyDue: true, onlyUnanswered: true });

    for (const chosen of first) recordGrade(chosen.key, "easier", storage, NOW);

    const next = chooseSession(cards, { now: NOW, storage, onlyDue: true, onlyUnanswered: true });

    expect(next).toHaveLength(1);
    expect(first).not.toContain(next[0]);
  });

  /* One more grade and there is nothing to deal at all, which is the page's
     cue to say the day is done (V2-13.12) rather than to deal a third sitting. */
  it("selects nothing once the remainder has been answered too", () => {
    const cards = pool(SESSION_LIMIT + 1);

    for (const chosen of cards) recordGrade(chosen.key, "easier", storage, NOW);

    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true, onlyUnanswered: true })).toEqual([]);
  });
});

/* The day's filter is the one thing that could never see a card keyed
   `__proto__`: nothing about it could be written down at all, so `gradedToday`
   answered null for ever and the card was dealt back every time (V2-6.9). */
describe("chooseSession, a card keyed like a prototype's own business", () => {
  const AWKWARD = ["__proto__", "constructor", "toString", "hasOwnProperty", "valueOf"];

  it.each(AWKWARD)("drops a card keyed %s once the reader has answered it today", (key) => {
    const storage = memoryStorage();
    const deck = [card(key), card("ordinary")];

    recordGrade(key, "easier", storage, NOW);

    expect(keys(chooseSession(deck, { now: NOW, storage, onlyUnanswered: true }))).toEqual(["ordinary"]);
    expect(keys(chooseSession(deck, { now: NOW, storage }))).toContain(key);
  });
});
