import { describe, expect, it } from "vitest";

import { isValidId, MAX_ID_LENGTH } from "./identifiers.mjs";

describe("isValidId (APP-3.4)", () => {
  it.each(["laufen-to-run", "capital-of-france", "a", "a1-b2", "everyday-german"])(
    "accepts %s",
    (id) => {
      expect(isValidId(id)).toBe(true);
    },
  );

  it.each([
    ["Bad_ID", "uppercase and underscore"],
    ["-leading-hyphen", "leading hyphen"],
    ["trailing-hyphen-", "trailing hyphen"],
    ["double--hyphen", "double hyphen"],
    ["with space", "space"],
    ["", "empty string"],
    ["a".repeat(MAX_ID_LENGTH + 1), "over the length limit"],
  ])("rejects %s (%s)", (id) => {
    expect(isValidId(id)).toBe(false);
  });

  it("accepts exactly the length limit", () => {
    expect(isValidId("a".repeat(MAX_ID_LENGTH))).toBe(true);
  });

  it("rejects non-string values", () => {
    expect(isValidId(undefined)).toBe(false);
    expect(isValidId(42)).toBe(false);
    expect(isValidId(null)).toBe(false);
  });
});
