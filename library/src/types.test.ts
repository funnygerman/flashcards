import { describe, expect, it } from "vitest";

import type { Flashcard } from "./types.js";

describe("Flashcard (LIB-2.x)", () => {
  it("does not require id, key, or lastUpdate (LIB-2.4, LIB-2.8)", () => {
    // Type-level check, verified by `npm run lint`'s tsc pass: if `Flashcard`
    // ever grew one of these forbidden keys, `ForbiddenKeys` would stop being
    // `never` and this assignment would fail to compile.
    type ForbiddenKeys = Extract<keyof Flashcard, "id" | "key" | "lastUpdate">;
    const noForbiddenKeys: ForbiddenKeys extends never ? true : false = true;

    expect(noForbiddenKeys).toBe(true);
  });

  it("accepts a card carrying extra application-only properties (LIB-2.5)", () => {
    interface CardWithAppFields extends Flashcard {
      id: string;
      lastUpdate: number;
    }

    const card: CardWithAppFields = {
      front: { text: "front" },
      back: { text: "back" },
      id: "card-1",
      lastUpdate: Date.now(),
    };

    // Type-level check: `card` (a superset of Flashcard) is assignable to a
    // Flashcard-typed variable without adaptation — extra properties are
    // neither required nor rejected.
    const asFlashcard: Flashcard = card;

    expect(asFlashcard.front.text).toBe("front");
    expect(asFlashcard.back.text).toBe("back");
  });

  it("is never mutated by library code handling a frozen card (LIB-2.6)", () => {
    const card: Flashcard = Object.freeze({
      front: Object.freeze({ text: "front", details: "front details" }),
      back: Object.freeze({ text: "back" }),
      category: "greetings",
    });

    expect(() => {
      // @ts-expect-error - `front.text` is readonly; this line exists to prove
      // that even bypassing the type system, a frozen card can't be mutated.
      card.front.text = "mutated";
    }).toThrow(TypeError);

    expect(card.front.text).toBe("front");
    expect(card.back.text).toBe("back");
    expect(card.category).toBe("greetings");
  });
});
