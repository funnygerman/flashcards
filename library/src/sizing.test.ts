import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { _observeViewportSize, _sizeCard, computeCardSize } from "./sizing.js";
import type { SizingOptions } from "./sizing.js";

function baseOptions(aspectRatio: [number, number]): SizingOptions {
  return {
    aspectRatio,
    widthRatio: 0.9,
    portraitHeightRatio: 0.75,
    landscapeHeightRatio: 0.88,
    maxWidthPx: 480,
  };
}

const VIEWPORTS = {
  phonePortrait: { width: 390, height: 844 },
  phoneLandscape: { width: 812, height: 375 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
  square: { width: 300, height: 300 },
  degenerate: { width: 0, height: 0 },
} as const;

describe("computeCardSize formula (LIB-4.6, LIB-4.7)", () => {
  // Every value below is the formula from docs/library/requirements.md §4.2
  // applied by hand, so this table cross-checks the implementation against
  // the spec's arithmetic rather than against itself.
  const cases: Array<{
    viewportName: keyof typeof VIEWPORTS;
    aspectRatio: [number, number];
    expected: { width: number; height: number };
  }> = [
    { viewportName: "phonePortrait", aspectRatio: [4, 3], expected: { width: 351, height: 263 } },
    { viewportName: "phonePortrait", aspectRatio: [1, 1], expected: { width: 351, height: 351 } },
    { viewportName: "phonePortrait", aspectRatio: [3, 4], expected: { width: 351, height: 468 } },

    { viewportName: "phoneLandscape", aspectRatio: [4, 3], expected: { width: 440, height: 330 } },
    { viewportName: "phoneLandscape", aspectRatio: [1, 1], expected: { width: 330, height: 330 } },
    { viewportName: "phoneLandscape", aspectRatio: [3, 4], expected: { width: 247, height: 329 } },

    { viewportName: "tablet", aspectRatio: [4, 3], expected: { width: 480, height: 360 } },
    { viewportName: "tablet", aspectRatio: [1, 1], expected: { width: 480, height: 480 } },
    { viewportName: "tablet", aspectRatio: [3, 4], expected: { width: 480, height: 640 } },

    { viewportName: "desktop", aspectRatio: [4, 3], expected: { width: 480, height: 360 } },
    { viewportName: "desktop", aspectRatio: [1, 1], expected: { width: 480, height: 480 } },
    { viewportName: "desktop", aspectRatio: [3, 4], expected: { width: 480, height: 640 } },

    { viewportName: "square", aspectRatio: [4, 3], expected: { width: 270, height: 203 } },
    { viewportName: "square", aspectRatio: [1, 1], expected: { width: 264, height: 264 } },
    { viewportName: "square", aspectRatio: [3, 4], expected: { width: 198, height: 264 } },

    { viewportName: "degenerate", aspectRatio: [4, 3], expected: { width: 0, height: 0 } },
    { viewportName: "degenerate", aspectRatio: [1, 1], expected: { width: 0, height: 0 } },
    { viewportName: "degenerate", aspectRatio: [3, 4], expected: { width: 0, height: 0 } },
  ];

  it.each(cases)(
    "$viewportName × aspectRatio $aspectRatio sizes to $expected.width×$expected.height",
    ({ viewportName, aspectRatio, expected }) => {
      const size = computeCardSize(VIEWPORTS[viewportName], baseOptions(aspectRatio));
      expect(size).toEqual(expected);
    },
  );

  it("never returns a size that overflows the viewport (LIB-4.9)", () => {
    const aspectRatios: Array<[number, number]> = [
      [4, 3],
      [1, 1],
      [3, 4],
    ];

    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      for (const aspectRatio of aspectRatios) {
        const size = computeCardSize(viewport, baseOptions(aspectRatio));
        expect(size.width, `${viewportName} ${aspectRatio}`).toBeLessThanOrEqual(viewport.width);
        expect(size.height, `${viewportName} ${aspectRatio}`).toBeLessThanOrEqual(viewport.height);
      }
    }
  });

  it("caps width at maxWidthPx on a wide desktop viewport (LIB-4.7)", () => {
    const size = computeCardSize(VIEWPORTS.desktop, baseOptions([4, 3]));
    expect(size.width).toBe(480);
  });

  it("lets height drive the result on a short landscape phone, and still fits (LIB-4.9)", () => {
    const options = baseOptions([4, 3]);
    const size = computeCardSize(VIEWPORTS.phoneLandscape, options);

    // The height-derived limit (maxH * ar.w / ar.h) is what's binding here,
    // not the width ratio or the absolute cap.
    const maxH = VIEWPORTS.phoneLandscape.height * options.landscapeHeightRatio;
    expect(size.width).toBe(Math.floor((maxH * options.aspectRatio[0]) / options.aspectRatio[1]));
    expect(size.height).toBeLessThanOrEqual(VIEWPORTS.phoneLandscape.height);
  });

  it("applies landscape ratios at the vw === vh boundary (LIB-4.8)", () => {
    const options = baseOptions([1, 1]);
    const size = computeCardSize(VIEWPORTS.square, options);

    const landscapeWidth = Math.floor(VIEWPORTS.square.height * options.landscapeHeightRatio);
    const portraitWidth = Math.floor(VIEWPORTS.square.height * options.portraitHeightRatio);
    expect(size.width).toBe(landscapeWidth);
    expect(size.width).not.toBe(portraitWidth);
  });

  it("returns non-negative finite numbers for a 0×0 viewport without dividing by zero", () => {
    const size = computeCardSize(VIEWPORTS.degenerate, baseOptions([4, 3]));
    expect(Number.isFinite(size.width)).toBe(true);
    expect(Number.isFinite(size.height)).toBe(true);
    expect(size.width).toBeGreaterThanOrEqual(0);
    expect(size.height).toBeGreaterThanOrEqual(0);
  });

  it("clamps a negative viewport to 0×0 instead of producing a negative size", () => {
    const size = computeCardSize({ width: -100, height: -50 }, baseOptions([4, 3]));
    expect(size).toEqual({ width: 0, height: 0 });
  });
});

describe("_sizeCard applies the size to the DOM (LIB-4.11, LIB-4.13)", () => {
  it("publishes --fc-card-w in pixels on the container", () => {
    const container = document.createElement("div");
    const size = _sizeCard(container, baseOptions([4, 3]), VIEWPORTS.phonePortrait);

    expect(size).toEqual({ width: 351, height: 263 });
    expect(container.style.getPropertyValue("--fc-card-w")).toBe("351px");
  });

  it("never publishes a vw-based value", () => {
    const container = document.createElement("div");
    _sizeCard(container, baseOptions([1, 1]), VIEWPORTS.desktop);

    expect(container.style.getPropertyValue("--fc-card-w")).not.toContain("vw");
  });
});

describe("_observeViewportSize throttling (LIB-4.10)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("recomputes at most once per animation frame across a storm of resize events", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    let nextFrameId = 1;
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return nextFrameId++;
    });
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    const container = document.createElement("div");
    const setProperty = vi.spyOn(container.style, "setProperty");

    const observer = _observeViewportSize(container, () => baseOptions([4, 3]));

    // Construction schedules one initial recompute; flush it before the storm.
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    rafCallbacks.shift()?.(0);
    expect(setProperty).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 100; i++) {
      window.dispatchEvent(new Event("resize"));
    }

    // 100 events, still only one *new* animation frame requested.
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(setProperty).toHaveBeenCalledTimes(1);

    rafCallbacks.shift()?.(0);
    expect(setProperty).toHaveBeenCalledTimes(2);

    observer.dispose();
  });

  it("prefers window.visualViewport over window.innerWidth/innerHeight when available", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: { width: 500, height: 900, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    });

    try {
      const container = document.createElement("div");
      const size = _sizeCard(container, baseOptions([4, 3]));

      // window.innerWidth/innerHeight in jsdom default to 1024×768; if those
      // were used instead, this would not match the visualViewport-derived size.
      expect(size).toEqual(computeCardSize({ width: 500, height: 900 }, baseOptions([4, 3])));
    } finally {
      Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
    }
  });

  it("cleans up its listeners and any pending frame on dispose (LIB-6.5)", () => {
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 42));
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);

    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    const container = document.createElement("div");
    const observer = _observeViewportSize(container, () => baseOptions([4, 3]));
    observer.dispose();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
    expect(removeEventListener.mock.calls.length).toBeGreaterThanOrEqual(addEventListener.mock.calls.length);
  });
});

describe("stylesheet has no vw units in font declarations (LIB-4.13)", () => {
  it("scans every source file in library/src for a vw-based font declaration", () => {
    const srcDir = join(import.meta.dirname, ".");
    const files = readdirSync(srcDir).filter((name) => name.endsWith(".css") || name.endsWith(".ts"));
    const offenders: string[] = [];

    for (const file of files) {
      const contents = readFileSync(join(srcDir, file), "utf8");
      const fontDeclarations = contents.match(/font(-size)?\s*:[^;]*;/gi) ?? [];
      for (const declaration of fontDeclarations) {
        if (/\bvw\b/.test(declaration)) offenders.push(`${file}: ${declaration.trim()}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
