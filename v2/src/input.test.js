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
      "easier",
      "harder",
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
    expect(swipeIntent(-far, 0)).toBe("next"); /* right to left */
    expect(swipeIntent(far, 0)).toBe("previous"); /* left to right */
    expect(swipeIntent(0, -far)).toBe("easier"); /* up */
    expect(swipeIntent(0, far)).toBe("harder"); /* down */
  });

  it("lets the dominant axis decide a diagonal", () => {
    expect(swipeIntent(-far, far - 10)).toBe("next");
    expect(swipeIntent(far - 10, far)).toBe("harder");
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

  /* A deck page may carry a link out of the deck, and Enter on a focused link
     has to follow it. The key handler calls preventDefault(), so a guard that
     missed this would leave the reader flipping the card instead of going
     anywhere. */
  /** Press Enter on a fresh element, and report whether the deck swallowed it. */
  const pressEnterOn = (tag, href) => {
    const target = document.createElement(tag);
    if (href) target.setAttribute("href", href);
    document.body.append(target);

    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    target.remove();

    return event.defaultPrevented;
  };

  it("leaves a key alone when it is aimed at something else on the page", () => {
    const { intents } = listen();

    expect(pressEnterOn("input")).toBe(false);
    expect(pressEnterOn("textarea")).toBe(false);
    expect(pressEnterOn("select")).toBe(false);
    expect(pressEnterOn("button")).toBe(false);
    expect(pressEnterOn("a", "#next")).toBe(false);

    expect(intents).toEqual([]);
  });

  it("still takes a key aimed at anything that is not one of the reader's controls", () => {
    const { intents } = listen();

    /* An anchor with no href navigates nowhere and takes no focus, so it is not
       a control and the deck keeps the key. */
    expect(pressEnterOn("a")).toBe(true);
    expect(pressEnterOn("p")).toBe(true);

    expect(intents).toEqual(["flip", "flip"]);
  });

  /* A focused control only takes the keys that would press it. Taking every key
     would leave the deck silent to the arrows after the reader tapped the link
     and came back — browsers restore focus to the anchor — while the swipes
     went on working, with nothing on screen to explain it. */
  it("keeps the keys a focused control has no use for", () => {
    const { intents } = listen();

    const link = document.createElement("a");
    link.setAttribute("href", "#somewhere");
    document.body.append(link);

    for (const key of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"]) {
      link.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    }
    link.remove();

    expect(intents).toEqual(["next", "previous", "easier", "harder"]);
  });

  it("leaves a field's keys entirely alone, arrows included", () => {
    const { intents } = listen();

    const field = document.createElement("input");
    document.body.append(field);

    /* Unlike a control, a field uses the arrows itself — to move the caret. */
    for (const key of ["ArrowRight", "ArrowLeft", "Enter"]) {
      field.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    }
    field.remove();

    expect(intents).toEqual([]);
  });

  it("reports a drag as a swipe and a click as a flip", () => {
    const { element, intents } = listen();

    pointer(element, "pointerdown", 10 + SWIPE_THRESHOLD + 5, 10);
    pointer(element, "pointerup", 10, 12); /* right to left */

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
