import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "./store.js";
import { mount } from "./flashcards.js";

/* jsdom has no Web Animations API, so slides swap instantly here and every
   assertion below can stay synchronous. */

const cards = [
  { key: "a", frontText: "eins", frontDetails: "one", backText: "one", category: "number" },
  { key: "b", frontText: "zwei", backText: "two" },
  { key: "c", frontText: "drei", backText: "three" },
];

/** Random that leaves the order alone, so "next" means the next card written above. */
const unshuffled = () => 0.999;

/* Keys are bound to the document, so the deck answers them wherever they land
   and there is no focus to establish first. */
function press(key, target = document) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

/* jsdom has no PointerEvent; the handlers only read clientX/clientY/pointerId. */
const pointer = (type, x, y) =>
  document.querySelector(".fc").dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));

/** A gesture, in the three events a real one arrives as. */
function drag(dx, dy, { release = true } = {}) {
  pointer("pointerdown", 200, 200);
  pointer("pointermove", 200 + dx, 200 + dy);
  if (release) pointer("pointerup", 200 + dx, 200 + dy);
}

const slider = () => document.querySelector(".fc-slide");
const edge = (side) => document.querySelector(".fc-card").style.getPropertyValue(`--fc-mark-${side}`);

const front = (selector) => document.querySelector(`.fc-front ${selector}`);
const back = (selector) => document.querySelector(`.fc-back ${selector}`);
const isFlipped = () => document.querySelector(".fc-card").classList.contains("is-flipped");

const mounted = [];

function track(deck) {
  mounted.push(deck);
  return deck;
}

function open(options = {}) {
  return track(mount(document.body, cards, { storage: localStorage, random: unshuffled, ...options }));
}

describe("mount", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    /* Document-level keys mean a deck left mounted would go on answering them
       in the next test. */
    for (const deck of mounted.splice(0)) deck.destroy();
    document.body.replaceChildren();
  });

  it("refuses an empty deck", () => {
    expect(() => mount(document.body, [])).toThrow(/at least one card/);
  });

  it("shows both faces of the first card and hides the lines it has no content for", () => {
    open();

    expect(front(".fc-text").textContent).toBe("eins");
    expect(front(".fc-details").textContent).toBe("one");
    expect(back(".fc-text").textContent).toBe("one");
    expect(back(".fc-details").hidden).toBe(true);
    expect(front(".fc-category").textContent).toBe("number");
  });

  it("renders card content as text, never as markup", () => {
    track(mount(document.body, [{ key: "x", frontText: "<b>bold</b>", backText: "b" }], { random: unshuffled }));

    expect(front(".fc-text").textContent).toBe("<b>bold</b>");
    expect(front(".fc-text").children.length).toBe(0);
  });

  it("flips on a click and back again", () => {
    open();
    const card = document.querySelector(".fc-card");

    card.dispatchEvent(new MouseEvent("pointerdown", { clientX: 5, clientY: 5, bubbles: true }));
    card.dispatchEvent(new MouseEvent("pointerup", { clientX: 6, clientY: 5, bubbles: true }));
    expect(isFlipped()).toBe(true);

    card.dispatchEvent(new MouseEvent("pointerdown", { clientX: 5, clientY: 5, bubbles: true }));
    card.dispatchEvent(new MouseEvent("pointerup", { clientX: 6, clientY: 5, bubbles: true }));
    expect(isFlipped()).toBe(false);
  });

  it("pages forward and backward, wrapping at both ends", () => {
    open();

    press("ArrowRight");
    expect(front(".fc-text").textContent).toBe("zwei");

    press("ArrowLeft");
    press("ArrowLeft");
    expect(front(".fc-text").textContent).toBe("drei");

    press("ArrowRight");
    expect(front(".fc-text").textContent).toBe("eins");
  });

  it("faces the front again after paging away from a flipped card", () => {
    open();

    press(" ");
    expect(isFlipped()).toBe(true);

    press("ArrowRight");
    expect(isFlipped()).toBe(false);
  });

  /* Both faces sit in the DOM at once — backface-visibility turns one away,
     not removal — so without aria-hidden a screen reader reads both faces'
     text together regardless of which way the card is turned. */
  describe("hides whichever face is not showing from assistive tech", () => {
    it("hides the back to start with, showing only the front", () => {
      open();

      expect(document.querySelector(".fc-front").getAttribute("aria-hidden")).toBe("false");
      expect(document.querySelector(".fc-back").getAttribute("aria-hidden")).toBe("true");
    });

    it("swaps which face is hidden on a flip", () => {
      open();

      press(" ");
      expect(document.querySelector(".fc-front").getAttribute("aria-hidden")).toBe("true");
      expect(document.querySelector(".fc-back").getAttribute("aria-hidden")).toBe("false");

      press(" ");
      expect(document.querySelector(".fc-front").getAttribute("aria-hidden")).toBe("false");
      expect(document.querySelector(".fc-back").getAttribute("aria-hidden")).toBe("true");
    });

    it("hides the back again once a page turn faces the front, even from a flipped card", () => {
      open();

      press(" ");
      press("ArrowRight");

      expect(document.querySelector(".fc-front").getAttribute("aria-hidden")).toBe("false");
      expect(document.querySelector(".fc-back").getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("grades the card in front of the reader and stays on it", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowUp");

    expect(front(".fc-text").textContent).toBe("eins");
    expect(graded).toEqual([["a", "easier"]]);
  });

  it("counts a grade once however many times it is repeated", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push(level) });

    press("ArrowDown");
    press("ArrowDown");
    press("ArrowDown");

    expect(graded).toEqual(["harder"]);
  });

  it("counts a change of mind, and counts changing back", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push(level) });

    press("ArrowDown");
    press("ArrowDown");
    press("ArrowUp");
    press("ArrowUp");
    press("ArrowDown");

    expect(graded).toEqual(["harder", "easier", "harder"]);
  });

  it("starts the next card ungraded, so the same grade counts again", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowDown");
    press("ArrowRight");
    press("ArrowDown");

    expect(graded).toEqual([
      ["a", "harder"],
      ["b", "harder"],
    ]);
  });

  it("reports an ungraded card as neutral when the reader pages past it", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowRight"); // card a, never graded
    press("ArrowLeft"); // card b, never graded, either direction counts

    expect(graded).toEqual([
      ["a", "neutral"],
      ["b", "neutral"],
    ]);
  });

  it("does not also report a graded card as neutral when the reader pages past it", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowDown"); // grades card a
    press("ArrowRight");

    expect(graded).toEqual([["a", "harder"]]);
  });

  it("does not report the card on screen as neutral just because the deck is destroyed", () => {
    const graded = [];
    const deck = open({ onGrade: (card, level) => graded.push([card.key, level]) });

    deck.destroy();

    expect(graded).toEqual([]);
  });

  it("draws no progress row by default", () => {
    open();

    expect(document.querySelector(".fc-progress")).toBe(null);
  });

  it("keeps the progress row out of the element that flips, so it never rotates or mirrors", () => {
    open({ progress: { steps: 5, of: () => 3 } });

    const progress = document.querySelector(".fc-progress");
    const card = document.querySelector(".fc-card");

    expect(card.contains(progress)).toBe(false);
    expect(progress.parentElement).toBe(card.parentElement); /* siblings under .fc-slide */
  });

  it("draws a progress row of the given size, filled from the host's data", () => {
    open({ progress: { steps: 5, of: () => 3 } });

    const dots = document.querySelectorAll(".fc-dot");
    expect(dots).toHaveLength(5);
    expect([...dots].filter((d) => d.classList.contains("is-filled"))).toHaveLength(3);
  });

  it("clamps an out-of-range level into the drawable dots", () => {
    open({ progress: { steps: 3, of: () => 99 } });
    expect(document.querySelectorAll(".fc-dot.is-filled")).toHaveLength(3);

    document.body.replaceChildren();
    open({ progress: { steps: 3, of: () => -5 } });
    expect(document.querySelectorAll(".fc-dot.is-filled")).toHaveLength(0);
  });

  it("re-reads progress for the card that is actually on screen after paging", () => {
    const levels = { a: 1, b: 4, c: 2 };
    open({ progress: { steps: 5, of: (card) => levels[card.key] } });

    expect(document.querySelectorAll(".fc-dot.is-filled")).toHaveLength(1);

    press("ArrowRight");
    expect(document.querySelectorAll(".fc-dot.is-filled")).toHaveLength(4);

    press("ArrowRight");
    expect(document.querySelectorAll(".fc-dot.is-filled")).toHaveLength(2);
  });

  it("re-reads progress while the card is off screen, not once the slide has delivered it", async () => {
    /* jsdom has no Web Animations API, so the slide everywhere else in this
       file is instant and says nothing about ordering. A card arriving with a
       different count from the one that left used to land and *then* have its
       marks change, a fifth of a second later, which read as the page turn
       itself having regraded the card. */
    const events = [];
    Element.prototype.animate = () => {
      events.push("animate");
      return { finished: Promise.resolve() };
    };

    try {
      const slider = () => document.querySelector(".fc-slide").className;
      open({
        progress: {
          steps: 5,
          of: (card) => {
            events.push(`read ${card.key} (${slider()})`);
            return 1;
          },
        },
      });

      events.length = 0;
      press("ArrowRight");
      await new Promise((resolve) => setTimeout(resolve, 0));

      /* Between the two legs, and with transitions suspended, so the mark and
         the marks are already right when the card is seen again. */
      expect(events).toEqual(["animate", "read b (fc-slide fc-instant)", "animate"]);
    } finally {
      delete Element.prototype.animate;
    }
  });

  it("re-reads progress immediately after a grade, since onGrade already ran", () => {
    const levels = { a: 0 };
    open({
      onGrade: (card) => {
        levels[card.key] += 1;
      },
      progress: { steps: 5, of: (card) => levels[card.key] },
    });

    expect(document.querySelectorAll(".fc-dot.is-filled")).toHaveLength(0);

    press("ArrowUp");
    expect(document.querySelectorAll(".fc-dot.is-filled")).toHaveLength(1);
  });

  it("marks the card on the edge the gesture went towards, and shows no mark on an ungraded card paged to", () => {
    open();
    const card = () => document.querySelector(".fc-card").className;

    press("ArrowDown");
    expect(card()).toContain("is-harder");

    press("ArrowUp");
    expect(card()).toContain("is-easier");
    expect(card()).not.toContain("is-harder");

    press("ArrowRight"); // card b, never graded
    expect(card()).not.toContain("is-easier");
  });

  it("counts a change of mind only while the card is still in front of the reader", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push(level) });

    press("ArrowDown");
    press("ArrowUp"); // still on the card: a change of mind, and it counts
    press("ArrowRight"); // leaving card a settles it at easier
    press("ArrowLeft"); // back to card a

    press("ArrowDown"); // too late: card a settled at easier when it was left
    press("ArrowUp");
    press("ArrowDown");

    expect(graded).toEqual(["harder", "easier", "neutral"]); /* the neutral is card b */
  });

  it("keeps a card's grade once the reader has left it: the mark returns and further grades are dropped", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });
    const card = () => document.querySelector(".fc-card").className;

    press("ArrowUp"); // card a: easier
    press("ArrowRight"); // to card b, ungraded — and card a is settled
    press("ArrowLeft"); // back to card a

    expect(front(".fc-text").textContent).toBe("eins");
    expect(card()).toContain("is-easier");

    press("ArrowUp"); // the same grade again: nothing new to say
    press("ArrowDown"); // and a change of mind now comes too late

    expect(card()).toContain("is-easier");
    expect(card()).not.toContain("is-harder");
    expect(graded).toEqual([
      ["a", "easier"],
      ["b", "neutral"],
    ]);
  });

  it("shows the mark of a card the host says is already graded, and lets no one change it", () => {
    const graded = [];
    open({
      gradeOf: (card) => (card.key === "b" ? "harder" : null),
      onGrade: (card, level) => graded.push([card.key, level]),
    });
    const card = () => document.querySelector(".fc-card").className;

    expect(card()).not.toContain("is-harder"); // card a: the host has nothing to say about it

    press("ArrowRight"); // to card b, graded before this deck was mounted
    expect(card()).toContain("is-harder");

    press("ArrowUp");
    expect(card()).toContain("is-harder");

    press("ArrowRight"); // and it does not report as neutral, either
    expect(graded).toEqual([["a", "neutral"]]);
  });

  it("does not report a card as neutral on a revisit if it was graded in an earlier visit", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowUp"); // card a: easier
    press("ArrowRight"); // to card b
    press("ArrowRight"); // to card c
    press("ArrowLeft"); // back to card b
    press("ArrowLeft"); // back to card a, already graded
    press("ArrowRight"); // leave card a again

    expect(graded).toEqual([
      ["a", "easier"],
      ["b", "neutral"], // b still ungraded on this pass
      ["c", "neutral"],
      ["b", "neutral"], // and still ungraded on this pass too
      // no further "a" entry: it still carries the grade from before
    ]);
  });

  /* A settled card is the one interaction with no visible result: the gesture
     is dropped and the screen is exactly as it was, which is what a reader who
     has not discovered the swipe also sees. The host is told, so it can say so
     (deck.js does); the library only reports that it happened. */
  it("reports a grading gesture refused because the card is settled", () => {
    const refused = [];
    open({ onRefuse: (card, reason) => refused.push([card.key, reason]) });

    press("ArrowUp"); // card a: easier, and it counts
    press("ArrowRight"); // leaving settles it
    press("ArrowLeft"); // back to card a

    press("ArrowDown");
    press("ArrowUp");

    expect(refused).toEqual([
      ["a", "settled"],
      ["a", "settled"],
    ]);
  });

  it("reports a card the host handed over already graded as settled too", () => {
    const refused = [];
    open({ gradeOf: () => "harder", onRefuse: (card, reason) => refused.push([card.key, reason]) });

    press("ArrowUp");
    expect(refused).toEqual([["a", "settled"]]);
  });

  /* Repeating the grade a card already carries is a different silence: the
     mark on the card is already the answer to what the reader just asked for,
     so there is nothing left unsaid and nothing to report. */
  it("does not report a repeated grade as a refusal", () => {
    const refused = [];
    open({ onRefuse: (card, reason) => refused.push([card.key, reason]) });

    press("ArrowUp");
    press("ArrowUp");
    press("ArrowUp");

    expect(refused).toEqual([]);
  });

  it("refuses a settled card without an onRefuse callback", () => {
    open({ gradeOf: () => "easier" });

    expect(() => press("ArrowDown")).not.toThrow();
    expect(document.querySelector(".fc-card").className).toContain("is-easier");
  });

  /* `switchTo` is what deck.js's deck ↔ dictionary toggle (V2-13.9) is built
     on: the same element, view and input bindings throughout, only the cards
     underneath changing. */
  describe("switchTo", () => {
    const other = [
      { key: "x", frontText: "vier", backText: "four" },
      { key: "y", frontText: "fünf", backText: "five" },
    ];

    it("shows the other source's first card in place, with no page turn", () => {
      open();

      const deck = mounted.at(-1);
      deck.switchTo(other);

      expect(front(".fc-text").textContent).toBe("vier");
    });

    it("returns to the same card on a source revisited, rather than a fresh shuffle", () => {
      open();

      const deck = mounted.at(-1);
      press("ArrowRight"); // card b

      deck.switchTo(other);
      press("ArrowRight"); // card y

      deck.switchTo(cards);
      expect(front(".fc-text").textContent).toBe("zwei"); // exactly where paging left it

      deck.switchTo(other);
      expect(front(".fc-text").textContent).toBe("fünf");
    });

    it("faces the front again, as a page turn does, even on a card left flipped", () => {
      open();
      press(" "); // flip card a

      mounted.at(-1).switchTo(other);
      expect(isFlipped()).toBe(false);
    });

    it("reports the card it leaves behind, exactly as paging past it would", () => {
      const graded = [];
      open({ onGrade: (card, level) => graded.push([card.key, level]) });

      mounted.at(-1).switchTo(other);
      expect(graded).toEqual([["a", "neutral"]]);
    });

    it("does not report a card it leaves already graded", () => {
      const graded = [];
      open({ onGrade: (card, level) => graded.push([card.key, level]) });

      press("ArrowUp"); // card a: easier
      mounted.at(-1).switchTo(other);

      expect(graded).toEqual([["a", "easier"]]);
    });

    it("re-reads progress for whichever card the switch actually lands on", () => {
      open({ progress: { steps: 5, of: (card) => (card.key === "x" ? 3 : 0) } });

      mounted.at(-1).switchTo(other);

      expect(document.querySelectorAll(".fc-dot.is-filled")).toHaveLength(3);
    });

    /* jsdom has no Web Animations API, so a page turn is instant everywhere
       else in this file and there is no window in which "mid-slide" exists to
       test. Stubbing `animate` to return an unresolved promise, as the
       progress-ordering test above does, opens one. */
    it("is dropped mid-slide, the same as an intent arriving then, and reports as much", () => {
      Element.prototype.animate = () => ({ finished: new Promise(() => {}) });

      try {
        open();
        const deck = mounted.at(-1);

        press("ArrowRight"); // card b, still sliding in
        expect(deck.switchTo(other)).toBe(false);

        expect(front(".fc-text").textContent).toBe("eins"); // the switch never landed
      } finally {
        delete Element.prototype.animate;
      }
    });

    /* A host drawing its own state around a switch (deck.js's toggle icon)
       needs to know when a call did not land, and a source with no cards is
       the other way one can fail besides mid-slide — refused for the same
       reason mount() itself refuses one (V2-3.6), rather than leaving the
       deck showing a card that belongs to neither source. */
    it("refuses a source with no cards, leaving the deck exactly as it was", () => {
      open();
      press("ArrowRight"); // card b

      expect(mounted.at(-1).switchTo([])).toBe(false);
      expect(front(".fc-text").textContent).toBe("zwei");
    });

    it("reports true once a switch actually lands", () => {
      open();
      expect(mounted.at(-1).switchTo(other)).toBe(true);
    });
  });

  /* The card answers a gesture while it is being made, which is the only thing
     on a chrome-less card that can say the gesture exists at all. */
  describe("a gesture in progress", () => {
    it("fills the edge it is being dragged towards, in proportion", () => {
      open();

      drag(0, -20, { release: false }); /* half of the 40px threshold */
      expect(Number(edge("top"))).toBeCloseTo(0.5);
      expect(edge("bottom")).toBe("0");

      drag(0, 60, { release: false }); /* past it, the other way */
      expect(Number(edge("bottom"))).toBe(1);
    });

    it("gives the card a little against a vertical drag, and moves it with a horizontal one", () => {
      open();

      drag(0, -100, { release: false });
      expect(slider().style.transform).toBe("translate(0, -22px)"); /* resistance, not travel */

      drag(-100, 0, { release: false });
      expect(slider().style.transform).toBe("translate(-100px, 0)"); /* on its way out */
    });

    it("puts the card back when the drag comes to nothing", () => {
      open();

      drag(0, -20); /* under the threshold: a tap, so no grade */
      expect(slider().style.transform).toBe("");
      expect(edge("top")).toBe("");
    });

    /* A drag fills an edge; it never empties one. Dragging up on a card that is
       already marked easier must not shrink that mark on the way to redrawing
       it. */
    it("never draws less mark than the card already carries", () => {
      open({ gradeOf: () => "easier" });

      drag(0, -8, { release: false });
      expect(Number(edge("top"))).toBe(1);
    });

    it("leaves the card alone while a page turn is in flight", () => {
      const deck = open();
      deck.say("busy"); /* something to notice if the drag reached the card */

      drag(0, -20, { release: false });
      expect(edge("top")).not.toBe("");
    });
  });

  /* A refused grade has no visible result of its own, so the card says why —
     on the mark itself, which is what the reader was arguing with. */
  describe("say", () => {
    it("puts the words on the card", () => {
      const deck = open();

      deck.say("Already rated today");
      expect(document.querySelector(".fc-front").getAttribute("data-message")).toBe("Already rated today");
    });

    it("takes them off again after a moment", () => {
      vi.useFakeTimers();

      try {
        const deck = open();
        deck.say("Already rated today");

        vi.advanceTimersByTime(5000);
        expect(document.querySelector(".fc-front").getAttribute("data-message")).toBe(null);
      } finally {
        vi.useRealTimers();
      }
    });

    it("stops saying it as soon as another card is on screen", () => {
      const deck = open();

      deck.say("Already rated today");
      press("ArrowRight");

      expect(document.querySelector(".fc-front").getAttribute("data-message")).toBe(null);
    });
  });

  it("grades without an onGrade callback", () => {
    open();

    expect(() => press("ArrowDown")).not.toThrow();
    expect(front(".fc-text").textContent).toBe("eins");
  });

  it("records every card of the deck in local storage", () => {
    open();

    expect(Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY)))).toEqual(["a", "b", "c"]);
  });

  it("shows the stored copy of a card it has seen before", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: { key: "a", frontText: "stored", backText: "one" } }));
    open();

    expect(front(".fc-text").textContent).toBe("stored");
  });

  it("leaves the keyboard alone while the reader is typing", () => {
    const input = document.createElement("input");
    document.body.append(input);
    open();

    press("ArrowRight", input);

    expect(front(".fc-text").textContent).toBe("eins");
  });

  it("removes the deck and stops listening on destroy", () => {
    const graded = [];
    const deck = open({ onGrade: (card, level) => graded.push([card.key, level]) });

    deck.destroy();
    press("ArrowDown");

    expect(document.querySelector(".fc")).toBe(null);
    expect(graded).toEqual([]);
  });
});
