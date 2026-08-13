import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

  it("grades the card in front of the reader, then moves on", () => {
    const graded = [];
    open({ onGrade: (card, level) => graded.push([card.key, level]) });

    press("ArrowDown");
    expect(front(".fc-text").textContent).toBe("zwei");

    press("ArrowUp");
    expect(front(".fc-text").textContent).toBe("drei");

    expect(graded).toEqual([
      ["a", "easier"],
      ["b", "harder"],
    ]);
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
