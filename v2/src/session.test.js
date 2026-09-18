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
