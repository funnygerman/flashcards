/**
 * The order a deck is studied in, and where in it the reader is.
 *
 * Not the deck itself — that is deck.js, which is what a deck page calls. This
 * is one deck's sequence: shuffled once, then walked with a cursor that wraps.
 *
 * Pure: no DOM, no storage. `random` is a parameter so tests can pin the
 * shuffle instead of stubbing Math.random.
 */

/** Fisher-Yates on a copy — the caller's array is never reordered. */
export function shuffle(items, random = Math.random) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * A shuffled sequence with a cursor that wraps in both directions: past the
 * last card is the first one again, and back from the first is the last.
 */
export function createOrder(cards, random = Math.random) {
  const order = shuffle(cards, random);
  let index = 0;

  const step = (delta) => {
    index = (index + delta + order.length) % order.length;
    return order[index];
  };

  return {
    get size() {
      return order.length;
    },
    current: () => order[index],
    next: () => step(1),
    previous: () => step(-1),
  };
}
