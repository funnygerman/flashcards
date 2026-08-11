import { describe, expect, it } from "vitest";

import { VERSION } from "./index.js";

describe("library scaffold (T-00)", () => {
  it("exports a version", () => {
    expect(VERSION).toBe("0.0.0");
  });

  it("runs in a DOM environment, which later tasks depend on", () => {
    const el = document.createElement("div");
    el.textContent = "<not html>";

    expect(el.textContent).toBe("<not html>");
    expect(el.children).toHaveLength(0);
  });
});
