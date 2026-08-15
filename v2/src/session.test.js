import { beforeEach, describe, expect, it } from "vitest";

import { SESSION_LIMIT, chooseSession } from "./session.js";
import { STORAGE_KEY } from "./review.js";

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

  /* Nothing due is not nothing to study: a session has no end (V2-3.5) and the
     library refuses an empty deck (V2-3.6), so the nearest-due cards stand in. */
  it("falls back to the cards closest to being due when none is due", () => {
    const cards = [card("far"), card("near"), card("middle")];
    storage = scheduled({ far: NOW + 30 * DAY, near: NOW + DAY, middle: NOW + 7 * DAY });

    expect(keys(chooseSession(cards, { now: NOW, storage, onlyDue: true }))).toEqual(["near", "middle", "far"]);
  });

  it("asks for no more than a session's worth", () => {
    const cards = Array.from({ length: SESSION_LIMIT + 5 }, (_, i) => card(`card-${i}`));

    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true })).toHaveLength(SESSION_LIMIT);
    expect(chooseSession(cards, { now: NOW, storage, onlyDue: true, limit: 3 })).toHaveLength(3);
  });

  it("caps the fallback too, so a deck with nothing due is not the whole dictionary", () => {
    const cards = Array.from({ length: 8 }, (_, i) => card(`card-${i}`));
    storage = scheduled(Object.fromEntries(cards.map((c, i) => [c.key, NOW + (8 - i) * DAY])));

    expect(keys(chooseSession(cards, { now: NOW, storage, onlyDue: true, limit: 2 }))).toEqual(["card-7", "card-6"]);
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

/* A deck's half: all of its own cards, because the reader chose that deck. */
describe("chooseSession, a deck's own cards", () => {
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
