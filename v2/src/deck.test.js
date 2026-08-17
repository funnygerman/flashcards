import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY as CARDS_KEY } from "./store.js";
import { STORAGE_KEY as REVIEW_KEY } from "./review.js";
import { DECK_KEY, HINTS_KEY, lastDeck, openDeck } from "./deck.js";

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

/** A reader who has met the guide, which every test but its own assumes. */
const seasoned = () => localStorage.setItem(HINTS_KEY, JSON.stringify({ guide: true }));

/** ...and one who has not, so the guide leads their session. */
const newcomer = () => localStorage.removeItem(HINTS_KEY);

describe("openDeck", () => {
  beforeEach(() => {
    localStorage.clear();
    seasoned();
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
     reaches review.js, and the row of marks follows the box it moved to. */
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

  it("draws a row of one mark per box above the first", () => {
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

  /* Nothing on a card with no chrome advertises that swiping exists, so a first
     session is led by four cards that teach the deck by being one. */
  describe("the first-run guide", () => {
    const details = () => document.querySelector(".fc-front .fc-details").textContent;

    beforeEach(newcomer);

    it("deals the guide in front of the deck, in its own order", () => {
      open();

      expect(front()).toBe("Tap this card");
      expect(details()).toMatch(/press Space/i);

      press("ArrowRight");
      expect(front()).toBe("Swipe up if you knew it.");
    });

    it("hands over to the reader's own cards at the end of it", () => {
      open();

      for (let i = 0; i < 4; i += 1) press("ArrowRight");
      expect(front()).toBe("eins");
    });

    /* Guide cards have no key, which is what keeps them out of the dictionary
       and out of the schedule. Nothing the reader does to one is recorded. */
    it("leaves nothing behind in the dictionary", () => {
      open();

      press("ArrowUp"); /* grade the guide card the reader is on */
      press("ArrowRight");

      expect(Object.keys(JSON.parse(localStorage.getItem(CARDS_KEY)))).toEqual(["a", "b", "c"]);
    });

    it("leaves nothing behind in the schedule", () => {
      open();

      press("ArrowUp");
      press("ArrowRight"); /* and a neutral for the next one it pages past */
      press("ArrowRight");

      expect(Object.keys(JSON.parse(localStorage.getItem(REVIEW_KEY) ?? "{}"))).toEqual([]);
    });

    /* It can still be swiped at and marked — the mark is what the card is
       teaching; it simply goes nowhere. */
    it("marks a guide card the reader swipes on", () => {
      open();

      press("ArrowUp");
      expect(marks()).toBe("is-easier");
    });

    /* Swiping right (previous) on the very first guide card used to wrap the
       whole lead-plus-deck sequence as one ring, landing on the deck's own
       last card — real material shown before the guide had said anything, on
       the reader's very first gesture. */
    it("does not leak a deck card to a reader who swipes right on the first guide card", () => {
      open();

      press("ArrowLeft"); // previous, on the first card of the guide
      expect(front()).toBe("That is all of it."); // wraps within the guide, to its own last card
    });

    it("keeps wrapping within the guide while it is still in progress, however far back the reader goes", () => {
      open();

      press("ArrowRight"); // into guide card 2
      press("ArrowLeft"); // back to guide card 1: visited, not completed
      press("ArrowLeft"); // still guide-only

      expect(front()).toBe("That is all of it.");
    });

    /* Once the reader has completed the guide going forward, it is retired for
       the session: paging back from the deck's first card must not return to it. */
    it("does not go back to the guide once the deck has taken over", () => {
      open();

      for (let i = 0; i < 4; i += 1) press("ArrowRight"); // completes the guide
      expect(front()).toBe("eins");

      press("ArrowLeft"); // wraps within the deck, not back into the guide
      expect(front()).toBe("drei");
    });

    it("does not lead the next session", () => {
      open();
      mounted.splice(0).forEach((deck) => deck.destroy());
      document.body.replaceChildren();

      open();
      expect(front()).toBe("eins");
    });

    /* Remembered as it is dealt: a reader who reloads part-way through has met
       the guide, and starting it again from the top is not what they asked for. */
    it("does not start again after a reload part-way through", () => {
      open();
      press("ArrowRight");

      mounted.splice(0).forEach((deck) => deck.destroy());
      document.body.replaceChildren();

      open();
      expect(front()).toBe("eins");
    });

    /* The flag arrived after v2 had readers, so a schedule already in storage
       says this is nobody's first session whatever the flag says. */
    it("does not greet a reader who already has a schedule", () => {
      localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 2, dueAt: Date.now() } }));
      open();

      expect(front()).toBe("eins");
    });

    it("adds no element to the page: it is cards, and nothing else", () => {
      open();

      expect(document.querySelector(".fc-legend")).toBe(null);
      expect(document.body.children).toHaveLength(1);
    });
  });

  /* The one interaction that leaves the screen unchanged says so in words, on
     the card's own grade mark: the reader swiped against a grade they already
     gave, and that grade answers. */
  describe("a refused grade", () => {
    const message = () => document.querySelector(".fc-front").getAttribute("data-message");

    it("says nothing until there is something to say", () => {
      open();
      press("ArrowUp");

      expect(message()).toBe(null);
    });

    it("explains itself when today's grade is already given", () => {
      localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 1, dueAt: Date.now(), baseBox: 0, day: today(), grade: "easier" } }));
      open();

      press("ArrowDown");

      expect(message()).toMatch(/already rated today/i);
    });

    it("says the same thing about a card graded and left in this session", () => {
      open();

      press("ArrowUp"); // card a
      press("ArrowRight"); // leaving settles it
      press("ArrowLeft"); // back to card a
      press("ArrowDown");

      expect(message()).toMatch(/already rated today/i);
    });

    /* The band grows out of the mark the card already wears, so the words land
       on the edge carrying the grade the reader is arguing with. */
    it("says it on the edge that carries the grade", () => {
      localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 1, dueAt: Date.now(), baseBox: 0, day: today(), grade: "easier" } }));
      open();

      press("ArrowDown");

      expect(document.querySelector(".fc-card").className).toContain("is-easier");
    });

    it("stops saying it when the card is paged away", () => {
      open();

      press("ArrowUp");
      press("ArrowRight");
      press("ArrowLeft");
      press("ArrowDown");
      expect(message()).not.toBe(null);

      press("ArrowRight");
      expect(message()).toBe(null);
    });
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
