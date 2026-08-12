import { describe, expect, it } from "vitest";

import { renderIndicators, resolveIndicatorMode } from "./indicators.js";

describe("resolveIndicatorMode (LIB-4.16, LIB-4.17, LIB-4.18)", () => {
  it("is 'empty' for zero cards", () => {
    expect(resolveIndicatorMode(0, 12)).toBe("empty");
  });

  it("is 'hidden' for exactly one card", () => {
    expect(resolveIndicatorMode(1, 12)).toBe("hidden");
  });

  it("is 'dots' at and below dotLimit", () => {
    expect(resolveIndicatorMode(2, 12)).toBe("dots");
    expect(resolveIndicatorMode(12, 12)).toBe("dots");
  });

  it("is 'counter' above dotLimit", () => {
    expect(resolveIndicatorMode(13, 12)).toBe("counter");
    expect(resolveIndicatorMode(42, 12)).toBe("counter");
  });

  it("respects a configured dotLimit", () => {
    expect(resolveIndicatorMode(5, 4)).toBe("counter");
    expect(resolveIndicatorMode(4, 4)).toBe("dots");
  });
});

describe("renderIndicators", () => {
  it("renders an empty-state message for zero cards", () => {
    const container = document.createElement("div");

    renderIndicators(container, 0, 0, 12);

    expect(container.children).toHaveLength(1);
    expect(container.querySelector(".fc-empty")).not.toBeNull();
    expect(container.textContent).not.toBe("");
  });

  it("renders nothing for a single card", () => {
    const container = document.createElement("div");

    renderIndicators(container, 1, 0, 12);

    expect(container.children).toHaveLength(0);
  });

  it("renders one dot per card and marks the current one active", () => {
    const container = document.createElement("div");

    renderIndicators(container, 3, 1, 12);

    const dots = container.querySelectorAll(".fc-indicator-dot");
    expect(dots).toHaveLength(3);
    expect(dots[1]!.classList.contains("fc-indicator-dot--active")).toBe(true);
    expect(dots[0]!.classList.contains("fc-indicator-dot--active")).toBe(false);
    expect(dots[2]!.classList.contains("fc-indicator-dot--active")).toBe(false);
  });

  it("renders a '3 / 42' style counter above dotLimit", () => {
    const container = document.createElement("div");

    renderIndicators(container, 42, 2, 12);

    expect(container.querySelectorAll(".fc-indicator-dot")).toHaveLength(0);
    const counter = container.querySelector(".fc-indicator-counter");
    expect(counter?.textContent).toBe("3 / 42");
  });

  it("replaces prior content rather than appending to it", () => {
    const container = document.createElement("div");

    renderIndicators(container, 3, 0, 12);
    renderIndicators(container, 42, 5, 12);

    expect(container.querySelectorAll(".fc-indicator-dot")).toHaveLength(0);
    expect(container.querySelectorAll(".fc-indicator-counter")).toHaveLength(1);
  });
});
