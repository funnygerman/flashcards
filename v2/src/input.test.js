import { afterEach, describe, expect, it } from "vitest";

import { SWIPE_THRESHOLD, bindInput, keyIntent, swipeIntent, track } from "./input.js";

/** jsdom has no PointerEvent; the handlers only read clientX/clientY/pointerId. */
function pointer(element, type, x, y) {
  element.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
}

/** As `pointer`, but carrying a `pointerId` — for telling two contacts apart. */
function pointerWithId(element, type, x, y, id) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, "pointerId", { value: id });
  element.dispatchEvent(event);
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

describe("track", () => {
  const far = SWIPE_THRESHOLD + 1;

  it("reads how far towards a swipe a drag has got", () => {
    expect(track(0, 0).progress).toBe(0);
    expect(track(0, -SWIPE_THRESHOLD / 2).progress).toBe(0.5);
    expect(track(0, -far).progress).toBe(1);
  });

  it("does not run past a whole swipe, however far the finger goes", () => {
    expect(track(0, -far * 10).progress).toBe(1);
  });

  /* The axis a drag is read on part-way through has to be the axis the release
     is read on, or the card fills its top edge and then pages sideways. */
  it("agrees with swipeIntent about which axis a drag is on", () => {
    for (const [dx, dy] of [
      [far, 0],
      [-far, 0],
      [0, far],
      [0, -far],
      [-far, far - 10],
      [far - 10, far],
    ]) {
      const { horizontal } = track(dx, dy);
      const sideways = ["next", "previous"].includes(swipeIntent(dx, dy));

      expect(horizontal).toBe(sideways);
    }
  });
});

describe("bindInput", () => {
  const bound = [];

  /* Attached to the document, because that is where the key handler lives. */
  const listen = () => {
    const element = document.createElement("div");
    document.body.append(element);

    const intents = [];
    const tracked = [];
    const unbind = bindInput(
      element,
      (intent) => intents.push(intent),
      (gesture) => tracked.push(gesture),
    );
    bound.push(() => {
      unbind();
      element.remove();
    });

    return { element, intents, tracked, unbind };
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

  /* The card follows the finger, so the drag has to be reported as it happens
     and not only when it is over. */
  it("reports a gesture in progress, and its end", () => {
    const { element, tracked } = listen();

    pointer(element, "pointerdown", 100, 100);
    pointer(element, "pointermove", 100, 80);
    pointer(element, "pointermove", 100, 60);
    pointer(element, "pointerup", 100, 60);

    expect(tracked.map((gesture) => gesture && [gesture.dy, gesture.horizontal, gesture.progress])).toEqual([
      [-20, false, 0.5],
      [-40, false, 1],
      null,
    ]);
  });

  it("reports the end of a gesture the browser took away", () => {
    const { element, tracked } = listen();

    pointer(element, "pointerdown", 100, 100);
    pointer(element, "pointermove", 100, 80);
    element.dispatchEvent(new MouseEvent("pointercancel", { bubbles: true }));

    expect(tracked.at(-1)).toBe(null);
  });

  it("does not report a move that belongs to no gesture", () => {
    const { element, tracked } = listen();

    pointer(element, "pointermove", 100, 80);

    expect(tracked).toEqual([]);
  });

  /* A second contact while one gesture is already tracked — a palm, a second
     finger — must not steal it: the first finger's own release has to still
     complete the gesture it started, rather than being read against a pointer
     it was never part of. */
  it("ignores a second pointerdown while a gesture is already in progress", () => {
    const { element, intents, tracked } = listen();

    pointerWithId(element, "pointerdown", 100, 100, 1);
    pointerWithId(element, "pointerdown", 5, 5, 2); // a second contact, elsewhere
    pointerWithId(element, "pointermove", 100 + SWIPE_THRESHOLD + 5, 100, 1);
    pointerWithId(element, "pointerup", 100 + SWIPE_THRESHOLD + 5, 100, 1);

    expect(tracked.filter(Boolean)).not.toEqual([]); // the first finger's drag was still followed
    expect(intents).toEqual(["previous"]); // and its release still completed the gesture
  });

  /* A page turn starts its slide from where the drag left the card, so the
     intent has to be reported while that offset is still known — clearing the
     drag first would make the card jump back to the middle for a frame and set
     off again from there. */
  it("reports the intent before it reports the drag as over", () => {
    const element = document.createElement("div");
    document.body.append(element);

    const order = [];
    const unbind = bindInput(
      element,
      (intent) => order.push(`intent:${intent}`),
      (gesture) => order.push(gesture ? "drag" : "released"),
    );
    bound.push(() => {
      unbind();
      element.remove();
    });

    pointer(element, "pointerdown", 100, 100);
    pointer(element, "pointermove", 40, 100);
    pointer(element, "pointerup", 40, 100);

    expect(order).toEqual(["drag", "intent:next", "released"]);
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
