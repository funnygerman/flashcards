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

  it("hands over to the deck at the end of it", () => {
    const order = createOrder(cards, () => 0, lead);

    order.next();
    expect(cards).toContain(order.next());
  });

  it("counts the lead as part of the sequence, and wraps around all of it", () => {
    const order = createOrder(cards, () => 0, lead);

    expect(order.size).toBe(5);

    /* Back from the first is the last, which is one of the deck's own cards
       rather than the guide: the lead is in front of everything, once. */
    expect(cards).toContain(order.previous());
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
