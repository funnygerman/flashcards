import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { STORAGE_KEY as CARDS_KEY } from "./store.js";
import { STORAGE_KEY as REVIEW_KEY } from "./review.js";
import { DECK_KEY, HINTS_KEY, SIDE_KEY, lastDeck, openDeck } from "./deck.js";

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
const back = () => document.querySelector(".fc-back .fc-text").textContent;
const flipped = () => document.querySelector(".fc-card").classList.contains("is-flipped");

/* The menu, and the rows it is showing — rebuilt every time it is opened, so
   everything here reads it open rather than caching an element. */
const menu = () => document.querySelector(".fc-menu-open");
const opened = () => {
  if (menu().getAttribute("aria-expanded") !== "true") menu().click();
  return [...document.querySelectorAll(".fc-menu-item")];
};
const groups = () => {
  opened();
  return [...document.querySelectorAll(".fc-menu-group")].map((g) => [...g.children].map((i) => i.textContent));
};
const chose = () => opened().filter((item) => item.getAttribute("aria-checked") === "true").map((item) => item.textContent);
const choose = (label) => {
  const item = opened().find((candidate) => candidate.textContent === label);
  if (!item) throw new Error(`no menu row named ${label}`);
  item.click();
};

/* Choosing a row leaves the sheet up — a reader may have more than one
   question — and an open menu owns the arrows (V2-16.7). Anything that goes on
   to press one has to put the menu away first, exactly as a reader would. */
const chooseAndClose = (label) => {
  choose(label);
  menu().click();
};
const schedule = (key) => JSON.parse(localStorage.getItem(REVIEW_KEY) ?? "{}")[key];

const mounted = [];
const open = (deck = cards, options = {}) =>
  mounted[mounted.push(openDeck(deck, { storage: localStorage, random: unshuffled, ...options })) - 1];

const DAY = 24 * 60 * 60 * 1000;

/** Every card of the deck filed in a high box, due `days` from now. */
const scheduleAll = (days, box = 3) =>
  localStorage.setItem(
    REVIEW_KEY,
    JSON.stringify(Object.fromEntries(cards.map((c) => [c.key, { box, dueAt: Date.now() + days * DAY }]))),
  );

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
  /* The band's words are the app's own, so they follow `lang` exactly as the
     guide and the toggle's label do (V2-14.4) — and never a card's content. */
  describe("the grade band's words", () => {
    const bandEdge = () => document.querySelector(".fc-card").getAttribute("data-grade-edge");
    const bandWord = () => document.querySelector(".fc-front").getAttribute("data-grade");

    /** A drag past the threshold, which is what raises the band. */
    const swipe = (dy) => {
      const card = document.querySelector(".fc");
      for (const type of ["pointerdown", "pointermove"]) {
        card.dispatchEvent(new MouseEvent(type, { clientX: 200, clientY: 200 + (type === "pointerdown" ? 0 : dy), bubbles: true }));
      }
    };

    it("names the grade the reader is reaching for", () => {
      open();
      swipe(-60);

      expect(bandEdge()).toBe("top");
      expect(bandWord()).toBe("Knew it");
    });

    it("names it in the reader's language, given one", () => {
      open(cards, { lang: "de" });
      swipe(60);

      expect(bandEdge()).toBe("bottom");
      expect(bandWord()).toBe("Nicht gewusst");
    });
  });

  it("records a grade against the review schedule", () => {
    open();

    press("ArrowUp"); /* card a, which the grade then takes out of the session */
    expect(schedule("a")).toMatchObject({ box: 1, grade: "easier" });
    expect(front()).toBe("zwei");
  });

  /* An answered card is out of the session for good, so there is no paging
     back to it and no second answer to give it (V2-3.9, V2-5.16). */
  it("takes an answered card out of the session, in both directions", () => {
    open();

    press("ArrowUp"); /* a, answered */
    expect(front()).toBe("zwei");

    press("ArrowLeft");
    expect(front()).toBe("drei");

    press("ArrowLeft");
    expect(front()).toBe("zwei");
  });

  /* The last answer of a session is the end of it: the page has one card left
     to show and it is the one that says there is nothing left (V2-13.15). */
  it("says there is nothing left once every card has been answered", () => {
    open();

    press("ArrowUp");
    press("ArrowUp");
    press("ArrowUp");

    expect(front()).toBe("Nothing to repeat today");

    /* And it stays that way, however the reader pages around it. */
    press("ArrowRight");
    expect(front()).toBe("Nothing to repeat today");
    press("ArrowLeft");
    expect(front()).toBe("Nothing to repeat today");
  });

  /* The card that says so is not material: swiping at it earns nothing and
     cannot page the reader off it (V2-13.12). */
  it("keeps the card that says so out of the schedule", () => {
    open();

    for (const card of cards) void card, press("ArrowUp");
    press("ArrowUp");

    expect(front()).toBe("Nothing to repeat today");
    expect(filled()).toBe(0);
    expect(Object.keys(JSON.parse(localStorage.getItem(REVIEW_KEY)))).toEqual(["a", "b", "c"]);
  });

  /* A session is a sitting's worth, not the whole pool (V2-13.4). Working
     through one deals the next rather than declaring the day over. */
  it("deals the next sitting when a capped session runs out", () => {
    const many = Array.from({ length: 51 }, (_, i) => ({ key: `k${i}`, frontText: `f${i}`, backText: `b${i}` }));

    open(many);

    for (let i = 0; i < 50; i += 1) press("ArrowUp");

    /* Fifty answered, one card of the deck never dealt — so the session that
       follows is that card, not the end of the day. */
    expect(front()).not.toBe("Nothing to repeat today");
    expect(Object.keys(JSON.parse(localStorage.getItem(REVIEW_KEY)))).toHaveLength(50);

    press("ArrowUp");
    expect(front()).toBe("Nothing to repeat today");
  });

  it("reports a card paged past without grading, without deferring it", () => {
    open();

    press("ArrowRight");
    expect(schedule("a").dueAt).toBeLessThanOrEqual(Date.now());
    expect(schedule("a").grade).toBeUndefined();
  });

  /* A reload is not a second chance at the day. The card the reader answered
     this morning is not dealt again, however its own box reads (V2-13.14) —
     `harder` files a card in box 0, due immediately, and the day still has the
     final word. */
  it("does not deal a card the reader already answered today", () => {
    open().destroy();
    mounted.length = 0;
    document.body.replaceChildren();

    localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 0, dueAt: Date.now(), baseBox: 0, day: today(), grade: "harder" } }));

    open();
    expect(front()).toBe("zwei");

    press("ArrowUp");
    press("ArrowUp");
    expect(front()).toBe("Nothing to repeat today");
  });

  it("draws a row of one mark per box above the first", () => {
    open();
    expect(document.querySelectorAll(".fc-dot")).toHaveLength(5);
  });

  /* A deck and the dictionary both study what is due, out of their own pool
     (V2-13.4). Nothing in this deck is due, so the deck says so rather than
     reaching for a card the schedule has put a month away (V2-13.12). */
  it("says there is nothing to repeat when none of a deck's cards is due", () => {
    scheduleAll(30);

    open();
    expect(front()).toBe("Nothing to repeat today");
    expect(document.querySelector(".fc-back .fc-text").textContent).toBe("Come back tomorrow");
  });

  it("says it in the reader's own language", () => {
    scheduleAll(30);

    open(cards, { lang: "de" });
    expect(front()).toBe("Heute nichts zu wiederholen");
  });

  /* It is the app talking, not a word to learn: no key, so nothing about it
     reaches the dictionary or the schedule (V2-15.5's rule, applied to the one
     other card deck.js writes itself). */
  it("leaves the done card out of the dictionary and the schedule", () => {
    localStorage.setItem(CARDS_KEY, JSON.stringify(Object.fromEntries(cards.map((c) => [c.key, c]))));
    scheduleAll(30);

    open();
    press("ArrowUp");

    expect(Object.keys(JSON.parse(localStorage.getItem(CARDS_KEY)))).toEqual(["a", "b", "c"]);
    expect(Object.keys(JSON.parse(localStorage.getItem(REVIEW_KEY)))).toEqual(["a", "b", "c"]);
    expect(filled()).toBe(0); /* and it earns no star for being swiped at */
  });

  it("says it for the dictionary too, where a page brings no cards of its own", () => {
    localStorage.setItem(CARDS_KEY, JSON.stringify(Object.fromEntries(cards.map((c) => [c.key, c]))));
    scheduleAll(30);

    open([]);
    expect(front()).toBe("Nothing to repeat today");
  });

  it("holds back a not-due card in a deck, same as the dictionary", () => {
    const later = Date.now() + 30 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      REVIEW_KEY,
      JSON.stringify({ a: { box: 3, dueAt: later }, b: { box: 3, dueAt: later }, c: { box: 0, dueAt: Date.now() } }),
    );

    open();
    expect(front()).toBe("drei"); /* only c is due, so the session is just c */
    press("ArrowRight");
    expect(front()).toBe("drei"); /* and it wraps to itself */
  });

  it("holds back a not-due card in the dictionary too", () => {
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

  /* A key that has to be corrected takes the reader's progress with it (V2-6.8),
     which is the whole difference between correcting a card and replacing it. */
  describe("a key that has moved", () => {
    const before = "hundert-a-hundred";
    const after = "hundert-one-hundred";
    const card = { key: after, wasKey: before, frontText: "hundert", backText: "one hundred" };

    it("keeps the box the reader earned under the old key", () => {
      localStorage.setItem(REVIEW_KEY, JSON.stringify({ [before]: { box: 4, dueAt: 0 } }));

      open([card]);

      expect(schedule(after).box).toBe(4);
      expect(schedule(before)).toBeUndefined();
    });

    it("carries today's answer across, so the card is not dealt again", () => {
      localStorage.setItem(
        REVIEW_KEY,
        JSON.stringify({ [before]: { box: 3, dueAt: 0, baseBox: 2, day: today(), grade: "easier" } }),
      );

      open([card]);

      /* The day's answer moved with the key, exactly as the box did, so this
         page has nothing left to offer (V2-13.14). */
      expect(front()).toBe("Nothing to repeat today");
      expect(schedule(after)).toMatchObject({ box: 3, grade: "easier", day: today() });
    });

    it("does not leave the old card behind in the dictionary", () => {
      localStorage.setItem(
        CARDS_KEY,
        JSON.stringify({ [before]: { key: before, frontText: "hundert", backText: "a hundred" } }),
      );

      open([card]);

      expect(Object.keys(JSON.parse(localStorage.getItem(CARDS_KEY)))).toEqual([after]);
    });

    it("stores the card's text, not the note that moved it", () => {
      open([card]);

      expect(JSON.parse(localStorage.getItem(CARDS_KEY))[after]).toEqual({
        key: after,
        frontText: "hundert",
        backText: "one hundred",
      });
    });

    it("costs a reader who never had the old key nothing", () => {
      open([card]);

      expect(Object.keys(JSON.parse(localStorage.getItem(CARDS_KEY)))).toEqual([after]);
      expect(JSON.parse(localStorage.getItem(REVIEW_KEY) ?? "{}")).toEqual({});
    });
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
      expect(front()).toBe("Swipe up if you knew it");
    });

    it("hands over to the reader's own cards at the end of it", () => {
      open();

      for (let i = 0; i < 5; i += 1) press("ArrowRight");
      expect(front()).toBe("eins");
    });

    /* A grading gesture takes the card away (V2-8.4), so it is a forward step
       through the guide like any other — which is what lets cards two and
       three teach a grade each and be answered by the next card appearing,
       rather than by their own backs (V2-15.4). */
    it("walks forward on a grade, exactly as paging does", () => {
      open();

      press("ArrowRight"); // guide 2, which asks for a swipe up
      press("ArrowUp");
      expect(front()).toBe("Swipe down if you didn't");

      press("ArrowDown");
      expect(front()).toBe("Stars are days you got it right");
    });

    it("deals the guide in the reader's language, given one", () => {
      open(cards, { lang: "de" });

      expect(front()).toBe("Tippe auf diese Karte");
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
      press("ArrowLeft"); /* back to the card the swipe was made on */
      expect(marks()).toBe("is-easier");
    });

    /* Nothing about a guide card is stored, so there is no day for it to have
       been answered on and nothing for a second answer to corrupt: it stays in
       the guide, and swiping at it again is answered rather than refused
       (V2-5.16). */
    it("goes on answering a reader who swipes at the same guide card twice", () => {
      const message = () => document.querySelector(".fc-front").getAttribute("data-message");

      open();

      press("ArrowUp");
      press("ArrowLeft"); /* the card is still there to be swiped at */
      press("ArrowDown");

      expect(message()).toBe(null);
      expect(filled()).toBe(0); /* the guide's own box answered the second swipe */
    });

    /* Card three claims a star for every day the reader gets a card right,
       and a wrong answer clearing them all — a claim the reader can only
       check by swiping and watching the row, so it has to be true of the
       guide's own cards too, even though nothing about them is stored. */
    it("fills a star when a guide card is graded easier", () => {
      open();

      press("ArrowUp");
      expect(filled()).toBe(1);
    });

    it("empties the row again on a harder grade, exactly as a real card's box would", () => {
      open();

      press("ArrowUp");
      press("ArrowRight"); // guide card 2
      press("ArrowUp");
      expect(filled()).toBe(2);

      press("ArrowDown");
      expect(filled()).toBe(0);
    });

    it("carries the guide's own count from one guide card to the next", () => {
      open();

      press("ArrowUp");
      press("ArrowRight");
      expect(filled()).toBe(1); // still lit on the card the swipe wasn't even made on
    });

    /* Swiping right (previous) on the very first guide card used to wrap the
       whole lead-plus-deck sequence as one ring, landing on the deck's own
       last card — real material shown before the guide had said anything, on
       the reader's very first gesture. */
    it("does not leak a deck card to a reader who swipes right on the first guide card", () => {
      open();

      press("ArrowLeft"); // previous, on the first card of the guide
      expect(front()).toBe("That is all of it"); // wraps within the guide, to its own last card
    });

    it("keeps wrapping within the guide while it is still in progress, however far back the reader goes", () => {
      open();

      press("ArrowRight"); // into guide card 2
      press("ArrowLeft"); // back to guide card 1: visited, not completed
      press("ArrowLeft"); // still guide-only

      expect(front()).toBe("That is all of it");
    });

    /* Reaching the guide's last card by wrapping backward from the first is
       not completion: only cards 1 and 4 have actually been shown, 2 and 3
       never appeared. Forward from there must not read as "the whole guide
       was seen" just because the cursor happens to sit on the last one. */
    it("does not complete the guide from a card reached by wrapping backward past it", () => {
      open();

      press("ArrowLeft"); // guide card 1 -> wraps to guide card 4
      press("ArrowRight"); // forward from there

      expect(front()).toBe("Tap this card"); // back to guide card 1, not the deck
    });

    it("completes normally once every guide card has actually been shown, shortcut attempt notwithstanding", () => {
      open();

      press("ArrowLeft"); // shortcut attempt: guide 1 -> guide 5
      press("ArrowRight"); // refused, back to guide 1

      for (let i = 0; i < 5; i += 1) press("ArrowRight"); // a genuine forward walk
      expect(front()).toBe("eins");
    });

    /* Once the reader has completed the guide going forward, it is retired for
       the session: paging back from the deck's first card must not return to it. */
    it("does not go back to the guide once the deck has taken over", () => {
      open();

      for (let i = 0; i < 5; i += 1) press("ArrowRight"); // completes the guide
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

    /* A card-less page with an empty dictionary throws (V2-13.8) before the
       guide is ever shown — the flag must not say otherwise, or a reader who
       never saw it has no way to (V2-15.6). */
    it("does not mark the guide as met when mounting throws before showing it", () => {
      expect(() => open([])).toThrow(/at least one card/); // nothing was actually mounted

      open(); // a real deck, the reader's actual first visit
      expect(front()).toBe("Tap this card");
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
  /* There is no refused grade left to explain. A grade takes the card away
     and `previous` brings it back to be changed, so no gesture is dropped and
     the card has nothing to apologise for (V2-15.2). `say()` remains the seam
     for a host that has a sentence; this one no longer does. */
  /* Where a reader meets a card they have already answered: not in a due
     session, which holds none, but through their own "every card" filter
     (V2-13.13), which shows the pool regardless of schedule or day. */
  describe("a card already answered today", () => {
    const message = () => document.querySelector(".fc-front").getAttribute("data-message");
    const answered = () =>
      localStorage.setItem(
        REVIEW_KEY,
        JSON.stringify({ a: { box: 1, dueAt: Date.now(), baseBox: 0, day: today(), grade: "easier" } }),
      );

    it("arrives wearing the mark it was left with", () => {
      answered();
      open();
      choose("Every card");

      expect(front()).toBe("eins");
      expect(marks()).toBe("is-easier");
    });

    it("says so rather than taking a second answer", () => {
      answered();
      open();
      chooseAndClose("Every card");

      press("ArrowDown");

      expect(message()).toBe("Already graded today");

      /* Nothing moved and nothing was stored: the card is where it was, still
         wearing this morning's mark, and so is its schedule (V2-5.16). */
      expect(front()).toBe("eins");
      expect(marks()).toBe("is-easier");
      expect(schedule("a")).toMatchObject({ box: 1, grade: "easier" });
    });

    it("says it again on a second attempt, rather than giving in", () => {
      answered();
      open();
      chooseAndClose("Every card");

      press("ArrowDown");
      press("ArrowUp");

      expect(front()).toBe("eins");
      expect(schedule("a")).toMatchObject({ box: 1, grade: "easier" });
    });

    it("says it in the reader's own language", () => {
      answered();
      open(cards, { lang: "de" });
      chooseAndClose("Alle Karten");

      press("ArrowDown");

      expect(message()).toBe("Heute schon bewertet");
    });

    /* The cards beside it in the same session are ordinary material: the
       refusal is about one card's day, not about the filter. */
    it("does not stop the reader answering the rest", () => {
      answered();
      open();
      chooseAndClose("Every card");

      press("ArrowRight");
      expect(front()).toBe("zwei");

      press("ArrowUp");
      expect(schedule("b")).toMatchObject({ box: 1, grade: "easier" });
    });
  });

  /* The four sessions a page can deal overlap, so a card answered on one of
     them must be gone from all of them (V2-13.16). Keeping each selection as
     first dealt meant the due session went on offering cards the reader had
     answered under "Every card", refusing every one of them and never reaching
     the card that says the day is done — the original complaint, by another
     door. */
  describe("a card answered on one session, met on another", () => {
    const message = () => document.querySelector(".fc-front").getAttribute("data-message");

    it("is gone from the due session it was not answered on", () => {
      open();

      chooseAndClose("Every card");
      press("ArrowUp"); /* answers whichever card that session leads with */

      chooseAndClose("Due today");

      const offered = [];
      for (let i = 0; i < 4; i += 1) {
        offered.push(front());
        press("ArrowRight");
      }

      expect(offered).not.toContain("eins");
      expect(message()).toBe(null);
    });

    it("leaves the due session saying the day is done, once every card is answered", () => {
      open();

      press("ArrowUp"); /* one under "Due today" */

      chooseAndClose("Every card");
      for (let i = 0; i < 6; i += 1) press("ArrowUp"); /* the rest, over here */

      chooseAndClose("Due today");

      expect(front()).toBe("Nothing to repeat today");
      expect(message()).toBe(null);
    });

    /* The other half of the same rule: a session nothing has happened to comes
       back as it was, cursor and all (V2-3.8). */
    it("leaves an untouched session exactly where the reader left it", () => {
      localStorage.setItem(CARDS_KEY, JSON.stringify({ z: { key: "z", frontText: "vier", backText: "four" } }));

      open();

      press("ArrowRight"); /* zwei */
      chooseAndClose("Everything you have seen");
      chooseAndClose("This deck");

      expect(front()).toBe("zwei");
    });
  });

  /* The card that says there is nothing left is a notice, not material: there
     is nothing for a swipe at it to land on, and it must not pretend otherwise
     (V2-5.17). It used to take a grade like a guide card — band, exit, and the
     mark still on it when it came back. */
  describe("swiping at the card that says the day is done", () => {
    const message = () => document.querySelector(".fc-front").getAttribute("data-message");

    const finished = () => {
      scheduleAll(30);
      open();
      expect(front()).toBe("Nothing to repeat today");
    };

    it("says there is nothing to grade", () => {
      finished();

      press("ArrowUp");

      expect(message()).toBe("Nothing to grade");
    });

    it("leaves no mark on it, in either direction", () => {
      finished();

      press("ArrowUp");
      expect(marks()).toBe("");

      press("ArrowDown");
      expect(marks()).toBe("");
    });

    it("does not move the card, and writes nothing", () => {
      finished();

      const before = localStorage.getItem(REVIEW_KEY);

      press("ArrowDown");
      press("ArrowUp");

      expect(front()).toBe("Nothing to repeat today");
      expect(localStorage.getItem(REVIEW_KEY)).toBe(before);
      expect(filled()).toBe(0);
    });

    it("says it in the reader's own language", () => {
      scheduleAll(30);
      open(cards, { lang: "de" });

      press("ArrowUp");

      expect(message()).toBe("Nichts zu bewerten");
    });

    /* Everything else it could do, it still does (V2-13.12). */
    it("still flips and still pages", () => {
      finished();

      press(" ");
      expect(flipped()).toBe(true);

      press("ArrowRight");
      expect(front()).toBe("Nothing to repeat today");
    });

    /* The same card, reached by finishing a session rather than by arriving at
       one that was already empty. */
    it("holds the same line for a session worked through", () => {
      open();

      press("ArrowUp");
      press("ArrowUp");
      press("ArrowUp");
      expect(front()).toBe("Nothing to repeat today");

      press("ArrowUp");

      expect(message()).toBe("Nothing to grade");
      expect(marks()).toBe("");
    });
  });

  /* A session worked through does not come back through the menu: switching
     pool and back returns to the session as it now is, not to the one the
     reader finished (V2-13.15). */
  it("keeps a spent session spent across a switch of pools", () => {
    localStorage.setItem(CARDS_KEY, JSON.stringify({ z: { key: "z", frontText: "vier", backText: "four" } }));

    open();

    press("ArrowUp");
    press("ArrowUp");
    press("ArrowUp");
    expect(front()).toBe("Nothing to repeat today");

    chooseAndClose("Everything you have seen");
    expect(front()).not.toBe("Nothing to repeat today");

    chooseAndClose("This deck");
    expect(front()).toBe("Nothing to repeat today");
  });

  describe("the menu", () => {
    /* An extra card in the dictionary this deck does not carry itself, so the
       pool group has somewhere new to switch to. */
    const extra = () => localStorage.setItem(CARDS_KEY, JSON.stringify({ z: { key: "z", frontText: "vier", backText: "four" } }));

    it("is on every page, because every deck has two sides to choose between", () => {
      open();

      expect(menu()).not.toBe(null);
      expect(menu().getAttribute("aria-label")).toBe("Menu");
      expect(document.querySelector(".fc-menu-sheet").hidden).toBe(true);
    });

    it("opens, closes, and says which it is", () => {
      open();

      menu().click();
      expect(menu().getAttribute("aria-expanded")).toBe("true");
      expect(document.querySelector(".fc-menu-sheet").hidden).toBe(false);

      menu().click();
      expect(menu().getAttribute("aria-expanded")).toBe("false");
      expect(document.querySelector(".fc-menu-sheet").hidden).toBe(true);
    });

    /* The whole reason it is here rather than out in a corner of the viewport:
       it measures itself against the card, which it can only do from inside
       the element the card is sized in (V2-16.2). */
    it("sits in the library's own chrome layer, beside the card", () => {
      open();

      expect(document.querySelector(".fc-chrome").contains(menu())).toBe(true);
      expect(document.querySelector(".fc").contains(menu())).toBe(true);
    });

    /* A tap that opens the menu is not also a tap on the card (V2-16.2). */
    it("does not flip the card underneath it", () => {
      open();

      menu().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
      menu().dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 0, clientY: 0 }));

      expect(flipped()).toBe(false);
    });

    it("closes on a tap outside it, and that tap does not flip the card either", () => {
      open();
      menu().click();

      const scrim = document.querySelector(".fc-menu-scrim");
      scrim.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
      scrim.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 0, clientY: 0 }));
      scrim.click();

      expect(menu().getAttribute("aria-expanded")).toBe("false");
      expect(flipped()).toBe(false);
    });

    it("closes on Escape", () => {
      open();
      menu().click();

      press("Escape");
      expect(menu().getAttribute("aria-expanded")).toBe("false");
    });

    /* The four arrows are the deck's while the card is the page, and an open
       sheet is the one moment it is not (V2-16.7). */
    it("keeps the deck's own keys off the card while it is open", () => {
      open();

      menu().click();
      press("ArrowRight");
      press("ArrowUp");

      expect(front()).toBe("eins"); // never paged
      expect(marks()).toBe(""); // and never graded
      expect(schedule("a")).toBeUndefined();

      menu().click(); // closed again, and the deck has them back
      press("ArrowRight");
      expect(front()).toBe("zwei");
    });

    it("gives them straight back once it is closed", () => {
      open();

      menu().click();
      press("Escape");
      press("ArrowRight");

      expect(front()).toBe("zwei");
    });

    it("goes when the deck does, and takes its key listener with it", () => {
      const deck = open();
      deck.destroy();

      expect(menu()).toBe(null);
      expect(() => press("Escape")).not.toThrow();
    });

    /* Which side comes up first (V2-16.4): what readers asked for, and the
       one group that is on every page because every deck has two sides. */
    describe("which side comes up first", () => {
      it("offers the three sides, front chosen, on a reader's first visit", () => {
        open();

        expect(groups()[0]).toEqual(["Front first", "Back first", "Random side"]);
        expect(chose()).toContain("Front first");
        expect(flipped()).toBe(false);
      });

      it("turns the card on screen over, not just the next one", () => {
        open();
        expect(front()).toBe("eins");

        choose("Back first");

        expect(flipped()).toBe(true); // the card in front of the reader answered
        expect(back()).toBe("one");
        expect(chose()).toContain("Back first");
      });

      it("deals every card after it back first too", () => {
        open();
        choose("Back first");
        menu().click(); // out of the way

        press("ArrowRight");
        expect(flipped()).toBe(true);
        expect(back()).toBe("two");

        press("ArrowLeft");
        expect(flipped()).toBe(true);
      });

      /* A tap still turns the card over — "back first" says which side it
         arrives on, not that the other one is gone. */
      it("leaves the tap meaning what it always meant", () => {
        open();
        choose("Back first");
        menu().click();

        press(" ");
        expect(flipped()).toBe(false);
        expect(front()).toBe("eins");
      });

      it("remembers the choice past the page", () => {
        open();
        choose("Back first");

        expect(JSON.parse(localStorage.getItem(SIDE_KEY))).toEqual({ side: "back" });
      });

      it("opens on the side the reader last asked for", () => {
        localStorage.setItem(SIDE_KEY, JSON.stringify({ side: "back" }));
        open();

        expect(flipped()).toBe(true);
        expect(chose()).toContain("Back first");
      });

      it("shows the front where the record is unusable, rather than nothing at all", () => {
        localStorage.setItem(SIDE_KEY, "{ not json");
        open();

        expect(flipped()).toBe(false);
        expect(chose()).toContain("Front first");
      });

      it("shows the front for a side nobody has heard of", () => {
        localStorage.setItem(SIDE_KEY, JSON.stringify({ side: "sideways" }));
        open();

        expect(chose()).toContain("Front first");
      });

      /* `random` is a coin per card, tossed with the deck's own injectable
         source — which is what lets a test say which way it lands. */
      it("tosses a coin per card when the reader asks it to", () => {
        const flips = [];
        const coin = () => 0.999; /* leaves the shuffle alone; lands on the front */

        open(cards, { random: coin });
        choose("Random side");
        menu().click();

        for (let i = 0; i < 3; i++) {
          flips.push(flipped());
          press("ArrowRight");
        }

        expect(flips).toEqual([false, false, false]);
      });

      it("lands on the back when the coin says so", () => {
        open(cards, { random: () => 0.1 });
        choose("Random side");

        expect(flipped()).toBe(true);
      });

      it("names the three sides in the reader's language", () => {
        open(cards, { lang: "de" });

        expect(groups()[0]).toEqual(["Vorderseite zuerst", "Rückseite zuerst", "Zufällige Seite"]);
      });

      /* Choosing the row the mark is already on is not a change, and must not
         be treated as one — a re-roll the reader did not ask for included. */
      it("does nothing when the reader chooses the side they are already on", () => {
        localStorage.setItem(SIDE_KEY, JSON.stringify({ side: "back" }));
        open();

        choose("Back first");
        expect(flipped()).toBe(true);
        expect(chose()).toContain("Back first");
      });
    });

    /* Which cards (V2-13.9), now a row rather than a corner: the deck's own,
       or the whole dictionary, switched in place. */
    describe("which cards", () => {
      /* Offered from the first visit, even to the only deck a reader has ever
         opened, where "everything you have seen" is this deck and the two
         sides pick the same cards. The row says which pool they are on, and
         that is worth saying whether or not the other one differs today
         (V2-16.3). */
      it("offers the choice even where both sides hold the same cards", () => {
        document.title = "Everyday German";
        open();

        expect(groups()[1]).toEqual(["Everyday German", "Everything you have seen"]);
        expect(chose()).toContain("Everyday German");

        choose("Everything you have seen");
        expect(chose()).toContain("Everything you have seen");
        expect(["eins", "zwei", "drei"]).toContain(front()); // this deck's own cards, out of the dictionary
      });

      /* The one thing that does take it away, and it is not about the
         schedule: `switchTo` refuses an empty source (V2-13.8), so a
         dictionary with nothing in it is a row that could not act even in
         principle. Unusable storage is the only way to get one on a deck that
         brought cards. */
      it("is not offered where the dictionary cannot be read at all", () => {
        const blocked = {
          getItem: () => null,
          setItem: () => {
            throw new Error("nope");
          },
          removeItem: () => {},
        };

        open(cards, { storage: blocked });
        expect(groups()).toHaveLength(2); // the sides and the schedule; no pool
      });

      it("offers the dictionary once it holds a card this deck does not", () => {
        document.title = "Everyday German";
        extra();
        open();

        expect(groups()[1]).toEqual(["Everyday German", "Everything you have seen"]);
        expect(chose()).toContain("Everyday German");
      });

      it("calls this deck 'this deck' where the page has no title of its own", () => {
        document.title = "";
        extra();
        open();

        expect(groups()[1]).toEqual(["This deck", "Everything you have seen"]);
      });

      it("names the dictionary in the reader's language, given one", () => {
        document.title = "";
        extra();
        open(cards, { lang: "de" });

        expect(groups()[1]).toEqual(["Dieser Stapel", "Alles, was du gesehen hast"]);
      });

      it("switches in place, no navigation, and back again", () => {
        document.title = "Everyday German";
        extra();
        open();

        expect(front()).toBe("eins");

        choose("Everything you have seen");
        expect(front()).toBe("vier"); // the dictionary's own card, not this deck's
        expect(chose()).toContain("Everything you have seen");

        choose("Everyday German");
        expect(front()).toBe("eins");
      });

      it("returns to the same card on each side, not a fresh shuffle", () => {
        document.title = "Everyday German";
        extra();
        open();

        press("ArrowRight"); // card b
        choose("Everything you have seen");
        menu().click();
        press("ArrowRight"); // its second card, whichever that is
        const inDictionary = front();

        choose("Everyday German");
        expect(front()).toBe("zwei"); // exactly where paging left it

        choose("Everything you have seen");
        expect(front()).toBe(inDictionary);
      });

      /* jsdom has no Web Animations API, so a page turn is instant everywhere
         else in this file — stubbing `animate` to hang open is what makes a
         tap "mid-slide" reachable at all. */
      it("does not move its mark when a tap mid-slide is refused", () => {
        Element.prototype.animate = () => ({ finished: new Promise(() => {}) });

        try {
          document.title = "Everyday German";
          extra();
          open();

          press("ArrowRight"); // card b, still sliding in
          choose("Everything you have seen"); // refused: the switch never landed

          expect(chose()).toContain("Everyday German");
        } finally {
          delete Element.prototype.animate;
        }
      });

      /* A reader learning English and French wants two dictionaries, not one
         that mixes both (V2-13.7). */
      describe("scoped to a dictionary", () => {
        it("stamps its own cards with the dictionary it was opened for", () => {
          open(cards, { dictionary: "french" });

          const stored = JSON.parse(localStorage.getItem(CARDS_KEY));
          expect(stored.a.dictionary).toBe("french");
        });

        it("reaches this deck's own dictionary, not a card in another one", () => {
          extra(); // dictionary-less, so not this deck's dictionary at all
          open(cards, { dictionary: "french" });

          choose("Everything you have seen");
          menu().click();

          const seen = new Set([front()]);
          for (let i = 0; i < 5; i++) {
            press("ArrowRight");
            seen.add(front());
          }

          expect(seen).toEqual(new Set(["eins", "zwei", "drei"])); // never "vier"
        });

        it("leads only to cards in the same dictionary, not the whole dictionary", () => {
          localStorage.setItem(
            CARDS_KEY,
            JSON.stringify({
              z: { key: "z", frontText: "vier", backText: "four", dictionary: "french" },
              y: { key: "y", frontText: "unrelated", backText: "unrelated", dictionary: "german" },
            }),
          );
          open(cards, { dictionary: "french" });

          choose("Everything you have seen");
          menu().click();

          const seen = new Set([front()]);
          for (let i = 0; i < 5; i++) {
            press("ArrowRight");
            seen.add(front());
          }

          /* The deck's own cards are french too, so the dictionary side is all
             four of them — "unrelated" (german) is the one word that must
             never come up, however far this pages around. */
          expect(seen).toEqual(new Set(["vier", "eins", "zwei", "drei"]));
        });
      });

      /* Nothing about this page changes what the dictionary leads back to —
         only a page with no cards of its own is ever somewhere to leave. */
      it("does not record this page as somewhere to come back to", () => {
        document.title = "";
        open();
        expect(lastDeck(localStorage)).toBe(null);
      });
    });

    /* How many of them (V2-13.13): what the schedule says is due, or every
       card in the same pool regardless of its stars. */
    describe("how many of them", () => {
      /* Every card in a deck nobody has graded is due, so "Every card" selects
         exactly what "Due today" does — and the row is there all the same
         (V2-16.3). It is the row the reader wants the morning after, and a
         menu that grows one overnight is a menu they have to re-read. */
      it("is offered before anything has been graded, when both sides agree", () => {
        open();

        expect(groups().at(-1)).toEqual(["Due today", "Every card"]);
        expect(chose()).toContain("Due today");

        choose("Every card");
        expect(chose()).toContain("Every card");
        expect(["eins", "zwei", "drei"]).toContain(front()); // the same three cards, still there
      });

      it("appears once the schedule is holding a card back", () => {
        localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 3, dueAt: Date.now() + 30 * DAY } }));
        open();

        expect(groups().at(-1)).toEqual(["Due today", "Every card"]);
        expect(chose()).toContain("Due today");
      });

      it("shows every card in the deck, stars and all", () => {
        localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 5, dueAt: Date.now() + 30 * DAY } }));
        open();

        expect(front()).toBe("zwei"); // only b and c are due
        press("ArrowRight");
        press("ArrowRight");
        expect(front()).toBe("zwei"); // two cards, wrapping: a is nowhere in this session

        choose("Every card");
        expect(chose()).toContain("Every card");
        menu().click();

        /* Every card, in due order still, so the one furthest from due comes
           last rather than first — a filter, not a reordering. */
        press("ArrowRight");
        press("ArrowRight");
        expect(front()).toBe("eins");
        expect(filled()).toBe(5); // wearing every star it earned
      });

      it("names its two sides in the reader's language", () => {
        scheduleAll(30);
        open(cards, { lang: "de" });

        expect(groups().at(-1)).toEqual(["Heute dran", "Alle Karten"]);
      });

      /* The one place a reader most wants it, which is why the done card's own
         back names the menu. */
      it("is there on the done card, and studies the deck anyway", () => {
        scheduleAll(30);
        open();
        expect(front()).toBe("Nothing to repeat today");

        choose("Every card");
        expect(front()).toBe("eins");

        choose("Due today");
        expect(front()).toBe("Nothing to repeat today"); // and back to being done
      });

      it("returns to the card the filtered session was left on", () => {
        localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 3, dueAt: Date.now() + 30 * DAY } }));
        open();

        choose("Every card"); // a, b, c
        menu().click();
        press("ArrowRight");
        const left = front();

        choose("Due today");
        choose("Every card");

        expect(front()).toBe(left);
      });

      /* The same rule over the other pool: the two questions are two
         questions, and neither answers the other's. */
      it("filters the dictionary as well as a deck", () => {
        localStorage.setItem(
          CARDS_KEY,
          JSON.stringify({ z: { key: "z", frontText: "vier", backText: "four" }, y: { key: "y", frontText: "fünf", backText: "five" } }),
        );
        localStorage.setItem(REVIEW_KEY, JSON.stringify({ z: { box: 3, dueAt: Date.now() + 30 * DAY } }));

        open([]);
        expect(front()).toBe("fünf"); // only y is due
        press("ArrowRight");
        expect(front()).toBe("fünf"); // and it wraps to itself

        choose("Every card");
        menu().click();
        press("ArrowRight");
        expect(front()).toBe("vier"); // the card the dictionary's own schedule was holding back
      });

      it("stays on once the reader switches pools", () => {
        document.title = "Everyday German";
        localStorage.setItem(CARDS_KEY, JSON.stringify({ z: { key: "z", frontText: "vier", backText: "four" } }));
        localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 3, dueAt: Date.now() + 30 * DAY } }));
        open();

        choose("Every card");
        choose("Everything you have seen"); // still showing everything

        expect(chose()).toContain("Every card");
        expect(document.querySelectorAll(".fc-slide")).toHaveLength(1);
      });

      /* The rows do not come and go as the reader moves between pools, however
         differently the schedule treats the two. */
      it("stays put across a pool the schedule is holding nothing back from", () => {
        document.title = "Everyday German";
        localStorage.setItem(
          CARDS_KEY,
          JSON.stringify({ z: { key: "z", frontText: "vier", backText: "four" }, ...Object.fromEntries(cards.map((c) => [c.key, c])) }),
        );
        localStorage.setItem(REVIEW_KEY, JSON.stringify({ z: { box: 3, dueAt: Date.now() + 30 * DAY } }));

        open();
        expect(groups()).toHaveLength(3); // this deck is all due, and the rows are still here

        choose("Everything you have seen"); // the dictionary, which is holding z back
        expect(groups()).toHaveLength(3);

        choose("Every card");
        choose("Everyday German"); // back to the deck, where it changes nothing
        expect(groups()).toHaveLength(3);
        expect(chose()).toContain("Every card"); // and it is still on
      });

      it("does not move its mark when a tap mid-slide is refused", () => {
        Element.prototype.animate = () => ({ finished: new Promise(() => {}) });

        try {
          localStorage.setItem(REVIEW_KEY, JSON.stringify({ a: { box: 3, dueAt: Date.now() + 30 * DAY } }));
          open();

          press("ArrowRight"); // still sliding
          choose("Every card"); // refused: the switch never landed

          expect(chose()).toContain("Due today");
        } finally {
          delete Element.prototype.animate;
        }
      });
    });

    describe("the way back, from a page with no cards of its own", () => {
      /* Which deck "back" means is not fixed once there is more than one, so
         a deck records itself and a card-less page reads that. */
      it("remembers the deck the reader opened, so a card-less page can lead back to it", () => {
        document.title = "Numbers and Time";
        open();

        expect(lastDeck(localStorage)).toEqual({ href: "/", label: "Numbers and Time" });
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

      it("shows no link at all where the record it would read is unusable", () => {
        extra();
        localStorage.setItem(DECK_KEY, "{ not json");
        open([]);

        expect(corner()).toBe(null);
        expect(menu()).not.toBe(null); // the menu is still there; it always is
      });

      it("is a real link back to the deck the reader came from", () => {
        document.title = "Everyday German";
        open();
        mounted.splice(0).forEach((deck) => deck.destroy());
        document.body.replaceChildren();

        document.title = "Everything you have seen";
        extra();
        open([]);

        expect(corner().tagName).toBe("A");
        expect(corner().getAttribute("href")).toBe("/");
        expect(corner().getAttribute("aria-label")).toBe("Everyday German");
        expect(corner().querySelectorAll("rect")).toHaveLength(1);
        expect(document.querySelector(".fc-chrome").contains(corner())).toBe(true);
      });

      /* A deck switches pools from the menu and has nowhere to navigate to. */
      it("is never drawn on a deck with cards of its own", () => {
        document.title = "Everyday German";
        open();
        mounted.splice(0).forEach((deck) => deck.destroy());
        document.body.replaceChildren();

        extra();
        open();
        expect(corner()).toBe(null);
      });
    });
  });
});

/** review.js stamps the reader's own calendar day; mirror it for the fixture. */
function today(now = Date.now()) {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
