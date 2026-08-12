import { describe, expect, it } from "vitest";

import { applyCardA11y, formatCardLabel, formatDotLabel, revealedSideText } from "./a11y.js";
import type { Flashcard } from "./types.js";

describe("formatCardLabel (LIB-8.2)", () => {
  it("formats a 0-based index as 'Card 3 of 42, front'", () => {
    expect(formatCardLabel(2, 42, "front")).toBe("Card 3 of 42, front");
  });

  it("reflects the back side", () => {
    expect(formatCardLabel(0, 5, "back")).toBe("Card 1 of 5, back");
  });
});

describe("formatDotLabel (LIB-8.4)", () => {
  it("formats a 0-based index as 'Go to card 4'", () => {
    expect(formatDotLabel(3)).toBe("Go to card 4");
  });
});

describe("applyCardA11y (LIB-8.2)", () => {
  it("sets role=button, an accessible label, and tabindex=0 for the current card", () => {
    const el = document.createElement("div");

    applyCardA11y(el, 2, 42, "front", true);

    expect(el.getAttribute("role")).toBe("button");
    expect(el.getAttribute("aria-label")).toBe("Card 3 of 42, front");
    expect(el.getAttribute("tabindex")).toBe("0");
  });

  it("sets tabindex=-1 for a card that is not current, keeping role and label accurate", () => {
    const el = document.createElement("div");

    applyCardA11y(el, 4, 42, "back", false);

    expect(el.getAttribute("role")).toBe("button");
    expect(el.getAttribute("aria-label")).toBe("Card 5 of 42, back");
    expect(el.getAttribute("tabindex")).toBe("-1");
  });
});

describe("revealedSideText (LIB-8.3)", () => {
  const CARD: Flashcard = { front: { text: "front text", details: "front details" }, back: { text: "back text" } };

  it("returns only the front's text, not its details", () => {
    expect(revealedSideText(CARD, "front")).toBe("front text");
  });

  it("returns only the back's text", () => {
    expect(revealedSideText(CARD, "back")).toBe("back text");
  });
});
