import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveOptions } from "./config.js";
import { FlashcardDeck } from "./index.js";
import { computeCardSize } from "./sizing.js";
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

  it("removes the track's pointermove listener too, so a drag after destroy does not navigate", () => {
    const restore = stubCardRect(200, 300);
    const { deck, container } = mount(CARDS);
    const card = container.querySelector(".fc-card") as HTMLElement;

    deck.destroy();
    drag(card, [
      { x: 0, y: 0 },
      { x: -100, y: 0 },
      { x: -100, y: 0 },
    ]);

    expect(deck.getState().index).toBe(0);
    restore();
  });
});

function cards(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(".fc-card"));
}

/** Stubs every element's measured size for the duration of a test — jsdom
 * has no layout engine, so `getBoundingClientRect` is 0 by default (see
 * `gesture.ts`'s own doc comment on why the gesture context is measured this
 * way rather than assuming a CSS value). Returns a restore function. */
function stubCardRect(width: number, height: number): () => void {
  const rect: DOMRect = {
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };
  const spy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rect);
  return () => spy.mockRestore();
}

/** Dispatches a `pointerdown` at `points[0]`, a `pointermove` for every
 * point up to the last, and a final `pointerup` at the last point — the
 * shape `_handlePointerDown`/`_handlePointerMove`/`_handlePointerUp` expect
 * from a real drag. */
function drag(el: Element, points: Array<{ x: number; y: number }>, pointerType = "touch"): void {
  const [first, ...rest] = points;
  el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: first!.x, clientY: first!.y, pointerType }));
  rest.forEach((point, i) => {
    const type = i === rest.length - 1 ? "pointerup" : "pointermove";
    el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: point.x, clientY: point.y, pointerType }));
  });
}

describe("gesture engine: horizontal navigation (LIB-5.2, LIB-5.4, LIB-5.6, LIB-5.7)", () => {
  it("navigates forward when a leftward drag crosses the swipe threshold (18% of 200px = 36px)", () => {
    const restore = stubCardRect(200, 300);
    const { deck, container } = mount(CARDS);
    const card = cards(container)[0]!;

    drag(card, [
      { x: 0, y: 0 },
      { x: -50, y: 0 },
      { x: -50, y: 0 },
    ]);

    expect(deck.getState().index).toBe(1);
    restore();
  });

  it("navigates backward on a rightward drag past the threshold", () => {
    const restore = stubCardRect(200, 300);
    const { deck, container } = mount(CARDS);
    deck.goTo(1);
    const card = cards(container)[1]!;

    drag(card, [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 0 },
    ]);

    expect(deck.getState().index).toBe(0);
    restore();
  });

  it("snaps back (no navigation) when the drag stays under the threshold", () => {
    const restore = stubCardRect(200, 300);
    const { deck, container } = mount(CARDS);
    const card = cards(container)[0]!;

    drag(card, [
      { x: 0, y: 0 },
      { x: -20, y: 0 },
      { x: -20, y: 0 },
    ]);

    expect(deck.getState().index).toBe(0);
    restore();
  });

  it("does not wrap: a rightward drag past threshold on the first card snaps back", () => {
    const restore = stubCardRect(200, 300);
    const { deck, container } = mount(CARDS);
    const card = cards(container)[0]!;

    drag(card, [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 0 },
    ]);

    expect(deck.getState().index).toBe(0);
    restore();
  });

  it("does not also flip the card once a horizontal drag has committed to navigate (LIB-5.7)", () => {
    const restore = stubCardRect(200, 300);
    const { deck, container } = mount(CARDS);
    const card = cards(container)[0]!;

    drag(card, [
      { x: 0, y: 0 },
      { x: -50, y: 0 },
      { x: -50, y: 0 },
    ]);

    expect(deck.getState()).toMatchObject({ index: 1, side: "front" });
    restore();
  });
});

describe("gesture engine: vertical grading (LIB-5.8, LIB-5.9, LIB-5.11)", () => {
  it("grades easy on an upward drag past the threshold (15% of 300px = 45px)", () => {
    const restore = stubCardRect(200, 300);
    const onGrade = vi.fn();
    const { container } = mount(CARDS, { onGrade });
    const card = cards(container)[0]!;

    drag(card, [
      { x: 0, y: 0 },
      { x: 0, y: -60 },
      { x: 0, y: -60 },
    ]);

    expect(onGrade).toHaveBeenCalledExactlyOnceWith(0, "easy");
    restore();
  });

  it("grades hard on a downward drag past the threshold", () => {
    const restore = stubCardRect(200, 300);
    const onGrade = vi.fn();
    const { container } = mount(CARDS, { onGrade });
    const card = cards(container)[0]!;

    drag(card, [
      { x: 0, y: 0 },
      { x: 0, y: 60 },
      { x: 0, y: 60 },
    ]);

    expect(onGrade).toHaveBeenCalledExactlyOnceWith(0, "hard");
    restore();
  });

  it("does not grade when the vertical drag stays under the threshold", () => {
    const restore = stubCardRect(200, 300);
    const onGrade = vi.fn();
    const { container } = mount(CARDS, { onGrade });
    const card = cards(container)[0]!;

    drag(card, [
      { x: 0, y: 0 },
      { x: 0, y: 20 },
      { x: 0, y: 20 },
    ]);

    expect(onGrade).not.toHaveBeenCalled();
    restore();
  });

  it("locks the axis on the first move and does not grade a diagonal-then-vertical drag as navigation", () => {
    const restore = stubCardRect(200, 300);
    const { deck, container } = mount(CARDS);
    const card = cards(container)[0]!;

    // First movement is vertical-dominant (locks to y); a later, larger
    // horizontal component must not switch it to x.
    drag(card, [
      { x: 0, y: 0 },
      { x: 2, y: 10 },
      { x: 80, y: 60 },
    ]);

    expect(deck.getState().index).toBe(0);
    restore();
  });
});

describe("gesture engine: desktop mouse (LIB-5.16, LIB-5.17)", () => {
  it("does not navigate on a mouse drag past the swipe threshold", () => {
    const restore = stubCardRect(200, 300);
    const { deck, container } = mount(CARDS);
    const card = cards(container)[0]!;

    drag(
      card,
      [
        { x: 0, y: 0 },
        { x: -100, y: 0 },
        { x: -100, y: 0 },
      ],
      "mouse",
    );

    expect(deck.getState().index).toBe(0);
    restore();
  });

  it("does not grade on a mouse drag past the grade threshold", () => {
    const restore = stubCardRect(200, 300);
    const onGrade = vi.fn();
    const { container } = mount(CARDS, { onGrade });
    const card = cards(container)[0]!;

    drag(
      card,
      [
        { x: 0, y: 0 },
        { x: 0, y: -100 },
        { x: 0, y: -100 },
      ],
      "mouse",
    );

    expect(onGrade).not.toHaveBeenCalled();
    restore();
  });

  it("leaves a non-collapsed selection at release alone — no flip — exactly as the pre-gesture tap path already did", () => {
    const restore = stubCardRect(200, 300);
    const { deck, container } = mount(CARDS);
    const card = cards(container)[0]!;
    const getSelectionSpy = vi
      .spyOn(window, "getSelection")
      .mockReturnValue({ isCollapsed: false } as unknown as Selection);

    drag(card, [{ x: 0, y: 0 }, { x: 0, y: 0 }], "mouse");

    expect(deck.getState().side).toBe("front");
    getSelectionSpy.mockRestore();
    restore();
  });
});

describe("gesture engine: content scroll suppression (LIB-5.10)", () => {
  it("does not grade while the card's scrollable content is not yet at its boundary", () => {
    const restore = stubCardRect(200, 300);
    const onGrade = vi.fn();
    const { container } = mount(CARDS, { onGrade });
    const card = cards(container)[0]!;
    const content = card.querySelector(".fc-face-content") as HTMLElement;
    Object.defineProperty(content, "scrollHeight", { configurable: true, value: 600 });
    Object.defineProperty(content, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(content, "scrollTop", { configurable: true, value: 0, writable: true });

    // Pressed directly on the scrollable content, as a real touch would be
    // — `closest(".fc-face-content")` only searches target + ancestors.
    drag(content, [
      { x: 0, y: 0 },
      { x: 0, y: -80 },
      { x: 0, y: -80 },
    ]);

    expect(onGrade).not.toHaveBeenCalled();
    restore();
  });

  it("grades once the scrollable content has reached its boundary", () => {
    const restore = stubCardRect(200, 300);
    const onGrade = vi.fn();
    const { container } = mount(CARDS, { onGrade });
    const card = cards(container)[0]!;
    const content = card.querySelector(".fc-face-content") as HTMLElement;
    Object.defineProperty(content, "scrollHeight", { configurable: true, value: 600 });
    Object.defineProperty(content, "clientHeight", { configurable: true, value: 300 });
    // Already at the bottom: an upward drag has nowhere further to scroll.
    Object.defineProperty(content, "scrollTop", { configurable: true, value: 300, writable: true });

    drag(content, [
      { x: 0, y: 0 },
      { x: 0, y: -80 },
      { x: 0, y: -80 },
    ]);

    expect(onGrade).toHaveBeenCalledExactlyOnceWith(0, "easy");
    restore();
  });
});

describe("container role and roledescription (LIB-8.1)", () => {
  it("gives the deck root role=group and aria-roledescription='flashcard deck'", () => {
    const { container } = mount(CARDS);
    const root = container.querySelector(".fc-root") as HTMLElement;

    expect(root.getAttribute("role")).toBe("group");
    expect(root.getAttribute("aria-roledescription")).toBe("flashcard deck");
  });
});

describe("card roles, labels, and roving tabindex (LIB-8.2)", () => {
  it("gives each card role=button and an accessible label, tabindex=0 only on the current card", () => {
    const { container } = mount(CARDS);
    const [first, second, third] = cards(container);

    expect(first!.getAttribute("role")).toBe("button");
    expect(first!.getAttribute("aria-label")).toBe("Card 1 of 3, front");
    expect(first!.getAttribute("tabindex")).toBe("0");

    expect(second!.getAttribute("tabindex")).toBe("-1");
    expect(third!.getAttribute("tabindex")).toBe("-1");
  });

  it("updates the label and moves tabindex=0 when navigation changes the current card", () => {
    const { deck, container } = mount(CARDS);

    deck.goTo(1);

    const [first, second] = cards(container);
    expect(first!.getAttribute("tabindex")).toBe("-1");
    expect(second!.getAttribute("tabindex")).toBe("0");
    expect(second!.getAttribute("aria-label")).toBe("Card 2 of 3, front");
  });

  it("updates the label when a flip changes the side", () => {
    const { container } = mount(CARDS);
    const card = cards(container)[0]!;

    tap(card);

    expect(card.getAttribute("aria-label")).toBe("Card 1 of 3, back");
  });
});

describe("flip live region (LIB-8.3)", () => {
  function liveRegion(container: HTMLElement): HTMLElement {
    return container.querySelector('[aria-live="polite"]') as HTMLElement;
  }

  it("is visually hidden and present from the start", () => {
    const { container } = mount(CARDS);
    const region = liveRegion(container);

    expect(region).not.toBeNull();
    expect(region.className).toBe("fc-sr-only");
  });

  it("announces only the newly revealed side's text on flip", () => {
    const { container } = mount(CARDS);
    const card = cards(container)[0]!;

    tap(card);

    expect(liveRegion(container).textContent).toBe(CARDS[0]!.back.text);
  });

  it("announces the front's text again when flipped back", () => {
    const { container } = mount(CARDS);
    const card = cards(container)[0]!;

    tap(card);
    tap(card);

    expect(liveRegion(container).textContent).toBe(CARDS[0]!.front.text);
  });

  it("never includes details or unrelated card content", () => {
    const detailedCards: Flashcard[] = [
      { front: { text: "front", details: "front details" }, back: { text: "back", details: "back details" } },
    ];
    const { container } = mount(detailedCards);
    const card = cards(container)[0]!;

    tap(card);

    expect(liveRegion(container).textContent).toBe("back");
  });
});

describe("arrow and dot accessible names (LIB-8.4)", () => {
  it("names the arrows 'Previous card' and 'Next card'", () => {
    const { container } = mount(CARDS);
    const { prev, next } = arrows(container);

    expect(prev.getAttribute("aria-label")).toBe("Previous card");
    expect(next.getAttribute("aria-label")).toBe("Next card");
  });

  it("names each dot 'Go to card N' and navigates to it on activation", () => {
    const { deck, container } = mount(CARDS);
    const dots = Array.from(container.querySelectorAll(".fc-indicator-dot")) as HTMLButtonElement[];

    expect(dots.map((d) => d.getAttribute("aria-label"))).toEqual(["Go to card 1", "Go to card 2", "Go to card 3"]);

    dots[2]!.click();

    expect(deck.getState().index).toBe(2);
  });
});

describe("focus follows navigation (LIB-8.6)", () => {
  it("moves focus to the newly current card after an arrow click", () => {
    const { container } = mount(CARDS);
    const { next } = arrows(container);

    next.click();

    expect(document.activeElement).toBe(cards(container)[1]);
  });

  it("moves focus to the newly current card after an ArrowRight/ArrowLeft key", () => {
    const { container } = mount(CARDS);

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(document.activeElement).toBe(cards(container)[1]);
  });

  it("moves focus to the newly current card after goTo()", () => {
    const { deck, container } = mount(CARDS);

    deck.goTo(2);

    expect(document.activeElement).toBe(cards(container)[2]);
  });

  it("moves focus to the newly current card after a dot click", () => {
    const { container } = mount(CARDS);
    const dots = container.querySelectorAll(".fc-indicator-dot");

    (dots[2] as HTMLButtonElement).click();

    expect(document.activeElement).toBe(cards(container)[2]);
  });
});

describe("keyboard grading (LIB-5.21)", () => {
  it("grades the focused card easy on ArrowUp and hard on ArrowDown", () => {
    const onGrade = vi.fn();
    const { container } = mount(CARDS, { onGrade });
    const card = cards(container)[0]!;

    card.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    card.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    expect(onGrade).toHaveBeenNthCalledWith(1, 0, "easy");
    expect(onGrade).toHaveBeenNthCalledWith(2, 0, "hard");
  });

  it("grades the current card at its current index after navigation", () => {
    const onGrade = vi.fn();
    const { deck, container } = mount(CARDS, { onGrade });

    deck.goTo(1);
    const card = cards(container)[1]!;
    card.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));

    expect(onGrade).toHaveBeenCalledWith(1, "easy");
  });

  it("prevents the page from scrolling on ArrowUp/ArrowDown", () => {
    const { container } = mount(CARDS);
    const card = cards(container)[0]!;
    const event = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    card.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it("does nothing when ArrowUp/ArrowDown fires without a focused card (e.g. from an arrow button)", () => {
    const onGrade = vi.fn();
    const { container } = mount(CARDS, { onGrade });
    const { next } = arrows(container);

    next.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));

    expect(onGrade).not.toHaveBeenCalled();
  });
});

describe("two-deck keyboard isolation (LIB-5.23)", () => {
  it("only grades the deck whose card received the ArrowUp/ArrowDown key", () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';
    const onGradeA = vi.fn();
    const onGradeB = vi.fn();
    const deckA = new FlashcardDeck("#a", CARDS, { onGrade: onGradeA });
    new FlashcardDeck("#b", CARDS, { onGrade: onGradeB });

    const cardA = document.querySelector("#a .fc-card") as HTMLElement;
    cardA.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));

    expect(onGradeA).toHaveBeenCalledWith(0, "easy");
    expect(onGradeB).not.toHaveBeenCalled();
    expect(deckA.getState().index).toBe(0);
  });

  it("only navigates the deck whose container received ArrowRight", () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';
    const deckA = new FlashcardDeck("#a", CARDS);
    const deckB = new FlashcardDeck("#b", CARDS);
    const containerA = document.querySelector("#a") as HTMLElement;

    containerA.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(deckA.getState().index).toBe(1);
    expect(deckB.getState().index).toBe(0);
  });
});

describe("title screen (LIB-4.19, LIB-4.22)", () => {
  it("does not appear without title configuration", () => {
    const { container } = mount(CARDS);

    expect(container.querySelector(".fc-title")).toBeNull();
  });

  it("appears before the first card, showing only the configured text", () => {
    const { container } = mount(CARDS, { title: { text: "Welcome", subtitle: "Learn the basics" } });

    const title = container.querySelector(".fc-title");
    expect(title).not.toBeNull();
    expect(title!.querySelector(".fc-title-text")?.textContent).toBe("Welcome");
    expect(title!.querySelector(".fc-title-subtitle")?.textContent).toBe("Learn the basics");
  });

  it("renders title/subtitle as plain text, never parsed as markup", () => {
    const { container } = mount(CARDS, { title: { text: "<b>Hi</b>" } });

    const text = container.querySelector(".fc-title-text");
    expect(text?.textContent).toBe("<b>Hi</b>");
    expect(text?.querySelector("b")).toBeNull();
  });
});

describe("title screen is a pure overlay (LIB-4.20)", () => {
  it("leaves card indices, indicator counts, and getState identical whether or not it is configured", () => {
    const withTitle = mount(CARDS, { title: { text: "Welcome" } });
    const without = mount(CARDS);

    expect(withTitle.deck.getState()).toEqual(without.deck.getState());
    expect(withTitle.container.querySelectorAll(".fc-indicator-dot")).toHaveLength(
      without.container.querySelectorAll(".fc-indicator-dot").length,
    );
    expect(withTitle.container.querySelectorAll(".fc-card")).toHaveLength(
      without.container.querySelectorAll(".fc-card").length,
    );
  });

  it("takes identical goTo arguments to reach the same state with or without a title screen", () => {
    const withTitle = mount(CARDS, { title: { text: "Welcome" } });
    const without = mount(CARDS);

    withTitle.deck.goTo(2);
    without.deck.goTo(2);

    expect(withTitle.deck.getState()).toEqual(without.deck.getState());
  });
});

describe("title screen dismissal (LIB-4.21)", () => {
  it("dismisses on tap/click", () => {
    const { container } = mount(CARDS, { title: { text: "Welcome" } });
    const title = container.querySelector(".fc-title") as HTMLElement;

    title.dispatchEvent(new PointerEvent("click", { bubbles: true }));

    expect(container.querySelector(".fc-title")).toBeNull();
  });

  it("dismisses on Enter, without also flipping the current card", () => {
    const { deck, container } = mount(CARDS, { title: { text: "Welcome" } });

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(container.querySelector(".fc-title")).toBeNull();
    expect(deck.getState().side).toBe("front");
  });

  it("dismisses on Space, preventing page scroll, without also flipping", () => {
    const { deck, container } = mount(CARDS, { title: { text: "Welcome" } });
    const event = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    container.dispatchEvent(event);

    expect(container.querySelector(".fc-title")).toBeNull();
    expect(deck.getState().side).toBe("front");
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it("dismisses on ArrowRight, without also navigating", () => {
    const { deck, container } = mount(CARDS, { title: { text: "Welcome" } });

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(container.querySelector(".fc-title")).toBeNull();
    expect(deck.getState().index).toBe(0);
  });

  it("ignores unrelated keys while shown, leaving the deck untouched", () => {
    const { deck, container } = mount(CARDS, { title: { text: "Welcome" } });

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));

    expect(container.querySelector(".fc-title")).not.toBeNull();
    expect(deck.getState().index).toBe(0);
  });

  it("cannot reappear, and normal keyboard handling resumes right after dismissal", () => {
    const { deck, container } = mount(CARDS, { title: { text: "Welcome" } });

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); // dismisses only
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); // now flips normally

    expect(container.querySelector(".fc-title")).toBeNull();
    expect(deck.getState().side).toBe("back");
  });
});

describe("title screen holds no persistence (LIB-4.24)", () => {
  function throwingStorage(): Storage {
    return new Proxy(
      {},
      {
        get(): never {
          throw new Error("storage was accessed");
        },
        set(): never {
          throw new Error("storage was accessed");
        },
        has(): never {
          throw new Error("storage was accessed");
        },
      },
    ) as Storage;
  }

  it("never touches storage when no title is configured", () => {
    const originalLocal = window.localStorage;
    const originalSession = window.sessionStorage;
    Object.defineProperty(window, "localStorage", { value: throwingStorage(), configurable: true });
    Object.defineProperty(window, "sessionStorage", { value: throwingStorage(), configurable: true });

    try {
      expect(() => mount(CARDS)).not.toThrow();
    } finally {
      Object.defineProperty(window, "localStorage", { value: originalLocal, configurable: true });
      Object.defineProperty(window, "sessionStorage", { value: originalSession, configurable: true });
    }
  });

  it("never touches storage across a full title show/dismiss cycle either", () => {
    const originalLocal = window.localStorage;
    const originalSession = window.sessionStorage;
    Object.defineProperty(window, "localStorage", { value: throwingStorage(), configurable: true });
    Object.defineProperty(window, "sessionStorage", { value: throwingStorage(), configurable: true });

    try {
      expect(() => {
        const { container } = mount(CARDS, { title: { text: "Welcome" } });
        (container.querySelector(".fc-title") as HTMLElement).dispatchEvent(
          new PointerEvent("click", { bubbles: true }),
        );
      }).not.toThrow();
    } finally {
      Object.defineProperty(window, "localStorage", { value: originalLocal, configurable: true });
      Object.defineProperty(window, "sessionStorage", { value: originalSession, configurable: true });
    }
  });
});

function openInfoPanel(container: HTMLElement): {
  backdrop: HTMLElement;
  panel: HTMLElement;
  closeButton: HTMLButtonElement;
  infoButton: HTMLButtonElement;
} {
  const infoButton = container.querySelector(".fc-info") as HTMLButtonElement;
  infoButton.click();
  return {
    backdrop: container.querySelector(".fc-panel-backdrop") as HTMLElement,
    panel: container.querySelector(".fc-panel") as HTMLElement,
    closeButton: container.querySelector(".fc-panel-close") as HTMLButtonElement,
    infoButton,
  };
}

describe("info control (LIB-4.25)", () => {
  it("is present, labelled, and closed by default for every deck", () => {
    const { container } = mount(CARDS);
    const infoButton = container.querySelector(".fc-info") as HTMLButtonElement;

    expect(infoButton).not.toBeNull();
    expect(infoButton.getAttribute("aria-label")).toBeTruthy();
    expect(container.querySelector(".fc-panel-backdrop")?.hasAttribute("hidden")).toBe(true);
  });
});

describe("info panel open/close (LIB-4.26)", () => {
  it("opens on info button click and moves focus into the panel", () => {
    const { container } = mount(CARDS, { info: { heading: "About" } });

    const { backdrop, closeButton } = openInfoPanel(container);

    expect(backdrop.hasAttribute("hidden")).toBe(false);
    expect(document.activeElement).toBe(closeButton);
  });

  it("closes on Escape and returns focus to the info button", () => {
    const { container } = mount(CARDS);
    const { backdrop, infoButton } = openInfoPanel(container);

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(backdrop.hasAttribute("hidden")).toBe(true);
    expect(document.activeElement).toBe(infoButton);
  });

  it("closes on the close control and returns focus to the info button", () => {
    const { container } = mount(CARDS);
    const { backdrop, closeButton, infoButton } = openInfoPanel(container);

    closeButton.click();

    expect(backdrop.hasAttribute("hidden")).toBe(true);
    expect(document.activeElement).toBe(infoButton);
  });

  it("closes on a click landing on the backdrop itself and returns focus", () => {
    const { container } = mount(CARDS);
    const { backdrop, infoButton } = openInfoPanel(container);

    backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(backdrop.hasAttribute("hidden")).toBe(true);
    expect(document.activeElement).toBe(infoButton);
  });

  it("does not close on a click that lands on the panel's own content", () => {
    const { container } = mount(CARDS, { info: { heading: "About", body: "Some text" } });
    const { backdrop, panel } = openInfoPanel(container);

    panel.querySelector(".fc-panel-heading")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(backdrop.hasAttribute("hidden")).toBe(false);
  });
});

describe("info panel focus trap (LIB-8.8)", () => {
  it("pulls focus back into the panel on Tab if it had somehow left", () => {
    const { container } = mount(CARDS, { info: { heading: "About" } });
    const { closeButton } = openInfoPanel(container);
    const card = container.querySelector(".fc-card") as HTMLElement;
    card.focus();
    expect(document.activeElement).toBe(card);

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    container.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(closeButton);
  });

  it("wraps Shift+Tab from the panel's first focusable element back to its last, never leaving the panel", () => {
    const { container } = mount(CARDS, { info: { heading: "About" } });
    const { closeButton } = openInfoPanel(container);
    expect(document.activeElement).toBe(closeButton); // the close button is both first and last here

    const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    container.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(closeButton);
  });

  it("does not intercept Tab while the panel is closed", () => {
    const { container } = mount(CARDS);
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    container.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});

describe("info panel content (LIB-4.27, LIB-4.28, LIB-3.7)", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });
  });

  it("shows the application's info text alongside a library-generated interaction list", () => {
    const { container } = mount(CARDS, { info: { heading: "About this deck", body: "Some credits." } });
    const { panel } = openInfoPanel(container);

    expect(panel.querySelector(".fc-panel-heading")?.textContent).toBe("About this deck");
    expect(panel.querySelector(".fc-panel-body")?.textContent).toBe("Some credits.");
    expect(panel.querySelectorAll(".fc-panel-interactions li").length).toBeGreaterThan(0);
  });

  it("treats application info text as plain text, never markup", () => {
    const { container } = mount(CARDS, { info: { heading: "<b>Hi</b>" } });
    const { panel } = openInfoPanel(container);

    expect(panel.querySelector(".fc-panel-heading")?.textContent).toBe("<b>Hi</b>");
    expect(panel.querySelector(".fc-panel-heading b")).toBeNull();
  });

  it("still shows the interaction list with no info configuration at all", () => {
    const { container } = mount(CARDS);
    const { panel } = openInfoPanel(container);

    expect(panel.querySelectorAll(".fc-panel-interactions li").length).toBeGreaterThan(0);
  });

  it("describes desktop interactions when the device reports no touch support", () => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });
    const { container } = mount(CARDS);
    const { panel } = openInfoPanel(container);

    const items = Array.from(panel.querySelectorAll(".fc-panel-interactions li"), (li) => li.textContent ?? "");
    expect(items.some((text) => /swipe/i.test(text))).toBe(false);
    expect(items.some((text) => /click/i.test(text))).toBe(true);
  });

  it("describes touch interactions on a touch-capable device", () => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    const { container } = mount(CARDS);
    const { panel } = openInfoPanel(container);

    const items = Array.from(panel.querySelectorAll(".fc-panel-interactions li"), (li) => li.textContent ?? "");
    expect(items.some((text) => /swipe/i.test(text))).toBe(true);
    expect(items.some((text) => /click/i.test(text))).toBe(false);
  });
});

describe("onCardShown timing (LIB-6.8, LIB-6.9)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires once a card has been current and settled for >= 400ms, not before", () => {
    const onCardShown = vi.fn();
    mount(CARDS, { onCardShown });

    vi.advanceTimersByTime(399);
    expect(onCardShown).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onCardShown).toHaveBeenCalledExactlyOnceWith(0);
  });

  it("fires immediately on a flip before the 400ms settle timer elapses, instead of waiting", () => {
    const onCardShown = vi.fn();
    const { container } = mount(CARDS, { onCardShown });
    const card = cards(container)[0]!;

    vi.advanceTimersByTime(100);
    expect(onCardShown).not.toHaveBeenCalled();

    tap(card);
    expect(onCardShown).toHaveBeenCalledExactlyOnceWith(0);

    // The cancelled settle timer must not also fire later.
    vi.advanceTimersByTime(1000);
    expect(onCardShown).toHaveBeenCalledTimes(1);
  });

  it("does not fire for cards only passed through while swiping through many cards in under a second", () => {
    const cardCount = 10;
    const manyCards: Flashcard[] = Array.from({ length: cardCount }, (_, i) => ({
      front: { text: `${i}` },
      back: { text: `${i}` },
    }));
    const onCardShown = vi.fn();
    const { deck } = mount(manyCards, { onCardShown });

    for (let i = 1; i < cardCount; i++) {
      vi.advanceTimersByTime(90);
      deck.goTo(i);
    }

    // 9 * 90ms = 810ms total, under a second — but every navigation
    // restarted the settle timer before the previous card's could fire, so
    // nothing has settled yet.
    expect(onCardShown).not.toHaveBeenCalled();

    // The last card lands and is left alone long enough to settle.
    vi.advanceTimersByTime(400);
    expect(onCardShown).toHaveBeenCalledExactlyOnceWith(cardCount - 1);
  });

  it("never fires twice for the same card, even after navigating back to it", () => {
    const onCardShown = vi.fn();
    const { deck } = mount(CARDS, { onCardShown });

    vi.advanceTimersByTime(400);
    expect(onCardShown).toHaveBeenCalledExactlyOnceWith(0);

    onCardShown.mockClear();
    deck.goTo(1);
    vi.advanceTimersByTime(400);
    expect(onCardShown).toHaveBeenCalledExactlyOnceWith(1);

    onCardShown.mockClear();
    deck.goTo(0);
    vi.advanceTimersByTime(400);

    expect(onCardShown).not.toHaveBeenCalled();
  });

  it("does not fire at all for an empty deck", () => {
    const onCardShown = vi.fn();
    mount([], { onCardShown });

    vi.advanceTimersByTime(1000);

    expect(onCardShown).not.toHaveBeenCalled();
  });
});

describe("onFlip (LIB-6.10)", () => {
  it("fires on every flip with the side now visible", () => {
    const onFlip = vi.fn();
    const { container } = mount(CARDS, { onFlip });
    const card = cards(container)[0]!;

    tap(card);
    expect(onFlip).toHaveBeenNthCalledWith(1, 0, "back");

    tap(card);
    expect(onFlip).toHaveBeenNthCalledWith(2, 0, "front");
  });

  it("reports the card's own index, not always the first card", () => {
    const onFlip = vi.fn();
    const { deck, container } = mount(CARDS, { onFlip });

    deck.goTo(1);
    tap(cards(container)[1]!);

    expect(onFlip).toHaveBeenCalledExactlyOnceWith(1, "back");
  });

  it("fires on a keyboard flip too", () => {
    const onFlip = vi.fn();
    const { container } = mount(CARDS, { onFlip });

    container.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(onFlip).toHaveBeenCalledExactlyOnceWith(0, "back");
  });
});

describe("throwing callbacks do not break the deck (LIB-6.12)", () => {
  it("a throwing onFlip does not stop subsequent flips or navigation from working", () => {
    const onFlip = vi.fn(() => {
      throw new Error("boom");
    });
    const { deck, container } = mount(CARDS, { onFlip });
    const card = cards(container)[0]!;

    expect(() => tap(card)).not.toThrow();
    expect(deck.getState().side).toBe("back");

    expect(() => deck.goTo(1)).not.toThrow();
    expect(deck.getState().index).toBe(1);

    tap(cards(container)[1]!);
    expect(deck.getState().side).toBe("back");
    expect(onFlip).toHaveBeenCalledTimes(2);
  });

  it("a throwing onGrade does not stop the deck from continuing to grade", () => {
    const onGrade = vi.fn(() => {
      throw new Error("boom");
    });
    const { container } = mount(CARDS, { onGrade });
    const card = cards(container)[0]!;

    expect(() => card.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }))).not.toThrow();
    expect(() => card.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))).not.toThrow();

    expect(onGrade).toHaveBeenNthCalledWith(1, 0, "easy");
    expect(onGrade).toHaveBeenNthCalledWith(2, 0, "hard");
  });

  it("a throwing onCardShown does not stop later cards from being reported", () => {
    vi.useFakeTimers();
    try {
      const onCardShown = vi.fn(() => {
        throw new Error("boom");
      });
      const { deck } = mount(CARDS, { onCardShown });

      expect(() => vi.advanceTimersByTime(400)).not.toThrow();
      expect(onCardShown).toHaveBeenCalledExactlyOnceWith(0);

      onCardShown.mockClear();
      deck.goTo(1);
      expect(() => vi.advanceTimersByTime(400)).not.toThrow();
      expect(onCardShown).toHaveBeenCalledExactlyOnceWith(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

function throwingStorage(): Storage {
  return new Proxy(
    {},
    {
      get(): never {
        throw new Error("storage was accessed");
      },
      set(): never {
        throw new Error("storage was accessed");
      },
      has(): never {
        throw new Error("storage was accessed");
      },
    },
  ) as Storage;
}

describe("no storage access anywhere in the library (LIB-10.1, LIB-10.2)", () => {
  it("never touches localStorage or sessionStorage across construction, interaction, and destroy", () => {
    const originalLocal = window.localStorage;
    const originalSession = window.sessionStorage;
    Object.defineProperty(window, "localStorage", { value: throwingStorage(), configurable: true });
    Object.defineProperty(window, "sessionStorage", { value: throwingStorage(), configurable: true });

    try {
      expect(() => {
        document.body.innerHTML = '<div id="app"></div>';
        const container = document.querySelector("#app") as HTMLElement;
        const deck = new FlashcardDeck(container, CARDS, {
          title: { text: "Welcome" },
          info: { heading: "About", body: "Some credits." },
          onCardShown: () => {},
          onFlip: () => {},
          onGrade: () => {},
        });

        // Dismiss the title screen, flip and navigate, grade via keyboard,
        // open and close the info panel, and force a viewport resize —
        // every interactive path the library owns — before tearing down.
        (container.querySelector(".fc-title") as HTMLElement).dispatchEvent(
          new PointerEvent("click", { bubbles: true }),
        );

        const card = container.querySelector(".fc-card") as HTMLElement;
        tap(card);
        deck.goTo(1);
        card.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));

        (container.querySelector(".fc-info") as HTMLButtonElement).click();
        (container.querySelector(".fc-panel-close") as HTMLButtonElement).click();

        window.dispatchEvent(new Event("resize"));

        deck.destroy();
      }).not.toThrow();
    } finally {
      Object.defineProperty(window, "localStorage", { value: originalLocal, configurable: true });
      Object.defineProperty(window, "sessionStorage", { value: originalSession, configurable: true });
    }
  });
});

describe("public API surface lockdown (LIB-6.6, LIB-6.13)", () => {
  it("exports exactly FlashcardDeck at the module's runtime surface — type-only exports have no runtime footprint", async () => {
    const mod = await import("./index.js");

    expect(Object.keys(mod).sort()).toEqual(["FlashcardDeck"]);
  });

  it("exposes exactly goTo, getState, and destroy as public (non-underscore) prototype methods", () => {
    const publicMethods = Object.getOwnPropertyNames(FlashcardDeck.prototype).filter(
      (name) => name !== "constructor" && !name.startsWith("_"),
    );

    expect(publicMethods.sort()).toEqual(["destroy", "getState", "goTo"]);
  });

  it("never exposes a public (non-underscore) own property on a deck instance", () => {
    const { deck } = mount(CARDS);

    const publicOwnProperties = Object.keys(deck).filter((key) => !key.startsWith("_"));

    expect(publicOwnProperties).toEqual([]);
  });
});

describe("viewport sizing wiring (LIB-4.5, LIB-4.10, LIB-4.11, LIB-4.13)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("publishes --fc-card-w from the real viewport as soon as the deck is constructed", () => {
    const { container } = mount(CARDS);
    const root = container.querySelector(".fc-root") as HTMLElement;
    const expected = computeCardSize({ width: window.innerWidth, height: window.innerHeight }, resolveOptions());

    expect(root.style.getPropertyValue("--fc-card-w")).toBe(`${expected.width}px`);
  });

  it("recomputes --fc-card-w on a window resize, throttled to one recompute per animation frame", () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    const rafCallbacks: FrameRequestCallback[] = [];
    let nextFrameId = 1;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return nextFrameId++;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    try {
      const { container } = mount(CARDS);
      const root = container.querySelector(".fc-root") as HTMLElement;
      // Flush the constructor's own initial recompute before measuring.
      rafCallbacks.shift()?.(0);
      const setProperty = vi.spyOn(root.style, "setProperty");

      Object.defineProperty(window, "innerWidth", { configurable: true, value: 600 });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new Event("resize"));
      }

      // Five resize events, still only one *new* animation frame requested.
      expect(rafCallbacks).toHaveLength(1);

      rafCallbacks.shift()?.(0);

      const expected = computeCardSize({ width: 600, height: 900 }, resolveOptions());
      expect(setProperty).toHaveBeenCalledWith("--fc-card-w", `${expected.width}px`);
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
    }
  });

  it("stops recomputing after destroy() (LIB-6.5)", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    const { deck, container } = mount(CARDS);
    const root = container.querySelector(".fc-root") as HTMLElement;

    deck.destroy();

    expect(cancelAnimationFrame).toHaveBeenCalled();

    const setProperty = vi.spyOn(root.style, "setProperty");
    window.dispatchEvent(new Event("resize"));

    expect(setProperty).not.toHaveBeenCalledWith("--fc-card-w", expect.anything());
  });
});
