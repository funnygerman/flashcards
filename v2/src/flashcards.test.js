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

/** The grade band: which edge it is on, and the word it holds. */
const bandEdge = () => document.querySelector(".fc-card").getAttribute("data-grade-edge");
const bandWord = () => document.querySelector(".fc-front").getAttribute("data-grade");
const LABELS = { easier: "Knew it", harder: "Didn't know it" };

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

  it("grades the card and takes it away, delivering the next one", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowUp");

    expect(front(".fc-text").textContent).toBe("zwei");
    expect(graded).toEqual([["a", "easier"]]);
  });

  /* The reader agreeing with a mark they can see is not an error: the host
     hears about the grade once (V2-5.4), and the card leaves either way,
     because a gesture with no result at all is the one thing this interface
     cannot afford (V2-15.1). */
  it("counts a grade once however many times it is repeated, and moves on each time", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push(level) });

    press("ArrowDown"); // card a: harder
    press("ArrowLeft"); // back to card a, still marked harder — card b merely seen
    press("ArrowDown"); // the same grade again: nothing new to say

    expect(front(".fc-text").textContent).toBe("zwei"); // but the card still leaves
    expect(graded).toEqual(["harder", "neutral"]);
  });

  it("counts a change of mind, and counts changing back", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push(level) });

    press("ArrowDown"); // card a: harder
    press("ArrowLeft"); // back to card a, card b reported as merely seen
    press("ArrowUp"); // a change of mind, and it counts
    press("ArrowLeft"); // back to card a again, and card b seen again
    press("ArrowDown"); // and changing back counts too

    expect(graded).toEqual(["harder", "neutral", "easier", "neutral", "harder"]);
  });

  it("starts the next card ungraded, so the same grade counts again", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowDown");
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

  /* The grade is recorded before the card is let go of, so the card that has
     just been graded is never also reported as one paged past ungraded. */
  it("does not also report a graded card as neutral when its grade takes it away", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowDown"); // grades card a, which leaves on its own

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

  /* The graded card's own row is redrawn before it leaves, which is the whole
     of what the hold before the exit is for (V2-8.10): it is the one moment a
     reader sees a star fill as a consequence of their own verdict. jsdom has no
     Web Animations API, so the hold is instant here and only the order of the
     reads can be seen — the arriving card's row is read second, in the
     off-screen frame (V2-8.6). */
  it("re-reads progress for the graded card before the next one arrives, since onGrade already ran", () => {
    const levels = { a: 0, b: 0 };
    const reads = [];
    open({
      onGrade: (card) => {
        levels[card.key] += 1;
      },
      progress: {
        steps: 5,
        of: (card) => {
          reads.push(`${card.key}:${levels[card.key]}`);
          return levels[card.key];
        },
      },
    });

    reads.length = 0; /* the read that drew the first card, before any gesture */
    press("ArrowUp");

    expect(reads).toEqual(["a:1", "b:0"]);
    expect(document.querySelectorAll(".fc-dot.is-filled")).toHaveLength(0); /* card b's row now */
  });

  it("marks the card on the edge the gesture went towards, and shows no mark on an ungraded card paged to", () => {
    open();
    const card = () => document.querySelector(".fc-card").className;

    press("ArrowDown");
    press("ArrowLeft"); // back to card a, wearing what it was given
    expect(card()).toContain("is-harder");

    press("ArrowUp");
    press("ArrowLeft"); // back again: the grade was replaced, not added to
    expect(card()).toContain("is-easier");
    expect(card()).not.toContain("is-harder");

    press("ArrowRight"); // card b, never graded
    expect(card()).not.toContain("is-easier");
  });

  /* `previous` is the undo. A grade takes the card away immediately, so the
     reader's own last answer has to stay theirs to change — otherwise a swipe
     in the wrong direction would be unfixable for the day, at every card
     (V2-5.13). What keeps that from inflating a host's own data is the host's
     own rule, not a lock here (V2-11.10). */
  it("keeps a card's grade and lets the reader take it back by paging to the card", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });
    const card = () => document.querySelector(".fc-card").className;

    press("ArrowUp"); // card a: easier, and away it goes
    press("ArrowLeft"); // back to card a, card b reported as merely seen

    expect(front(".fc-text").textContent).toBe("eins");
    expect(card()).toContain("is-easier");

    press("ArrowUp"); // the same grade again: nothing new to say
    press("ArrowLeft"); // back to card a once more
    press("ArrowDown"); // and a change of mind, which does count

    expect(graded).toEqual([
      ["a", "easier"],
      ["b", "neutral"],
      ["b", "neutral"],
      ["a", "harder"],
    ]);
  });

  it("shows the mark of a card the host says is already graded, and lets the reader change it", () => {
    const graded = [];
    open({
      gradeOf: (card) => (card.key === "b" ? "harder" : null),
      onGrade: (card, level) => graded.push([card.key, level]),
    });
    const card = () => document.querySelector(".fc-card").className;

    expect(card()).not.toContain("is-harder"); // card a: the host has nothing to say about it

    press("ArrowRight"); // to card b, graded before this deck was mounted
    expect(card()).toContain("is-harder");

    press("ArrowUp"); // disagreeing with a grade from an earlier visit counts

    expect(graded).toEqual([
      ["a", "neutral"],
      ["b", "easier"],
    ]);
  });

  it("does not report a card as neutral on a revisit if it was graded in an earlier visit", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowUp"); // card a: easier, which delivers card b
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

  /* There is no refused gesture left to report. Every grading gesture now has
     a visible result — the card leaves, wearing the mark — so nothing is
     dropped and there is nothing for a host to explain (V2-15.2). */
  it("answers every grading gesture by taking the card away, whatever the card already carried", () => {
    open({ gradeOf: () => "easier" });

    press("ArrowDown");
    expect(front(".fc-text").textContent).toBe("zwei");

    press("ArrowUp"); // the grade card b arrived with, repeated
    expect(front(".fc-text").textContent).toBe("drei");
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

      press("ArrowUp"); // card a: easier, which delivers card b
      press("ArrowLeft"); // back to card a, so the switch leaves a graded card
      mounted.at(-1).switchTo(other);

      expect(graded).toEqual([
        ["a", "easier"],
        ["b", "neutral"],
      ]);
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

  /* Vertical is the reader's verdict, horizontal is the deck moving on, so a
     graded card leaves the way it was pushed and the next one arrives the way
     every next card does. jsdom has no Web Animations API, so the keyframes
     have to be read off a stub — everywhere else in this file the exchange is
     instant and says nothing about which way anything went. */
  describe("a graded card leaving", () => {
    const withAnimate = async (run) => {
      const legs = [];
      Element.prototype.animate = (keyframes, options) => {
        legs.push({ frames: keyframes.map((frame) => frame.transform), ...options });
        return { finished: Promise.resolve() };
      };

      try {
        await run(legs);
      } finally {
        delete Element.prototype.animate;
      }
    };

    it("flies up for easier and arrives from the right", async () => {
      await withAnimate(async (legs) => {
        open();
        press("ArrowUp");
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(legs).toHaveLength(2);
        expect(legs[0].frames.at(-1)).toBe("translateY(-100%)");
        expect(legs[1].frames.at(0)).toBe("translateX(100%)");
        expect(front(".fc-text").textContent).toBe("zwei");
      });
    });

    it("flies down for harder", async () => {
      await withAnimate(async (legs) => {
        open();
        press("ArrowDown");
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(legs[0].frames.at(-1)).toBe("translateY(100%)");
      });
    });

    /* The card holds still wearing its finished mark before it goes, which is
       a keyframe rather than a timer so that nothing can put the card back in
       the middle between the hold and the exit (V2-8.10). */
    it("holds where the gesture left it before it goes", async () => {
      await withAnimate(async (legs) => {
        open();
        drag(0, -60); /* past the threshold: 40px resisted, 20px free */
        await new Promise((resolve) => setTimeout(resolve, 0));

        const [held, gone] = legs[0].frames;
        expect(held).toBe("translateY(-28.8px)");
        expect(gone).toBe("translateY(-28.8px)"); /* still there, one keyframe later */
        expect(legs[0].frames.at(-1)).toBe("translateY(-100%)");
      });
    });

    /* The word goes with the card. A swipe has already shown it — it went up at
       the threshold and has not moved since — so this is continuity rather than
       a second announcement, and it is the only time a keyboard grade shows the
       word at all, which is what keeps `↑` and a swipe up leaving the same card
       behind (V2-9.3). */
    it("carries the word out with the card, and delivers the next one bare", async () => {
      await withAnimate(async () => {
        open({ labels: LABELS });

        press("ArrowUp"); /* no drag at all: the exit is the whole of it */
        expect(bandEdge()).toBe("top");
        expect(bandWord()).toBe("Knew it");

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(bandEdge()).toBe(null);
        expect(bandWord()).toBe(null);
        expect(front(".fc-text").textContent).toBe("zwei");
      });
    });

    /* A reader grading quickly makes the next swipe before the last card has
       finished leaving. Dropping an intent costs nothing when it is a page
       turn they will simply make again; it costs a grade now that a grade is
       what was dropped — so the guard comes off at the swap (V2-4.9). */
    it("takes the next grade as soon as the cards have been exchanged", async () => {
      await withAnimate(async () => {
        const graded = [];
        open({ onGrade: (card, level) => graded.push([card.key, level]) });

        press("ArrowUp");
        await new Promise((resolve) => setTimeout(resolve, 0));
        press("ArrowUp"); /* mid-arrival, on the card already on screen */

        expect(graded).toEqual([
          ["a", "easier"],
          ["b", "easier"],
        ]);
      });
    });
  });

  /* Two identical bars on opposite edges are one object drawn twice: which
     edge a bar is on is a convention to remember rather than something to
     read. The word is what separates the two gestures (V2-5.7a). */
  describe("the grade band", () => {
    it("says nothing until the gesture is a grade, and names it once it is", () => {
      open({ labels: LABELS });

      drag(0, -20, { release: false }); /* half the threshold: still an experiment */
      expect(bandEdge()).toBe(null);

      drag(0, -60, { release: false }); /* past it: the card has broken free */
      expect(bandEdge()).toBe("top");
      expect(bandWord()).toBe("Knew it");
    });

    it("names the other grade on the other edge", () => {
      open({ labels: LABELS });

      drag(0, 60, { release: false });
      expect(bandEdge()).toBe("bottom");
      expect(bandWord()).toBe("Didn't know it");
    });

    /* Dragging back under the threshold takes it away again, which is what
       keeps V2-4.10's experiment an experiment rather than a commitment. */
    it("goes again if the reader drags back under the threshold", () => {
      open({ labels: LABELS });

      drag(0, -60, { release: false });
      drag(0, -20, { release: false });

      expect(bandEdge()).toBe(null);
    });

    it("stays away for a horizontal drag, which is a page turn and not a grade", () => {
      open({ labels: LABELS });

      drag(-80, 0, { release: false });
      expect(bandEdge()).toBe(null);
    });

    /* The words are the host's, like every other word on the page: a bare card
       mounted without them is drawn exactly as it was before they existed. */
    it("is not drawn at all for a host with no words for the grades", () => {
      open();

      drag(0, -60, { release: false });
      expect(bandEdge()).toBe(null);
      expect(bandWord()).toBe(null);
    });

    it("keeps the edge the card already carries out of it, reading the gesture instead", () => {
      open({ labels: LABELS, gradeOf: () => "harder" }); /* card a arrives marked harder */

      drag(0, -60, { release: false }); /* dragged the other way */

      expect(bandEdge()).toBe("top");
      expect(bandWord()).toBe("Knew it");
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

    /* Short of the threshold a vertical drag is resisted, because a gesture
       that stops there is not a grade; past it the card breaks free and takes
       every further pixel one for one, because past it the card really is
       leaving (V2-4.10). A horizontal drag is a page turn throughout. */
    it("resists a vertical drag until it is a grade, then lets the card go", () => {
      open();

      drag(0, -20, { release: false }); /* half the threshold */
      expect(slider().style.transform).toBe("translate(0, -4.4px)"); /* resistance, not travel */

      drag(0, -100, { release: false }); /* 40px resisted, then 60px free */
      expect(slider().style.transform).toBe("translate(0, -68.8px)");

      drag(-100, 0, { release: false });
      expect(slider().style.transform).toBe("translate(-100px, 0)"); /* on its way out */
    });

    /* A finger that never lets go must not be able to drag the card past the
       edge of the screen and strand it there — the exit animation is what
       actually sends a graded card off screen, not the drag itself. jsdom does
       no layout, so the room around the card is stubbed here the way a real
       browser would report it. */
    it("stops a vertical drag at the edge of the screen instead of following it off", () => {
      open();

      Object.defineProperty(document.querySelector(".fc"), "clientHeight", { value: 800, configurable: true });
      Object.defineProperty(document.querySelector(".fc-card"), "offsetHeight", { value: 500, configurable: true });

      drag(0, -2000, { release: false }); /* half the 300px of headroom is 150px each way */
      expect(slider().style.transform).toBe("translate(0, -150px)");
    });

    it("leaves a vertical drag uncapped when the card's own layout can't be measured", () => {
      open();

      drag(0, -100, { release: false }); /* 40px resisted, then 60px free (unclamped: no layout data) */
      expect(slider().style.transform).toBe("translate(0, -68.8px)");
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

  /* Which side a card arrives on is the host's answer, asked per card and
     never remembered here (V2-16.4). The library knows "front" or "back" and
     has never heard the word random. */
  describe("facing", () => {
    it("shows the front when nobody has said otherwise", () => {
      open();
      expect(isFlipped()).toBe(false);
    });

    it("shows the back when the host says the card arrives that way", () => {
      open({ facing: () => "back" });

      expect(isFlipped()).toBe(true);
      expect(back(".fc-text").textContent).toBe("one"); // the answer, up first
      expect(front(".fc-text").textContent).toBe("eins"); // and it is still card a
    });

    it("asks again for every card that arrives, rather than once", () => {
      const asked = [];
      open({
        facing: (card) => {
          asked.push(card.key);
          return card.key === "b" ? "back" : "front";
        },
      });

      expect(isFlipped()).toBe(false);
      press("ArrowRight");
      expect(isFlipped()).toBe(true); // card b, face down
      press("ArrowRight");
      expect(isFlipped()).toBe(false);

      expect(asked).toEqual(["a", "b", "c"]);
    });

    it("leaves the flip meaning what it always meant", () => {
      open({ facing: () => "back" });

      press(" ");
      expect(isFlipped()).toBe(false);
    });

    it("faces a card reached by switchTo the same way as one paged to", () => {
      const deck = open({ facing: () => "back" });

      deck.switchTo([{ key: "z", frontText: "vier", backText: "four" }]);
      expect(isFlipped()).toBe(true);
    });

    it("turns the card on screen over when the host's answer changes under it", () => {
      let side = "front";
      const deck = open({ facing: () => side });

      side = "back";
      deck.reface();

      expect(isFlipped()).toBe(true);
      expect(front(".fc-text").textContent).toBe("eins"); // the same card, the other way up
    });
  });

  /* Somewhere for a host's own controls that is over the card and in the
     card's own coordinate space, without being part of the card (V2-16.1). */
  describe("chrome", () => {
    it("is an empty layer inside the mounted deck, and the library draws nothing in it", () => {
      const deck = open();

      expect(deck.chrome.className).toBe("fc-chrome");
      expect(document.querySelector(".fc").contains(deck.chrome)).toBe(true);
      expect(deck.chrome.children).toHaveLength(0);
    });

    it("does not let a tap on what a host puts there flip the card", () => {
      const deck = open();
      const button = document.createElement("button");
      deck.chrome.append(button);

      button.dispatchEvent(new MouseEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }));
      button.dispatchEvent(new MouseEvent("pointerup", { clientX: 0, clientY: 0, bubbles: true }));

      expect(isFlipped()).toBe(false);
    });

    it("does not let a drag begun there page the deck", () => {
      const deck = open();
      const button = document.createElement("button");
      deck.chrome.append(button);

      button.dispatchEvent(new MouseEvent("pointerdown", { clientX: 200, clientY: 200, bubbles: true }));
      button.dispatchEvent(new MouseEvent("pointerup", { clientX: 40, clientY: 200, bubbles: true }));

      expect(front(".fc-text").textContent).toBe("eins");
    });

    it("leaves the card every gesture that starts anywhere else", () => {
      open();

      drag(-80, 0);
      expect(front(".fc-text").textContent).toBe("zwei");
    });

    it("goes when the deck does", () => {
      const deck = open();
      deck.destroy();

      expect(document.querySelector(".fc-chrome")).toBe(null);
    });
  });

  it("grades without an onGrade callback", () => {
    open();

    expect(() => press("ArrowDown")).not.toThrow();
    expect(front(".fc-text").textContent).toBe("zwei");
  });

  it("records every card of the deck in local storage", () => {
    open();

    expect(Object.keys(JSON.parse(localStorage.getItem(STORAGE_KEY)))).toEqual(["a", "b", "c"]);
  });

  it("overwrites a stale stored copy with the deck's current one", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: { key: "a", frontText: "stored", backText: "one" } }));
    open();

    expect(front(".fc-text").textContent).toBe("eins");
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
