import { describe, expect, it } from "vitest";

import { createDeck, shuffle } from "./deck.js";

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

describe("createDeck", () => {
  const cards = ["a", "b", "c"];
  const unshuffled = () => 0.999; /* j === i on every step: order is preserved */

  it("starts at the first card of the shuffled order", () => {
    const deck = createDeck(cards, unshuffled);

    expect(deck.current()).toBe("a");
    expect(deck.size).toBe(3);
  });

  it("wraps forward past the last card", () => {
    const deck = createDeck(cards, unshuffled);

    expect([deck.next(), deck.next(), deck.next()]).toEqual(["b", "c", "a"]);
  });

  it("wraps backward from the first card", () => {
    const deck = createDeck(cards, unshuffled);

    expect([deck.previous(), deck.previous()]).toEqual(["c", "b"]);
  });

  it("stays on the only card of a single-card deck", () => {
    const deck = createDeck(["only"], unshuffled);

    expect([deck.next(), deck.previous()]).toEqual(["only", "only"]);
  });
});
