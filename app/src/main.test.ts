import { describe, expect, it } from "vitest";

import { VERSION } from "@flashcards/library";

describe("app scaffold (T-00)", () => {
  it("resolves the library through the workspace link", () => {
    expect(VERSION).toBe("0.0.0");
  });
});
