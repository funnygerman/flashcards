/**
 * Keyboard and pointer input.
 *
 * Both sources produce the same four intents plus `flip`, so touch and keys
 * cannot drift apart: there is one vocabulary, mapped twice.
 */

const KEY_INTENTS = {
  ArrowRight: "next",
  ArrowLeft: "previous",
  ArrowUp: "harder",
  ArrowDown: "easier",
  " ": "flip",
  Enter: "flip",
};

/** Under this many pixels a pointer gesture is a tap, not a swipe. */
export const SWIPE_THRESHOLD = 40;

export function keyIntent(key) {
  return KEY_INTENTS[key];
}

/**
 * What a drag of (dx, dy) means. The dominant axis wins, and anything shorter
 * than the threshold is a tap — which is why a plain click flips the card.
 */
export function swipeIntent(dx, dy, threshold = SWIPE_THRESHOLD) {
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const distance = horizontal ? dx : dy;

  if (Math.abs(distance) < threshold) return "flip";
  if (horizontal) return dx > 0 ? "next" : "previous";
  return dy > 0 ? "easier" : "harder";
}

/** Bind both input sources to `onIntent`. Returns the unbind function. */
export function bindInput(element, onIntent) {
  let start = null;

  const handlers = {
    keydown(event) {
      const intent = keyIntent(event.key);
      if (!intent) return;

      event.preventDefault();
      onIntent(intent);
    },

    pointerdown(event) {
      start = { x: event.clientX, y: event.clientY, id: event.pointerId };
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

  for (const [type, handler] of Object.entries(handlers)) element.addEventListener(type, handler);

  return () => {
    for (const [type, handler] of Object.entries(handlers)) element.removeEventListener(type, handler);
  };
}
