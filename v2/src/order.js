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
 *
 * `lead` comes first and is *not* shuffled — cards whose order is the point,
 * ahead of cards whose order must not be (V2-3.3). A guide that taught the
 * swipe before the tap, or the stars before either, would not be a guide. It is
 * the only exception, and it is one because the shuffle exists to stop the
 * reader learning the deck's order along with its cards, which is a statement
 * about material being studied and not about four cards explaining the app.
 *
 * A lead does not simply sit in front of one ring that wraps end to end —
 * `lead` and `cards` are two separate rings, and the cursor is on exactly one
 * of them at a time. Splicing the lead onto the front of a single ring was
 * tried first: it wraps, so the *first* lead card's "previous" landed on the
 * deck's own last card, showing real material before the guide had said a
 * word — the very leak `lead` exists to prevent, arrived at from the other
 * direction. Two rings closes it: `previous` on a lead card can only ever
 * reach another lead card.
 *
 * The lead ring is left for the deck ring, permanently, the moment the reader
 * pages forward off its last card — completing it, not merely visiting it.
 * `previous` inside the lead wraps within the lead on its own, however many
 * times it is pressed, and once the deck ring is current there is no path
 * back to the lead: it has done its job for this mount and does not return
 * until the next one decides to deal it again (deck.js's own concern, not
 * this module's).
 */
export function createOrder(cards, random = Math.random, lead = []) {
  const deck = shuffle(cards, random);
  let ring = lead.length > 0 ? lead : deck;
  let index = 0;

  const step = (delta) => {
    /* Forward off the lead's last card is the one move that changes rings
       rather than wrapping within one — every other step, in either
       direction, is a plain wrapping cursor over whichever ring is current. */
    if (delta > 0 && ring === lead && index === ring.length - 1) {
      ring = deck;
      index = 0;
      return ring[index];
    }

    index = (index + delta + ring.length) % ring.length;
    return ring[index];
  };

  return {
    get size() {
      return ring.length;
    },
    current: () => ring[index],
    next: () => step(1),
    previous: () => step(-1),
  };
}
