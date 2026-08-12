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

function mount(cards: Flashcard[], options?: ConstructorParameters<typeof FlashcardDeck>[2]): {
  deck: FlashcardDeck;
  container: HTMLElement;
} {
  document.body.innerHTML = '<div id="app"></div>';
  const container = document.querySelector("#app") as HTMLElement;
  const deck = new FlashcardDeck(container, cards, options);
  return { deck, container };
}

function arrows(container: HTMLElement): { prev: HTMLButtonElement; next: HTMLButtonElement } {
  return {
    prev: container.querySelector(".fc-arrow--prev") as HTMLButtonElement,
    next: container.querySelector(".fc-arrow--next") as HTMLButtonElement,
  };
}

describe("card content rendering (T-04 wiring)", () => {
  it("fills each .fc-card with its own front/back text via _renderCard", () => {
    document.body.innerHTML = '<div id="app"></div>';

    new FlashcardDeck("#app", CARDS);

    const cardEls = document.querySelectorAll("#app .fc-card");
    expect(cardEls).toHaveLength(CARDS.length);
    cardEls.forEach((cardEl, i) => {
      expect(cardEl.querySelector(".fc-face--front .fc-text")?.textContent).toBe(CARDS[i]!.front.text);
      expect(cardEl.querySelector(".fc-face--back .fc-text")?.textContent).toBe(CARDS[i]!.back.text);
    });
  });

  it("publishes the resolved textScale/detailsScale as --fc-text-scale/--fc-details-scale on .fc-root (LIB-4.12)", () => {
    document.body.innerHTML = '<div id="app"></div>';

    new FlashcardDeck("#app", CARDS, { textScale: 0.12, detailsScale: 0.03 });

    const root = document.querySelector("#app > .fc-root") as HTMLElement;
    expect(root.style.getPropertyValue("--fc-text-scale")).toBe("0.12");
    expect(root.style.getPropertyValue("--fc-details-scale")).toBe("0.03");
  });

  it("uses the documented defaults for --fc-text-scale/--fc-details-scale when unconfigured", () => {
    document.body.innerHTML = '<div id="app"></div>';

    new FlashcardDeck("#app", CARDS);

    const root = document.querySelector("#app > .fc-root") as HTMLElement;
    expect(root.style.getPropertyValue("--fc-text-scale")).toBe("0.085");
    expect(root.style.getPropertyValue("--fc-details-scale")).toBe("0.05");
  });
});

describe("indicator mode (LIB-4.15–LIB-4.18)", () => {
  it("shows dots for n <= dotLimit and switches to a counter above it", () => {
    const dotCards = Array.from({ length: 12 }, (_, i) => ({ front: { text: `${i}` }, back: { text: `${i}` } }));
    const { container: dotContainer } = mount(dotCards);
    expect(dotContainer.querySelectorAll(".fc-indicator-dot")).toHaveLength(12);
    expect(dotContainer.querySelector(".fc-indicator-counter")).toBeNull();

    const counterCards = Array.from({ length: 13 }, (_, i) => ({ front: { text: `${i}` }, back: { text: `${i}` } }));
    const { container: counterContainer } = mount(counterCards);
    expect(counterContainer.querySelectorAll(".fc-indicator-dot")).toHaveLength(0);
    expect(counterContainer.querySelector(".fc-indicator-counter")?.textContent).toBe("1 / 13");
  });

  it("respects a configured dotLimit", () => {
    const cards = Array.from({ length: 5 }, (_, i) => ({ front: { text: `${i}` }, back: { text: `${i}` } }));
    const { container } = mount(cards, { dotLimit: 4 });

    expect(container.querySelector(".fc-indicator-counter")?.textContent).toBe("1 / 5");
  });

  it("hides indicators and disables both arrows for exactly one card", () => {
    const { container } = mount([CARDS[0]!]);

    expect(container.querySelector(".fc-indicators")?.children).toHaveLength(0);
    const { prev, next } = arrows(container);
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(true);
  });

  it("renders an empty-state message, disables both arrows, and never throws for an empty deck", () => {
    let container!: HTMLElement;
    expect(() => {
      ({ container } = mount([]));
    }).not.toThrow();

    expect(container.querySelector(".fc-empty")).not.toBeNull();
    const { prev, next } = arrows(container);
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(true);
  });
});

describe("arrow disabled state at the ends (LIB-5.4, LIB-5.18)", () => {
  it("disables the previous arrow on the first card and the next arrow on the last", () => {
    const { deck, container } = mount(CARDS);
    const { prev, next } = arrows(container);

    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    deck.goTo(CARDS.length - 1);

    expect(prev.disabled).toBe(false);
    expect(next.disabled).toBe(true);
  });

  it("navigates one card per arrow click and does not wrap", () => {
    const { deck, container } = mount(CARDS);
    const { prev, next } = arrows(container);

    next.click();
    expect(deck.getState().index).toBe(1);

    next.click();
    next.click(); // already on the last card — stays put, no wrap
    expect(deck.getState().index).toBe(CARDS.length - 1);

    prev.click();
    expect(deck.getState().index).toBe(CARDS.length - 2);
  });
});

describe("keyboard navigation (LIB-5.19, LIB-5.23)", () => {
  it("navigates on ArrowRight / ArrowLeft dispatched at the container", () => {
    const { deck, container } = mount(CARDS);

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(deck.getState().index).toBe(1);

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(deck.getState().index).toBe(0);
  });

  it("ignores unrelated keys", () => {
    const { deck, container } = mount(CARDS);

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));

    expect(deck.getState().index).toBe(0);
  });

  it("only the deck whose container receives the event responds — no document-level listener", () => {
    const { deck } = mount(CARDS);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(deck.getState().index).toBe(0);
  });
});

describe("goTo (LIB-6.3)", () => {
  it("clamps a negative index to 0", () => {
    const { deck } = mount(CARDS);

    deck.goTo(-5);

    expect(deck.getState().index).toBe(0);
  });

  it("clamps an out-of-range index to the last card", () => {
    const { deck } = mount(CARDS);

    deck.goTo(999);

    expect(deck.getState().index).toBe(CARDS.length - 1);
  });

  it("is a no-op on an empty deck", () => {
    const { deck } = mount([]);

    expect(() => deck.goTo(2)).not.toThrow();
    expect(deck.getState().index).toBe(0);
    expect(deck.getState().count).toBe(0);
  });

  it("does not animate by default", () => {
    const { deck, container } = mount(CARDS);

    deck.goTo(1);

    expect(container.querySelector(".fc-track")?.classList.contains("fc-track--animate")).toBe(false);
  });

  it("animates when animate: true is passed", () => {
    const { deck, container } = mount(CARDS);

    deck.goTo(1, { animate: true });

    expect(container.querySelector(".fc-track")?.classList.contains("fc-track--animate")).toBe(true);
  });
});

describe("getState (LIB-6.4)", () => {
  it("reports the current index, side, and card count", () => {
    const { deck } = mount(CARDS);

    expect(deck.getState()).toEqual({ index: 0, side: "front", count: CARDS.length });

    deck.goTo(2);

    expect(deck.getState()).toEqual({ index: 2, side: "front", count: CARDS.length });
  });

  it("reports a count of 0 for an empty deck", () => {
    const { deck } = mount([]);

    expect(deck.getState()).toEqual({ index: 0, side: "front", count: 0 });
  });
});

function tap(card: Element, at: { x: number; y: number } = { x: 0, y: 0 }): void {
  card.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: at.x, clientY: at.y }));
  card.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: at.x, clientY: at.y }));
}

describe("tap/click flip (LIB-5.12, LIB-5.13)", () => {
  it("flips the tapped card to back, and back to front on a second tap", () => {
    const { deck, container } = mount(CARDS);
    const card = container.querySelector(".fc-card") as HTMLElement;

    tap(card);
    expect(deck.getState().side).toBe("back");
    expect(card.classList.contains("fc-card--flipped")).toBe(true);

    tap(card);
    expect(deck.getState().side).toBe("front");
    expect(card.classList.contains("fc-card--flipped")).toBe(false);
  });

  it("flips when the press originates on nested card content, not just the card element itself", () => {
    const { deck, container } = mount(CARDS);
    const text = container.querySelector(".fc-face--front .fc-text") as HTMLElement;

    tap(text);

    expect(deck.getState().side).toBe("back");
  });

  it("does not flip when release has moved >= 8px from the press point (a drag-to-select)", () => {
    const { deck, container } = mount(CARDS);
    const card = container.querySelector(".fc-card") as HTMLElement;

    card.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
    card.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 20, clientY: 0 }));

    expect(deck.getState().side).toBe("front");
  });

  it("does not flip when the current selection is not collapsed", () => {
    const { deck, container } = mount(CARDS);
    const card = container.querySelector(".fc-card") as HTMLElement;
    const getSelectionSpy = vi
      .spyOn(window, "getSelection")
      .mockReturnValue({ isCollapsed: false } as unknown as Selection);

    tap(card);

    expect(deck.getState().side).toBe("front");
    getSelectionSpy.mockRestore();
  });

  it("cancels a pending flip on pointercancel (e.g. a long-press text selection)", () => {
    const { deck, container } = mount(CARDS);
    const card = container.querySelector(".fc-card") as HTMLElement;

    card.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
    card.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    card.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 0, clientY: 0 }));

    expect(deck.getState().side).toBe("front");
  });

  it("ignores a pointerup with no matching pointerdown on the track", () => {
    const { deck, container } = mount(CARDS);
    const card = container.querySelector(".fc-card") as HTMLElement;

    expect(() => card.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))).not.toThrow();
    expect(deck.getState().side).toBe("front");
  });
});

describe("per-card flip persistence (LIB-5.14)", () => {
  it("keeps each card's flip state independent across navigation", () => {
    const { deck, container } = mount(CARDS);
    const cards = () => Array.from(container.querySelectorAll(".fc-card"));

    tap(cards()[0] as HTMLElement);
    expect(deck.getState()).toMatchObject({ index: 0, side: "back" });

    deck.goTo(1);
    expect(deck.getState()).toMatchObject({ index: 1, side: "front" });

    deck.goTo(2);
    tap(cards()[2] as HTMLElement);
    expect(deck.getState()).toMatchObject({ index: 2, side: "back" });

    deck.goTo(0);
    expect(deck.getState()).toMatchObject({ index: 0, side: "back" });

    deck.goTo(1);
    expect(deck.getState()).toMatchObject({ index: 1, side: "front" });
  });
});

describe("keyboard flip (LIB-5.20, LIB-5.22)", () => {
  it("flips the current card on Enter", () => {
    const { deck, container } = mount(CARDS);

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(deck.getState().side).toBe("back");
  });

  it("flips the current card on Space and calls preventDefault so the page does not scroll", () => {
    const { deck, container } = mount(CARDS);
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    container.dispatchEvent(event);

    expect(deck.getState().side).toBe("back");
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it("does not call preventDefault for Enter", () => {
    const { container } = mount(CARDS);
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    container.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it("flips the card currently navigated to, not always the first card", () => {
    const { deck, container } = mount(CARDS);

    deck.goTo(1);
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(deck.getState()).toMatchObject({ index: 1, side: "back" });
  });
});

describe("destroy() teardown of pointer listeners", () => {
  it("removes the track's pointer listeners so a tap after destroy does nothing", () => {
    const { deck, container } = mount(CARDS);
    const card = container.querySelector(".fc-card") as HTMLElement;

    deck.destroy();

    expect(() => tap(card)).not.toThrow();
  });
});
