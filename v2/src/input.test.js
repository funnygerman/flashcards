import { afterEach, describe, expect, it } from "vitest";

import { SWIPE_THRESHOLD, bindInput, keyIntent, swipeIntent } from "./input.js";

/** jsdom has no PointerEvent; the handlers only read clientX/clientY/pointerId. */
function pointer(element, type, x, y) {
  element.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
}

describe("keyIntent", () => {
  it("maps the four arrows and the flip keys", () => {
    expect(["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", " ", "Enter"].map(keyIntent)).toEqual([
      "next",
      "previous",
      "harder",
      "easier",
      "flip",
      "flip",
    ]);
  });

  it("ignores anything else", () => {
    expect(keyIntent("a")).toBeUndefined();
  });
});

describe("swipeIntent", () => {
  const far = SWIPE_THRESHOLD + 1;

  it("maps a swipe to the same intent as the matching arrow key", () => {
    expect(swipeIntent(far, 0)).toBe("next"); /* left to right */
    expect(swipeIntent(-far, 0)).toBe("previous"); /* right to left */
    expect(swipeIntent(0, -far)).toBe("harder"); /* up */
    expect(swipeIntent(0, far)).toBe("easier"); /* down */
  });

  it("lets the dominant axis decide a diagonal", () => {
    expect(swipeIntent(far, far - 10)).toBe("next");
    expect(swipeIntent(far - 10, far)).toBe("easier");
  });

  it("treats anything under the threshold as a tap, which flips", () => {
    expect(swipeIntent(0, 0)).toBe("flip");
    expect(swipeIntent(SWIPE_THRESHOLD - 1, SWIPE_THRESHOLD - 1)).toBe("flip");
  });
});

describe("bindInput", () => {
  const bound = [];

  /* Attached to the document, because that is where the key handler lives. */
  const listen = () => {
    const element = document.createElement("div");
    document.body.append(element);

    const intents = [];
    const unbind = bindInput(element, (intent) => intents.push(intent));
    bound.push(() => {
      unbind();
      element.remove();
    });

    return { element, intents, unbind };
  };

  afterEach(() => {
    for (const dispose of bound.splice(0)) dispose();
  });

  it("reports keyboard intents", () => {
    const { element, intents } = listen();

    element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true }));

    expect(intents).toEqual(["next"]);
  });

  it("reports a drag as a swipe and a click as a flip", () => {
    const { element, intents } = listen();

    pointer(element, "pointerdown", 10, 10);
    pointer(element, "pointerup", 10 + SWIPE_THRESHOLD + 5, 12);

    pointer(element, "pointerdown", 50, 50);
    pointer(element, "pointerup", 52, 51);

    expect(intents).toEqual(["next", "flip"]);
  });

  it("ignores a right-click, which would otherwise read as a tap", () => {
    const { element, intents } = listen();

    element.dispatchEvent(new MouseEvent("pointerdown", { clientX: 5, clientY: 5, button: 2, bubbles: true }));
    element.dispatchEvent(new MouseEvent("pointerup", { clientX: 5, clientY: 5, button: 2, bubbles: true }));

    expect(intents).toEqual([]);
  });

  it("ignores a release with no press, and a cancelled gesture", () => {
    const { element, intents } = listen();

    pointer(element, "pointerup", 200, 0);

    pointer(element, "pointerdown", 0, 0);
    element.dispatchEvent(new MouseEvent("pointercancel", { bubbles: true }));
    pointer(element, "pointerup", 200, 0);

    expect(intents).toEqual([]);
  });

  it("stops reporting once unbound", () => {
    const { element, intents, unbind } = listen();

    unbind();
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));

    expect(intents).toEqual([]);
  });
});
