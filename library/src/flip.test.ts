import { describe, expect, it } from "vitest";

import { shouldCommitFlip } from "./flip.js";

// LIB-5.13, LIB-5.15: table-tested either side of each boundary.
const CASES: ReadonlyArray<
  [name: string, input: { distance: number; duration: number; selectionCollapsed: boolean }, expected: boolean]
> = [
  ["distance just under the 8px threshold", { distance: 7.9, duration: 0, selectionCollapsed: true }, true],
  ["distance just over the 8px threshold", { distance: 8.1, duration: 0, selectionCollapsed: true }, false],
  ["distance exactly at the 8px threshold (strict <, not <=)", { distance: 8, duration: 0, selectionCollapsed: true }, false],
  ["duration just under the 500ms threshold", { distance: 0, duration: 499, selectionCollapsed: true }, true],
  ["duration just over the 500ms threshold", { distance: 0, duration: 501, selectionCollapsed: true }, false],
  ["duration exactly at the 500ms threshold (strict <, not <=)", { distance: 0, duration: 500, selectionCollapsed: true }, false],
  ["selection collapsed", { distance: 0, duration: 0, selectionCollapsed: true }, true],
  ["selection not collapsed (e.g. a drag-to-select or long-press selection)", { distance: 0, duration: 0, selectionCollapsed: false }, false],
  ["all three fail at once", { distance: 50, duration: 900, selectionCollapsed: false }, false],
];

describe("shouldCommitFlip (LIB-5.13, LIB-5.15)", () => {
  it.each(CASES)("%s", (_name, input, expected) => {
    expect(shouldCommitFlip(input)).toBe(expected);
  });
});
