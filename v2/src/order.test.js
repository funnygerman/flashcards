import { describe, expect, it } from "vitest";

import { createOrder, shuffle } from "./order.js";

/** A random() that walks a fixed list, so a shuffle has one expected outcome. */
const sequence = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("shuffle", () => {
  it("uses the injected random and leaves the input untouched", () => {
    const input = ["a", "b", "c"];

    /* Fisher-Yates from the end: j = 0 swaps c with a, then j = 0 swaps b with c. */
    expect(shuffle(input, sequence([0, 0]))).toEqual(["b", "c", "a"]);
    expect(input).toEqual(["a", "b", "c"]);
  });

  it("keeps every card exactly once", () => {
    const input = Array.from({ length: 20 }, (_, i) => i);

    expect([...shuffle(input)].sort((a, b) => a - b)).toEqual(input);
  });
});

describe("createOrder with a lead", () => {
  const lead = [{ id: "guide 1" }, { id: "guide 2" }];
  const cards = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("puts the lead first, in the order it was given", () => {
    const order = createOrder(cards, () => 0, lead);

    expect(order.current()).toBe(lead[0]);
    expect(order.next()).toBe(lead[1]);
  });

  it("hands over to the deck the moment the lead is completed forward", () => {
    const order = createOrder(cards, () => 0, lead);

    order.next(); /* guide 1 -> guide 2 */
    expect(cards).toContain(order.next()); /* guide 2 -> the deck's first card */
  });

  /* The lead is its own ring, not the front of one ring that wraps end to
     end: splicing it onto the deck was tried first, and it meant "previous"
     on the very first lead card landed on the deck's own last card — real
     material shown before the guide had said anything, the leak `lead`
     exists to prevent, arrived at from the other direction. */
  it("wraps within the lead on its own — previous never reaches the deck", () => {
    const order = createOrder(cards, () => 0, lead);

    expect(order.previous()).toBe(lead[1]); /* guide 1 -> wraps to guide 2, not "c" */
    expect(order.previous()).toBe(lead[0]);
    expect(order.previous()).toBe(lead[1]); /* keeps wrapping, however many times */
  });

  it("still wraps within the lead after visiting and returning from it", () => {
    const order = createOrder(cards, () => 0, lead);

    order.next(); /* guide 1 -> guide 2 */
    order.previous(); /* guide 2 -> guide 1: visited, not completed */

    expect(order.previous()).toBe(lead[1]); /* still guide-only */
  });

  it("does not go back to the lead once the deck has taken over", () => {
    const order = createOrder(cards, () => 0, lead);

    order.next(); /* guide 1 -> guide 2 */
    order.next(); /* guide 2 -> deck, completed */

    expect(lead).not.toContain(order.previous());
    expect(lead).not.toContain(order.previous());
  });

  it("wraps the deck on its own once the lead has handed over", () => {
    /* An identity shuffle, so the deck ring is `cards` in the order given —
       see "starts at the first card of the shuffled order" below for why
       0.999 does that. */
    const order = createOrder(cards, () => 0.999, lead);

    order.next();
    order.next(); /* into the deck, at its first card */

    /* Previous from the deck's own first card wraps within the deck, to the
       deck's own last card — not back into the lead. */
    expect(order.previous()).toBe(cards.at(-1));
  });

  it("reports the size of whichever ring is current", () => {
    const order = createOrder(cards, () => 0, lead);

    expect(order.size).toBe(lead.length);

    order.next();
    order.next(); /* completes the lead */
    expect(order.size).toBe(cards.length);
  });

  it("is the deck outright with no lead at all", () => {
    const order = createOrder(cards, () => 0, []);

    expect(cards).toContain(order.current());
    expect(order.size).toBe(cards.length);
  });
});

describe("createOrder", () => {
  const cards = ["a", "b", "c"];
  const unshuffled = () => 0.999; /* j === i on every step: order is preserved */

  it("starts at the first card of the shuffled order", () => {
    const order = createOrder(cards, unshuffled);

    expect(order.current()).toBe("a");
    expect(order.size).toBe(3);
  });

  it("wraps forward past the last card", () => {
    const order = createOrder(cards, unshuffled);

    expect([order.next(), order.next(), order.next()]).toEqual(["b", "c", "a"]);
  });

  it("wraps backward from the first card", () => {
    const order = createOrder(cards, unshuffled);

    expect([order.previous(), order.previous()]).toEqual(["c", "b"]);
  });

  it("stays on the only card of a single-card deck", () => {
    const order = createOrder(["only"], unshuffled);

    expect([order.next(), order.previous()]).toEqual(["only", "only"]);
  });
});
