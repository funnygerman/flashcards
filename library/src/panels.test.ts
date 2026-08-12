import { afterEach, describe, expect, it } from "vitest";

import {
  createInfoPanel,
  createTitleScreen,
  describeInteractions,
  detectTouchCapability,
  focusableElements,
} from "./panels.js";

describe("createTitleScreen (LIB-4.19, LIB-4.22)", () => {
  it("renders the configured text and subtitle", () => {
    const el = createTitleScreen({ text: "Welcome", subtitle: "Learn the basics" });

    expect(el.className).toBe("fc-title");
    expect(el.querySelector(".fc-title-text")?.textContent).toBe("Welcome");
    expect(el.querySelector(".fc-title-subtitle")?.textContent).toBe("Learn the basics");
  });

  it("omits the subtitle element entirely when none is configured", () => {
    const el = createTitleScreen({ text: "Welcome" });

    expect(el.querySelector(".fc-title-subtitle")).toBeNull();
  });

  it("renders text/subtitle as plain text, never parsed as markup (LIB-3.7)", () => {
    const el = createTitleScreen({ text: "<b>Hi</b>", subtitle: "<img src=x onerror=alert(1)>" });

    expect(el.querySelector(".fc-title-text")?.textContent).toBe("<b>Hi</b>");
    expect(el.querySelector(".fc-title-text b")).toBeNull();
    expect(el.querySelector(".fc-title-subtitle img")).toBeNull();
  });

  it("is a focusable, dismissible control", () => {
    const el = createTitleScreen({ text: "Welcome" });

    expect(el.getAttribute("role")).toBe("button");
    expect(el.tabIndex).toBe(0);
  });
});

describe("describeInteractions (LIB-4.27, LIB-4.28)", () => {
  it("describes nothing for an empty deck", () => {
    expect(describeInteractions({ touch: false, cardCount: 0 })).toEqual([]);
    expect(describeInteractions({ touch: true, cardCount: 0 })).toEqual([]);
  });

  it("omits navigation instructions for a single-card deck", () => {
    const desktop = describeInteractions({ touch: false, cardCount: 1 });
    const touch = describeInteractions({ touch: true, cardCount: 1 });

    expect(desktop.some((line) => /between cards/i.test(line))).toBe(false);
    expect(touch.some((line) => /between cards/i.test(line))).toBe(false);
  });

  it("includes navigation instructions once there is more than one card", () => {
    const desktop = describeInteractions({ touch: false, cardCount: 3 });
    const touch = describeInteractions({ touch: true, cardCount: 3 });

    expect(desktop.some((line) => /between cards/i.test(line))).toBe(true);
    expect(touch.some((line) => /between cards/i.test(line))).toBe(true);
  });

  it("differs between a touch-capable and a non-touch environment", () => {
    const desktop = describeInteractions({ touch: false, cardCount: 3 });
    const touch = describeInteractions({ touch: true, cardCount: 3 });

    expect(touch).not.toEqual(desktop);
    expect(touch.some((line) => /swipe/i.test(line))).toBe(true);
    expect(desktop.some((line) => /swipe/i.test(line))).toBe(false);
    expect(desktop.some((line) => /click|press/i.test(line))).toBe(true);
  });
});

describe("createInfoPanel (LIB-4.25-LIB-4.28)", () => {
  it("starts hidden", () => {
    const { backdrop } = createInfoPanel({}, { touch: false, cardCount: 3 });

    expect(backdrop.hidden).toBe(true);
  });

  it("is a labelled, focus-trappable dialog with a close control", () => {
    const { panel, closeButton } = createInfoPanel({}, { touch: false, cardCount: 3 });

    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(closeButton.getAttribute("aria-label")).toBeTruthy();
    expect(panel.contains(closeButton)).toBe(true);
  });

  it("omits the heading/body elements entirely when the application supplies none", () => {
    const { panel } = createInfoPanel({}, { touch: false, cardCount: 3 });

    expect(panel.querySelector(".fc-panel-heading")).toBeNull();
    expect(panel.querySelector(".fc-panel-body")).toBeNull();
  });

  it("renders application-supplied heading/body as plain text (LIB-3.7)", () => {
    const { panel } = createInfoPanel(
      { heading: "<b>About</b>", body: "<script>evil()</script>" },
      { touch: false, cardCount: 3 },
    );

    expect(panel.querySelector(".fc-panel-heading")?.textContent).toBe("<b>About</b>");
    expect(panel.querySelector(".fc-panel-heading b")).toBeNull();
    expect(panel.querySelector(".fc-panel-body")?.textContent).toBe("<script>evil()</script>");
    expect(panel.querySelector(".fc-panel-body script")).toBeNull();
  });

  it("always includes the library-generated interaction section for a non-empty deck", () => {
    const { panel } = createInfoPanel({}, { touch: false, cardCount: 3 });

    const items = panel.querySelectorAll(".fc-panel-interactions li");
    expect(items.length).toBeGreaterThan(0);
    expect(Array.from(items, (li) => li.textContent)).toEqual(describeInteractions({ touch: false, cardCount: 3 }));
  });

  it("omits the interaction section entirely for an empty deck", () => {
    const { panel } = createInfoPanel({}, { touch: false, cardCount: 0 });

    expect(panel.querySelector(".fc-panel-interactions")).toBeNull();
  });
});

describe("detectTouchCapability (LIB-4.28)", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });
  });

  it("is false when maxTouchPoints is 0", () => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });

    expect(detectTouchCapability()).toBe(false);
  });

  it("is true when navigator.maxTouchPoints > 0", () => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });

    expect(detectTouchCapability()).toBe(true);
  });
});

describe("focusableElements (LIB-8.8)", () => {
  it("finds real buttons but excludes disabled ones and tabindex=-1 elements", () => {
    const panel = document.createElement("div");
    panel.innerHTML =
      '<button id="a">A</button><button id="b" disabled>B</button><div id="c" tabindex="-1">C</div><a id="d" href="#">D</a>';

    const found = focusableElements(panel).map((el) => el.id);

    expect(found).toEqual(["a", "d"]);
  });

  it("returns an empty list when nothing inside is focusable", () => {
    const panel = document.createElement("div");
    panel.innerHTML = "<p>Just text.</p>";

    expect(focusableElements(panel)).toEqual([]);
  });
});
