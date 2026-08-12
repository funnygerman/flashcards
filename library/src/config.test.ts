import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveOptions } from "./config.js";
import type { DeckOptions } from "./types.js";

describe("resolveOptions defaults (LIB-4.7, LIB-4.12, LIB-4.16, LIB-5.5, LIB-5.6, LIB-5.11)", () => {
  it("fills in every documented default when given no options", () => {
    expect(resolveOptions()).toEqual({
      aspectRatio: [4, 3],
      widthRatio: 0.75,
      portraitHeightRatio: 0.75,
      landscapeHeightRatio: 0.88,
      maxWidthPx: 900,
      textScale: 0.085,
      detailsScale: 0.05,
      dotLimit: 12,
      showCategory: false,
      friction: 0.35,
      swipeThreshold: 0.18,
      gradeThreshold: 0.15,
      injectStyles: true,
    });
  });

  it("fills in every documented default when given an empty object", () => {
    expect(resolveOptions({})).toEqual(resolveOptions());
  });

  it("has no accentColor, title, info, or callbacks when none are supplied", () => {
    const resolved = resolveOptions();

    expect(resolved.accentColor).toBeUndefined();
    expect(resolved.title).toBeUndefined();
    expect(resolved.info).toBeUndefined();
    expect(resolved.onCardShown).toBeUndefined();
    expect(resolved.onFlip).toBeUndefined();
    expect(resolved.onGrade).toBeUndefined();
  });
});

describe("resolveOptions valid overrides", () => {
  it("keeps every explicitly supplied valid value", () => {
    const onCardShown = (): void => undefined;
    const onFlip = (): void => undefined;
    const onGrade = (): void => undefined;

    const resolved = resolveOptions({
      accentColor: "#ff0000",
      aspectRatio: [1, 1],
      widthRatio: 0.5,
      portraitHeightRatio: 0.6,
      landscapeHeightRatio: 0.7,
      maxWidthPx: 320,
      textScale: 0.1,
      detailsScale: 0.06,
      dotLimit: 5,
      showCategory: true,
      friction: 0.5,
      swipeThreshold: 0.2,
      gradeThreshold: 0.25,
      injectStyles: false,
      title: { text: "Welcome" },
      info: { heading: "About" },
      onCardShown,
      onFlip,
      onGrade,
    });

    expect(resolved).toEqual({
      accentColor: "#ff0000",
      aspectRatio: [1, 1],
      widthRatio: 0.5,
      portraitHeightRatio: 0.6,
      landscapeHeightRatio: 0.7,
      maxWidthPx: 320,
      textScale: 0.1,
      detailsScale: 0.06,
      dotLimit: 5,
      showCategory: true,
      friction: 0.5,
      swipeThreshold: 0.2,
      gradeThreshold: 0.25,
      injectStyles: false,
      title: { text: "Welcome" },
      info: { heading: "About" },
      onCardShown,
      onFlip,
      onGrade,
    });
  });
});

describe("resolveOptions invalid input (LIB-6.15)", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  const cases: Array<{ name: string; input: DeckOptions; field: keyof DeckOptions; expected: unknown }> = [
    { name: "aspectRatio with a zero dimension", input: { aspectRatio: [0, 0] }, field: "aspectRatio", expected: [4, 3] },
    { name: "aspectRatio with too few elements", input: { aspectRatio: [4] as unknown as [number, number] }, field: "aspectRatio", expected: [4, 3] },
    { name: "negative dotLimit", input: { dotLimit: -1 }, field: "dotLimit", expected: 12 },
    { name: "non-integer dotLimit", input: { dotLimit: 3.5 }, field: "dotLimit", expected: 12 },
    { name: "friction of the wrong type", input: { friction: "x" as unknown as number }, field: "friction", expected: 0.35 },
    { name: "zero maxWidthPx", input: { maxWidthPx: 0 }, field: "maxWidthPx", expected: 900 },
    { name: "negative widthRatio", input: { widthRatio: -0.5 }, field: "widthRatio", expected: 0.75 },
    { name: "NaN textScale", input: { textScale: Number.NaN }, field: "textScale", expected: 0.085 },
    { name: "showCategory of the wrong type", input: { showCategory: "yes" as unknown as boolean }, field: "showCategory", expected: false },
    { name: "injectStyles of the wrong type", input: { injectStyles: 1 as unknown as boolean }, field: "injectStyles", expected: true },
    { name: "empty-string accentColor", input: { accentColor: "" }, field: "accentColor", expected: undefined },
  ];

  it.each(cases)("falls back to the default for $name, warning once, without throwing", ({ input, field, expected }) => {
    let resolved: ReturnType<typeof resolveOptions> | undefined;

    expect(() => {
      resolved = resolveOptions(input);
    }).not.toThrow();

    expect(resolved).toBeDefined();
    expect(resolved?.[field]).toEqual(expected);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("@flashcards/library package (LIB-9.5)", () => {
  it("declares no runtime dependencies", () => {
    const packageJsonPath = join(import.meta.dirname, "../package.json");
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { dependencies?: Record<string, string> };

    expect(pkg.dependencies ?? {}).toEqual({});
  });
});
