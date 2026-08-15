import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY as CARDS_KEY } from "./store.js";
import { STORAGE_KEY as REVIEW_KEY } from "./review.js";
import { DECK_KEY, lastDeck, openDeck } from "./deck.js";

/* jsdom has no Web Animations API, so slides swap instantly and every
   assertion below can stay synchronous. */

const cards = [
  { key: "a", frontText: "eins", backText: "one" },
  { key: "b", frontText: "zwei", backText: "two" },
  { key: "c", frontText: "drei", backText: "three" },
];

/** Random that leaves the order alone, so "next" means the next card written above. */
const unshuffled = () => 0.999;

const press = (key) => document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

const front = () => document.querySelector(".fc-front .fc-text").textContent;
const marks = () => document.querySelector(".fc-card").className.replace("fc-card", "").trim();
const filled = () => document.querySelectorAll(".fc-dot.is-filled").length;
const corner = () => document.querySelector(".fc-corner");
const schedule = (key) => JSON.parse(localStorage.getItem(REVIEW_KEY) ?? "{}")[key];

const mounted = [];
const open = (deck = cards, options = {}) =>
  mounted[mounted.push(openDeck(deck, { storage: localStorage, random: unshuffled, ...options })) - 1];

describe("openDeck", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    for (const deck of mounted.splice(0)) deck.destroy();
    document.body.replaceChildren();
  });

  it("mounts the deck it is given", () => {
    open();
    expect(front()).toBe("eins");
  });

  /* One HTML file is one deck (V2-1.2), so there is nothing else on the page
     for it to go beside and a deck page names no element at all. */
  it("takes the whole page unless told otherwise", () => {
    open();
    expect(document.querySelector(".fc").parentElement).toBe(document.body);
  });

  it("mounts into a given element instead, so a deck can be embedded", () => {
    const host = document.createElement("section");
    document.body.append(host);

    open(cards, { element: host });

    expect(document.querySelector(".fc").parentElement).toBe(host);
    expect(front()).toBe("eins");
  });

  /* The wiring every deck page used to spell out, now asserted once: a grade
     reaches review.js, and the row of squares follows the box it moved to. */
  it("records a grade against the review schedule", () => {
    open();

    press("ArrowUp");
    expect(schedule("a")).toMatchObject({ box: 1, grade: "easier" });
    expect(marks()).toBe("is-easier");
    expect(filled()).toBe(1);

    press("ArrowDown");
    expect(schedule("a")).toMatchObject({ box: 0, grade: "harder" });
    expect(filled()).toBe(0);
  });

  it("reports a card paged past without grading, without deferring it", () => {
    open();

    press("ArrowRight");
    expect(schedule("a").dueAt).toBeLessThanOrEqual(Date.now());
    expect(schedule("a").grade).toBeUndefined();
  });

  it("brings a grade back after a reload, marked and settled", () => {
    open().destroy();
    mounted.length = 0;
    document.body.replaceChildren();

    /* The reader graded this card earlier today, in a page since gone. */
    localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 1, dueAt: Date.now(), baseBox: 0, day: today(), grade: "easier" } }));

    open();
    expect(marks()).toBe("is-easier");

    press("ArrowDown"); /* too late: the day's grade is settled */
    expect(marks()).toBe("is-easier");
    expect(schedule("a").grade).toBe("easier");
  });

  it("draws a row of one square per box above the first", () => {
    open();
    expect(document.querySelectorAll(".fc-dot")).toHaveLength(5);
  });

  /* A deck is "study this material", the dictionary is "what is due across
     everything" — so opening a deck shows its cards whether or not the schedule
     has come round to them. */
  it("shows a deck's own cards even when none of them is due", () => {
    const later = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(REVIEW_KEY, JSON.stringify(Object.fromEntries(cards.map((c) => [c.key, { box: 3, dueAt: later }]))));

    open();
    expect(document.querySelector(".fc-card")).not.toBe(null);
    expect(front()).toBe("eins");
  });

  it("holds back a not-due card in the dictionary, where a deck would not", () => {
    const later = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(CARDS_KEY, JSON.stringify(Object.fromEntries(cards.map((c) => [c.key, c]))));
    localStorage.setItem(
      REVIEW_KEY,
      JSON.stringify({ a: { box: 3, dueAt: later }, b: { box: 3, dueAt: later }, c: { box: 0, dueAt: Date.now() } }),
    );

    open([]);
    expect(front()).toBe("drei"); /* only c is due, so the session is just c */
    press("ArrowRight");
    expect(front()).toBe("drei"); /* and it wraps to itself */
  });

  it("studies the whole dictionary when the page brings no cards of its own", () => {
    open(); /* opening a deck is what puts its cards in the dictionary */
    mounted.splice(0).forEach((deck) => deck.destroy());
    document.body.replaceChildren();

    open([]);
    expect(Object.keys(JSON.parse(localStorage.getItem(CARDS_KEY)))).toEqual(["a", "b", "c"]);
    expect(front()).toBe("eins");
  });

  it("refuses a page with no cards and nothing in the dictionary", () => {
    expect(() => openDeck([], { storage: localStorage })).toThrow(/at least one card/);
  });

  describe("the way out", () => {
    const to = { corner: { href: "../dictionary.html", label: "Everything you have seen" } };

    it("is absent for the only deck a reader has ever opened", () => {
      open(cards, to);
      expect(corner()).toBe(null);
    });

    it("is absent when the page asks for no corner at all", () => {
      localStorage.setItem(CARDS_KEY, JSON.stringify({ z: { key: "z", frontText: "x", backText: "y" } }));
      open();
      expect(corner()).toBe(null);
    });

    it("appears once the dictionary holds a card this deck does not", () => {
      localStorage.setItem(CARDS_KEY, JSON.stringify({ z: { key: "z", frontText: "vier", backText: "four" } }));
      open(cards, to);

      expect(corner().getAttribute("href")).toBe("../dictionary.html");
      expect(corner().getAttribute("aria-label")).toBe("Everything you have seen");
    });

    /* It draws what it leads to: the dictionary is many decks at once, a deck
       is one. Both are the 4:3 of the real card. */
    it("draws two cards from a deck and one from the dictionary", () => {
      localStorage.setItem(CARDS_KEY, JSON.stringify({ z: { key: "z", frontText: "vier", backText: "four" } }));
      open(cards, to);
      expect(corner().querySelectorAll("rect")).toHaveLength(2);

      mounted.splice(0).forEach((deck) => deck.destroy());
      document.body.replaceChildren();

      open([], to);
      expect(corner().querySelectorAll("rect")).toHaveLength(1);
    });

    /* Which deck "back" means is not fixed once there is more than one, so a
       deck records itself and the dictionary reads that. */
    it("remembers the deck the reader opened, so the dictionary can lead back to it", () => {
      document.title = "Numbers and Time";
      open();

      expect(lastDeck(localStorage)).toEqual({ href: "/", label: "Numbers and Time" });
    });

    it("does not remember the dictionary as somewhere to come back to", () => {
      document.title = "Everyday German";
      open();

      document.title = "Everything you have seen";
      mounted.splice(0).forEach((deck) => deck.destroy());
      document.body.replaceChildren();
      open([]);

      expect(lastDeck(localStorage).label).toBe("Everyday German");
    });

    it("has no way back to offer before any deck has been opened", () => {
      expect(lastDeck(localStorage)).toBe(null);
    });

    it("offers no way back rather than a broken one, if the record is unusable", () => {
      localStorage.setItem(DECK_KEY, JSON.stringify({ href: 42 }));
      expect(lastDeck(localStorage)).toBe(null);

      localStorage.setItem(DECK_KEY, "{ not json");
      expect(lastDeck(localStorage)).toBe(null);
    });

    it("sits outside the mounted deck, where a tap on it is not a tap on the card", () => {
      localStorage.setItem(CARDS_KEY, JSON.stringify({ z: { key: "z", frontText: "vier", backText: "four" } }));
      open(cards, to);

      expect(document.querySelector(".fc").contains(corner())).toBe(false);
    });
  });
});

/** review.js stamps the reader's own calendar day; mirror it for the fixture. */
function today(now = Date.now()) {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
