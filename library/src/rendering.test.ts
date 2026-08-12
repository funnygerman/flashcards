import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveOptions } from "./config.js";
import { _renderCard, setPlainText } from "./rendering.js";
import { STYLES } from "./styles.js";
import type { Flashcard, ResolvedOptions } from "./types.js";

const OPTIONS: ResolvedOptions = resolveOptions();

describe("setPlainText (LIB-3.4, LIB-3.7)", () => {
  it("is a general-purpose plain-text setter, reusable outside card rendering (e.g. T-09's title/info)", () => {
    const el = document.createElement("div");

    setPlainText(el, "<img src=x onerror=alert(1)>");

    expect(el.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(el.querySelector("img")).toBeNull();
    expect(el.children).toHaveLength(0);
  });
});

describe("face content mapping (LIB-4.29, LIB-4.30)", () => {
  it("renders front.text/front.details and back.text/back.details independently", () => {
    const element = document.createElement("div");
    const card: Flashcard = {
      front: { text: "Q", details: "front hint" },
      back: { text: "A", details: "back hint" },
    };

    _renderCard(card, element, OPTIONS);

    expect(element.querySelector(".fc-face--front .fc-text")?.textContent).toBe("Q");
    expect(element.querySelector(".fc-face--front .fc-details")?.textContent).toBe("front hint");
    expect(element.querySelector(".fc-face--back .fc-text")?.textContent).toBe("A");
    expect(element.querySelector(".fc-face--back .fc-details")?.textContent).toBe("back hint");
  });

  it("omits the details paragraph entirely when details is not provided", () => {
    const element = document.createElement("div");
    const card: Flashcard = { front: { text: "Q" }, back: { text: "A" } };

    _renderCard(card, element, OPTIONS);

    expect(element.querySelector(".fc-face--front .fc-details")).toBeNull();
    expect(element.querySelector(".fc-face--back .fc-details")).toBeNull();
  });

  it("rebuilds rather than accumulating when called more than once on the same element", () => {
    const element = document.createElement("div");
    const card: Flashcard = { front: { text: "Q" }, back: { text: "A" } };

    _renderCard(card, element, OPTIONS);
    _renderCard(card, element, OPTIONS);

    expect(element.querySelectorAll(".fc-face--front")).toHaveLength(1);
    expect(element.querySelectorAll(".fc-text")).toHaveLength(2);
  });
});

describe("plain-text injection corpus (LIB-3.1–LIB-3.7)", () => {
  const payloads = [
    "less < than",
    "greater > than",
    "ampersand & sign",
    `quotes " and ' apostrophe`,
    "<img src=x onerror=alert(1)>",
    "<script>alert(1)</script>",
  ];

  it.each(payloads)("displays %j verbatim via textContent, creating no element from it", (payload) => {
    const element = document.createElement("div");
    const card: Flashcard = {
      front: { text: payload, details: payload },
      back: { text: payload },
      category: payload,
    };
    const options = resolveOptions({ showCategory: true });

    _renderCard(card, element, options);

    expect(element.querySelector(".fc-face--front .fc-text")?.textContent).toBe(payload);
    expect(element.querySelector(".fc-face--front .fc-details")?.textContent).toBe(payload);
    expect(element.querySelector(".fc-face--front .fc-category")?.textContent).toBe(payload);
    expect(element.querySelector(".fc-face--back .fc-text")?.textContent).toBe(payload);
    expect(element.querySelector("img")).toBeNull();
    expect(element.querySelector("script")).toBeNull();
  });

  it("preserves \\n so it can be shown as a visible line break, with no other formatting interpreted (LIB-3.6)", () => {
    const element = document.createElement("div");
    const card: Flashcard = { front: { text: "line one\nline two" }, back: { text: "b" } };

    _renderCard(card, element, OPTIONS);

    expect(element.querySelector(".fc-face--front .fc-text")?.textContent).toBe("line one\nline two");
  });

  it("declares white-space: pre-wrap for .fc-text and .fc-details in the stylesheet, and nothing else", () => {
    expect(STYLES).toMatch(/\.fc-text,\s*\n\.fc-details\s*{[^}]*white-space:\s*pre-wrap/);
  });
});

describe("category label (LIB-4.31)", () => {
  it("hides category by default (showCategory: false)", () => {
    const element = document.createElement("div");
    const card: Flashcard = { front: { text: "f" }, back: { text: "b" }, category: "Verbs" };

    _renderCard(card, element, OPTIONS);

    expect(element.querySelector(".fc-category")).toBeNull();
  });

  it("renders category as a small label on both faces when showCategory: true", () => {
    const element = document.createElement("div");
    const card: Flashcard = { front: { text: "f" }, back: { text: "b" }, category: "Verbs" };
    const options = resolveOptions({ showCategory: true });

    _renderCard(card, element, options);

    expect(element.querySelector(".fc-face--front .fc-category")?.textContent).toBe("Verbs");
    expect(element.querySelector(".fc-face--back .fc-category")?.textContent).toBe("Verbs");
  });

  it("renders no category label when the card has none, even with showCategory: true", () => {
    const element = document.createElement("div");
    const card: Flashcard = { front: { text: "f" }, back: { text: "b" } };
    const options = resolveOptions({ showCategory: true });

    _renderCard(card, element, options);

    expect(element.querySelector(".fc-category")).toBeNull();
  });
});

describe("typography sizing (LIB-4.11, LIB-4.12)", () => {
  it("sizes .fc-text and .fc-details from --fc-card-w and a configurable scale via calc(), never vw/vh", () => {
    expect(STYLES).toMatch(/\.fc-text\s*{[^}]*font-size:\s*calc\(var\(--fc-card-w\)\s*\*\s*var\(--fc-text-scale\)/);
    expect(STYLES).toMatch(
      /\.fc-details\s*{[^}]*font-size:\s*calc\(var\(--fc-card-w\)\s*\*\s*var\(--fc-details-scale\)/,
    );
    const fontDeclarations = STYLES.match(/font(-size)?\s*:[^;]*;/gi) ?? [];
    for (const declaration of fontDeclarations) {
      expect(declaration).not.toMatch(/\bvw\b|\bvh\b/);
    }
  });

  it("declares default scale factors matching LIB-4.12 on .fc-root, configurable via custom properties", () => {
    const rootBlock = /\.fc-root\s*{([^}]*)}/.exec(STYLES)?.[1] ?? "";
    expect(rootBlock).toMatch(/--fc-text-scale:\s*0\.085\s*;/);
    expect(rootBlock).toMatch(/--fc-details-scale:\s*0\.05\s*;/);
  });
});

describe("overflow shrink loop (LIB-4.14)", () => {
  const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");

  afterEach(() => {
    if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, "clientHeight", originalClientHeight);
  });

  it("shrinks in bounded steps and terminates at the 60% floor when content still overflows", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => 1000 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 100 });

    const element = document.createElement("div");
    const card: Flashcard = { front: { text: "long overflowing text" }, back: { text: "b" } };

    _renderCard(card, element, OPTIONS);

    const content = element.querySelector(".fc-face--front .fc-face-content") as HTMLElement;
    expect(content.style.getPropertyValue("--fc-shrink")).toBe("0.60");
  });

  it("never shrinks below the 60% floor no matter how much content overflows", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => 1_000_000 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 1 });

    const element = document.createElement("div");
    const card: Flashcard = { front: { text: "massively overflowing text" }, back: { text: "b" } };

    _renderCard(card, element, OPTIONS);

    const content = element.querySelector(".fc-face--front .fc-face-content") as HTMLElement;
    expect(Number(content.style.getPropertyValue("--fc-shrink"))).toBeGreaterThanOrEqual(0.6);
  });

  it("does not shrink when content already fits", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => 50 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 100 });

    const element = document.createElement("div");
    const card: Flashcard = { front: { text: "short" }, back: { text: "b" } };

    _renderCard(card, element, OPTIONS);

    const content = element.querySelector(".fc-face--front .fc-face-content") as HTMLElement;
    expect(content.style.getPropertyValue("--fc-shrink")).toBe("");
  });

  it("declares overflow-y: auto on .fc-face-content so unreachable clipping never happens beyond the floor", () => {
    expect(STYLES).toMatch(/\.fc-face-content\s*{[^}]*overflow-y:\s*auto/);
  });
});

describe("source scan for HTML construction (LIB-3.4)", () => {
  it("contains no innerHTML, outerHTML, insertAdjacentHTML, or document.write in any non-test source file", () => {
    const srcDir = join(import.meta.dirname, ".");
    const files = readdirSync(srcDir).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
    const offenders: string[] = [];

    for (const file of files) {
      const contents = readFileSync(join(srcDir, file), "utf8");
      if (/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(contents)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});
