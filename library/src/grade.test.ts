import { describe, expect, it } from "vitest";

import { gradeForDirection } from "./grade.js";

describe("gradeForDirection (LIB-5.8, LIB-5.21)", () => {
  it("maps up to easy", () => {
    expect(gradeForDirection("up")).toBe("easy");
  });

  it("maps down to hard", () => {
    expect(gradeForDirection("down")).toBe("hard");
  });
});
