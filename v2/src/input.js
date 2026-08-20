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
 * A drag of (dx, dy), read: which axis it is on, and how much of the threshold
 * it has covered — 0 at the start, 1 once it is a swipe rather than a tap.
 *
 * This is what a gesture *is*, part-way through and at the end alike, so both
 * the running feedback and the intent below are read off it rather than each
 * deciding separately what counts as horizontal (V2-9.3). The two disagreeing
 * would mean a card filling its top edge under the finger and then paging
 * sideways on release.
 */
export function track(dx, dy, threshold = SWIPE_THRESHOLD) {
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const distance = Math.abs(horizontal ? dx : dy);

  return { dx, dy, horizontal, progress: Math.min(1, distance / threshold) };
}

/**
 * What a drag of (dx, dy) means. The dominant axis wins, and anything shorter
 * than the threshold is a tap — which is why a plain click flips the card.
 */
export function swipeIntent(dx, dy, threshold = SWIPE_THRESHOLD) {
  const { horizontal, progress } = track(dx, dy, threshold);

  if (progress < 1) return "flip";
  if (horizontal) return dx > 0 ? "previous" : "next";
  return dy > 0 ? "harder" : "easier";
}

/**
 * Bind both input sources to `onIntent`. Returns the unbind function.
 *
 * Keys are bound to the document rather than to a focusable card: one page is
 * one deck, so there is nothing else they could be meant for, and nothing the
 * reader can click that takes the keyboard away from the deck.
 *
 * `onTrack` is the gesture as it happens — `track()` above on every move, and
 * `null` when the pointer is released or the gesture is cancelled. It is what
 * lets the card answer a finger before the finger has decided anything; a host
 * that does not want that leaves it out and gets the old release-only
 * behaviour. There is no keyboard equivalent, because a key press has no
 * part-way.
 */
export function bindInput(element, onIntent, onTrack) {
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
      /* A second contact while one gesture is already tracked — a palm, a
         second finger — is not a new gesture to switch to; it is noise
         alongside the one already in progress, which stays the reader's
         until it ends on its own. Without this, the second pointerdown
         silently overwrites `start`, and the first finger's own pointerup
         (a different id now) fails the id check below and is dropped instead
         of completing the gesture it started. */
      if (start) return;

      /* A right- or middle-click travels no distance, which would read as a
         tap and flip the card open under the context menu. */
      if (event.button > 0) return;

      start = { x: event.clientX, y: event.clientY, id: event.pointerId };

      /* Capturing means the release is reported here even when it happens
         outside the element, so a gesture cannot be left half-open and have
         its origin measured against somebody else's release. */
      if (typeof event.pointerId === "number") element.setPointerCapture?.(event.pointerId);
    },

    pointermove(event) {
      if (!start || event.pointerId !== start.id) return;

      onTrack?.(track(event.clientX - start.x, event.clientY - start.y));
    },

    pointerup(event) {
      if (!start || event.pointerId !== start.id) return;

      const { x, y } = start;
      start = null;

      /* The intent first, then the end of the drag: a page turn takes the
         card's dragged position with it as the place its slide starts from, and
         clearing that first would make the card jump back to the middle for a
         frame before setting off. */
      onIntent(swipeIntent(event.clientX - x, event.clientY - y));
      onTrack?.(null);
    },

    pointercancel() {
      start = null;
      onTrack?.(null);
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
