import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FlashcardDeck, VERSION } from "./index.js";
import type { Flashcard } from "./types.js";

const CARDS: Flashcard[] = [
  { front: { text: "one" }, back: { text: "1" } },
  { front: { text: "two" }, back: { text: "2" } },
  { front: { text: "three" }, back: { text: "3" } },
];

function resetDom(): void {
  document.body.innerHTML = "";
  document.querySelectorAll("style[data-fc-styles]").forEach((el) => el.remove());
}

beforeEach(resetDom);
afterEach(resetDom);

describe("library scaffold (T-00)", () => {
  it("exports a version", () => {
    expect(VERSION).toBe("0.0.0");
  });
});

describe("FlashcardDeck DOM structure (LIB-7.2, LIB-7.9)", () => {
  it("builds the documented shape inside the container, touching nothing else in the container's subtree", () => {
    document.body.innerHTML = '<div id="app"><p id="sibling">untouched sibling</p></div><p id="outside">outside</p>';
    const container = document.querySelector("#app") as Element;

    new FlashcardDeck(container, CARDS);

    const root = container.querySelector(":scope > .fc-root");
    expect(root).not.toBeNull();
    expect(container.children).toHaveLength(1);
    expect(container.querySelector("#sibling")).toBeNull();
    expect(document.querySelector("#outside")?.textContent).toBe("outside");

    const track = root!.querySelector(":scope > .fc-track");
    expect(track).not.toBeNull();
    expect(track!.children).toHaveLength(CARDS.length);
    for (const card of Array.from(track!.children)) {
      expect(card.className).toBe("fc-card");
    }

    expect(root!.querySelector(":scope > .fc-indicators")).not.toBeNull();

    const prev = root!.querySelector(":scope > button.fc-arrow.fc-arrow--prev");
    const next = root!.querySelector(":scope > button.fc-arrow.fc-arrow--next");
    const info = root!.querySelector(":scope > button.fc-info");
    expect(prev?.tagName).toBe("BUTTON");
    expect(next?.tagName).toBe("BUTTON");
    expect(info?.tagName).toBe("BUTTON");
  });

  it("accepts a selector string as well as an element", () => {
    document.body.innerHTML = '<div id="app"></div>';

    new FlashcardDeck("#app", CARDS);

    expect(document.querySelector("#app > .fc-root")).not.toBeNull();
  });

  it("throws when a selector matches nothing, rather than silently no-oping", () => {
    expect(() => new FlashcardDeck("#missing", CARDS)).toThrow();
  });

  it("renders one blank .fc-card per input card, including zero for an empty deck", () => {
    document.body.innerHTML = '<div id="app"></div>';

    new FlashcardDeck("#app", []);

    expect(document.querySelectorAll("#app .fc-card")).toHaveLength(0);
  });

  it("gives every rendered class name the fc- prefix", () => {
    document.body.innerHTML = '<div id="app"></div>';

    new FlashcardDeck("#app", CARDS);

    const classes = new Set<string>();
    document.querySelectorAll("#app .fc-root, #app .fc-root *").forEach((el) => {
      el.classList.forEach((c) => classes.add(c));
    });

    expect(classes.size).toBeGreaterThan(0);
    for (const className of classes) {
      expect(className.startsWith("fc-")).toBe(true);
    }
  });

  it("maps accentColor onto --fc-accent on .fc-root (LIB-4.32)", () => {
    document.body.innerHTML = '<div id="app"></div>';

    new FlashcardDeck("#app", CARDS, { accentColor: "#ff0000" });

    const root = document.querySelector("#app > .fc-root") as HTMLElement;
    expect(root.style.getPropertyValue("--fc-accent")).toBe("#ff0000");
  });

  it("leaves --fc-accent unset on the element when no accentColor is given (the stylesheet default applies)", () => {
    document.body.innerHTML = '<div id="app"></div>';

    new FlashcardDeck("#app", CARDS);

    const root = document.querySelector("#app > .fc-root") as HTMLElement;
    expect(root.style.getPropertyValue("--fc-accent")).toBe("");
  });
});

describe("style injection (LIB-7.4, LIB-7.5, LIB-7.6)", () => {
  it("injects exactly one <style data-fc-styles> into <head> for two decks on one page", () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';

    new FlashcardDeck("#a", CARDS);
    new FlashcardDeck("#b", CARDS);

    expect(document.head.querySelectorAll("style[data-fc-styles]")).toHaveLength(1);
  });

  it("dedupes across two separately-imported copies of the module, since the guard is a DOM query, not a module flag (LIB-7.5)", async () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';

    const first = await import("./index.js");
    new first.FlashcardDeck("#a", CARDS);
    expect(document.head.querySelectorAll("style[data-fc-styles]")).toHaveLength(1);

    vi.resetModules();
    const second = await import("./index.js");
    expect(second.FlashcardDeck).not.toBe(first.FlashcardDeck);

    new second.FlashcardDeck("#b", CARDS);
    expect(document.head.querySelectorAll("style[data-fc-styles]")).toHaveLength(1);
  });

  it("suppresses injection entirely when injectStyles is false, and still builds the deck", () => {
    document.body.innerHTML = '<div id="app"></div>';

    new FlashcardDeck("#app", CARDS, { injectStyles: false });

    expect(document.head.querySelector("style[data-fc-styles]")).toBeNull();
    expect(document.querySelector("#app > .fc-root")).not.toBeNull();
  });
});

describe("destroy() teardown (LIB-6.5)", () => {
  it("empties the container", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const deck = new FlashcardDeck("#app", CARDS);
    const container = document.querySelector("#app") as Element;

    deck.destroy();

    expect(container.children).toHaveLength(0);
  });

  it("is safe to call twice", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const deck = new FlashcardDeck("#app", CARDS);

    deck.destroy();
    expect(() => deck.destroy()).not.toThrow();
  });

  it("balances every addEventListener the deck itself issues with a matching removeEventListener", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const container = document.querySelector("#app") as HTMLElement;

    const containerAdd = vi.spyOn(container, "addEventListener");
    const containerRemove = vi.spyOn(container, "removeEventListener");
    const windowAdd = vi.spyOn(window, "addEventListener");
    const windowRemove = vi.spyOn(window, "removeEventListener");

    const deck = new FlashcardDeck(container, CARDS);
    deck.destroy();

    expect(containerRemove).toHaveBeenCalledTimes(containerAdd.mock.calls.length);
    expect(windowRemove).toHaveBeenCalledTimes(windowAdd.mock.calls.length);

    containerAdd.mockRestore();
    containerRemove.mockRestore();
    windowAdd.mockRestore();
    windowRemove.mockRestore();
  });
});

describe("container height (LIB-7.10)", () => {
  it("never sets an inline height or width on the supplied container itself", () => {
    document.body.innerHTML = '<div id="app"></div>';
    const container = document.querySelector("#app") as HTMLElement;

    new FlashcardDeck(container, CARDS);

    expect(container.style.height).toBe("");
    expect(container.style.width).toBe("");
    expect(container.getAttribute("style")).toBeNull();
  });
});
