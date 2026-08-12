import { describe, expect, it } from "vitest";

import { parseCsv, parseCsvRecords } from "./csv.mjs";

describe("parseCsv", () => {
  it("splits simple comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles a missing trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("supports quoted fields containing commas", () => {
    expect(parseCsv('a,b\n"1, one",2\n')).toEqual([
      ["a", "b"],
      ["1, one", "2"],
    ]);
  });

  it("supports escaped quotes inside quoted fields", () => {
    expect(parseCsv('a\n"she said ""hi"""\n')).toEqual([["a"], ['she said "hi"']]);
  });

  it("supports quoted fields containing newlines", () => {
    expect(parseCsv('a\n"line one\nline two"\n')).toEqual([["a"], ["line one\nline two"]]);
  });

  it("ignores blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvRecords", () => {
  it("maps rows to header-keyed objects", () => {
    const records = parseCsvRecords("id,front_text\napfel-apple,Apfel\n");
    expect(records).toEqual([{ id: "apfel-apple", front_text: "Apfel" }]);
  });

  it("fills missing trailing cells with an empty string", () => {
    const records = parseCsvRecords("id,front_text,category\napfel-apple,Apfel\n");
    expect(records).toEqual([{ id: "apfel-apple", front_text: "Apfel", category: "" }]);
  });

  it("returns an empty array for an empty file", () => {
    expect(parseCsvRecords("")).toEqual([]);
  });
});
