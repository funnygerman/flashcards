import { describe, expect, it } from "vitest";

import { STYLES } from "./styles.js";

/** All class selectors in the stylesheet, e.g. ["fc-root", "fc-track", …].
 * The lookbehind-free pattern requires a letter right after the dot, which
 * excludes decimal fragments like the `75` in `0.75rem`. */
function classSelectorsIn(css: string): string[] {
  return Array.from(css.matchAll(/\.([a-zA-Z][\w-]*)/g), (m) => m[1] as string);
}

/** Custom-property declarations found in the `.fc-root { … }` block. */
function rootCustomProperties(css: string): Record<string, string> {
  const match = /\.fc-root\s*{([^}]*)}/.exec(css);
  if (!match) throw new Error("no .fc-root rule found");

  const props: Record<string, string> = {};
  for (const decl of match[1]!.matchAll(/(--fc-[\w-]+)\s*:\s*([^;]+);/g)) {
    props[decl[1]!] = decl[2]!.trim();
  }
  return props;
}

describe("stylesheet class names (LIB-7.9)", () => {
  it("prefixes every class selector with fc-", () => {
    const selectors = classSelectorsIn(STYLES);

    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector.startsWith("fc-")).toBe(true);
    }
  });
});

describe("stylesheet theming (LIB-4.32, LIB-4.33, LIB-4.34)", () => {
  it("defines --fc-accent, defaulted, on .fc-root", () => {
    const props = rootCustomProperties(STYLES);

    expect(props["--fc-accent"]).toBeDefined();
  });

  it("defines every colour it uses as a --fc-* custom property on .fc-root, and reads colours elsewhere only through var()", () => {
    const props = rootCustomProperties(STYLES);
    expect(Object.keys(props).length).toBeGreaterThan(0);

    // Every declared custom property's own value is a literal colour (not
    // itself a var() reference) — .fc-root is where colours are defined.
    // `.fc-root` also carries T-04's non-colour typography scale factors
    // (LIB-4.12), which this colour invariant doesn't apply to.
    const colorLiteral = /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\()/;
    const nonColorProperties = new Set(["--fc-text-scale", "--fc-details-scale"]);
    for (const [name, value] of Object.entries(props)) {
      if (name === "--fc-accent" || nonColorProperties.has(name)) continue; // --fc-accent may be overridden per-instance, but still has a literal default
      expect(colorLiteral.test(value)).toBe(true);
    }
    expect(colorLiteral.test(props["--fc-accent"]!)).toBe(true);

    // Outside the .fc-root declaration block, no rule may hard-code a colour
    // literal — only var(--fc-*) reads are allowed.
    const withoutRootBlock = STYLES.replace(/\.fc-root\s*{[^}]*}/, "");
    const hexOrFunctional = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g;
    expect(withoutRootBlock.match(hexOrFunctional)).toBeNull();
  });

  it("never sets prefers-color-scheme — theming is the application's job", () => {
    expect(STYLES).not.toMatch(/prefers-color-scheme/);
  });
});

describe("stylesheet sizing (LIB-7.10)", () => {
  it("fills .fc-root to 100% width and height", () => {
    const match = /\.fc-root\s*{([^}]*)}/.exec(STYLES);
    const body = match?.[1] ?? "";

    expect(body).toMatch(/width:\s*100%/);
    expect(body).toMatch(/height:\s*100%/);
  });

  it("never uses a viewport-relative unit anywhere in the stylesheet", () => {
    expect(STYLES).not.toMatch(/\bd?vh\b/);
    expect(STYLES).not.toMatch(/\bd?vw\b/);
  });
});

describe("stylesheet structure (LIB-9.6)", () => {
  it("positions chrome with logical properties, not left/right/top/bottom", () => {
    expect(STYLES).not.toMatch(/[^-](left|right|top|bottom)\s*:/);
  });
});

describe("card and track sizing (LIB-4.5, LIB-5.2)", () => {
  it("sizes .fc-card's block-size from --fc-card-h, not left to stretch to its flex container", () => {
    const match = /\.fc-card\s*{([^}]*)}/.exec(STYLES);
    expect(match?.[1]).toMatch(/block-size:\s*var\(--fc-card-h/);
  });

  it("clips .fc-viewport to a single card's width so neighbours are hidden until a drag reveals them", () => {
    const match = /\.fc-viewport\s*{([^}]*)}/.exec(STYLES);
    expect(match?.[1]).toMatch(/inline-size:\s*var\(--fc-card-w/);
    expect(match?.[1]).toMatch(/overflow:\s*hidden/);
  });

  it("never constrains .fc-track's own width, so the reel stays as wide as every card and .fc-viewport does the clipping", () => {
    const match = /\.fc-track\s*{([^}]*)}/.exec(STYLES);
    expect(match?.[1]).not.toMatch(/inline-size/);
    expect(match?.[1]).not.toMatch(/overflow/);
  });
});

describe("card content centering (LIB-4.29)", () => {
  it("centers face text both horizontally (text-align) and, via .fc-face-content, vertically", () => {
    const face = /\.fc-face\s*{([^}]*)}/.exec(STYLES);
    expect(face?.[1]).toMatch(/text-align:\s*center/);

    const content = /\.fc-face-content\s*{([^}]*)}/.exec(STYLES);
    expect(content?.[1]).toMatch(/display:\s*flex/);
    expect(content?.[1]).toMatch(/align-items:\s*center/);
    expect(content?.[1]).toMatch(/justify-content:\s*center/);
  });
});

describe("card text selection (LIB-5.16)", () => {
  it("disables user-select on .fc-card, so a mouse drag that falls through to the browser (LIB-5.16) doesn't paint the card as selected", () => {
    const match = /\.fc-card\s*{([^}]*)}/.exec(STYLES);
    expect(match?.[1]).toMatch(/user-select:\s*none/);
  });
});

describe("flip animation (LIB-4.35, LIB-4.36)", () => {
  it("animates .fc-face as a rotateY transform over 300ms", () => {
    const match = /\.fc-face\s*{([^}]*)}/.exec(STYLES);
    expect(match?.[1]).toMatch(/transform:\s*rotateY\(0deg\)/);
    expect(match?.[1]).toMatch(/transition:\s*transform\s+300ms/);
  });

  it("rotates .fc-card--flipped's faces past each other via rotateY", () => {
    expect(STYLES).toMatch(/\.fc-card--flipped \.fc-face--front\s*{[^}]*transform:\s*rotateY\(180deg\)/);
    expect(STYLES).toMatch(/\.fc-card--flipped \.fc-face--back\s*{[^}]*transform:\s*rotateY\(360deg\)/);
  });

  it("removes the flip and navigation transitions under prefers-reduced-motion: reduce", () => {
    const block = /@media \(prefers-reduced-motion:\s*reduce\)\s*{([\s\S]*?)}\s*}/.exec(STYLES)?.[1];
    expect(block).toBeDefined();
    expect(block).toMatch(/\.fc-face/);
    expect(block).toMatch(/\.fc-track--animate/);
    expect(block).toMatch(/transition:\s*none/);
  });
});
