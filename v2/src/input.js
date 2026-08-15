/**
 * Keyboard and pointer input.
 *
 * Both sources produce the same four intents plus `flip`, so touch and keys
 * cannot drift apart: there is one vocabulary, mapped twice.
 */

const KEY_INTENTS = {
  ArrowRight: "next",
  ArrowLeft: "previous",
  ArrowUp: "easier",
  ArrowDown: "harder",
  " ": "flip",
  Enter: "flip",
};

/** Under this many pixels a pointer gesture is a tap, not a swipe. */
export const SWIPE_THRESHOLD = 40;

export function keyIntent(key) {
  return KEY_INTENTS[key];
}

/** The keys that press a control. Only these are worth taking from the deck. */
const ACTIVATION_KEYS = new Set(["Enter", " "]);

/** Keys belong to the deck unless the reader is typing into something. */
function isTyping(target) {
  const tag = target?.tagName;
  return Boolean(target?.isContentEditable) || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * A control the reader has focused — a link that goes somewhere, a button.
 *
 * It only takes the keys that would press it. A deck page may carry a link out
 * of the deck (§13), and `Enter` on that focused link has to follow it, since
 * `keydown` below calls preventDefault(); but the arrows mean nothing to a link
 * and everything to the deck, so they stay the deck's. Taking every key here
 * instead would leave the reader unable to page or grade after tapping the link
 * and pressing Back — browsers restore focus to the anchor — with the swipes
 * still working and nothing on screen to explain the silence.
 */
function isControl(target) {
  const tag = target?.tagName;
  return tag === "BUTTON" || (tag === "A" && Boolean(target.hasAttribute?.("href")));
}

/**
 * What a drag of (dx, dy) means. The dominant axis wins, and anything shorter
 * than the threshold is a tap — which is why a plain click flips the card.
 */
export function swipeIntent(dx, dy, threshold = SWIPE_THRESHOLD) {
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const distance = horizontal ? dx : dy;

  if (Math.abs(distance) < threshold) return "flip";
  if (horizontal) return dx > 0 ? "previous" : "next";
  return dy > 0 ? "harder" : "easier";
}

/**
 * Bind both input sources to `onIntent`. Returns the unbind function.
 *
 * Keys are bound to the document rather than to a focusable card: one page is
 * one deck, so there is nothing else they could be meant for, and nothing the
 * reader can click that takes the keyboard away from the deck.
 */
export function bindInput(element, onIntent) {
  let start = null;

  const keys = {
    keydown(event) {
      const intent = keyIntent(event.key);
      if (!intent || isTyping(event.target)) return;
      if (isControl(event.target) && ACTIVATION_KEYS.has(event.key)) return;

      event.preventDefault();
      onIntent(intent);
    },
  };

  const gestures = {
    pointerdown(event) {
      /* A right- or middle-click travels no distance, which would read as a
         tap and flip the card open under the context menu. */
      if (event.button > 0) return;

      start = { x: event.clientX, y: event.clientY, id: event.pointerId };

      /* Capturing means the release is reported here even when it happens
         outside the element, so a gesture cannot be left half-open and have
         its origin measured against somebody else's release. */
      if (typeof event.pointerId === "number") element.setPointerCapture?.(event.pointerId);
    },

    pointerup(event) {
      if (!start || event.pointerId !== start.id) return;

      const { x, y } = start;
      start = null;
      onIntent(swipeIntent(event.clientX - x, event.clientY - y));
    },

    pointercancel() {
      start = null;
    },
  };

  const bound = [
    [element.ownerDocument, keys],
    [element, gestures],
  ];

  const each = (method) => {
    for (const [target, handlers] of bound) {
      for (const [type, handler] of Object.entries(handlers)) target[method](type, handler);
    }
  };

  each("addEventListener");
  return () => each("removeEventListener");
}
