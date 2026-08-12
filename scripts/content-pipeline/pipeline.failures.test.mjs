import { readdir, rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { ContentBuildError } from "./errors.mjs";
import { buildContent } from "./pipeline.mjs";
import { fixtureContentDir, makeOutDir } from "./test-utils.mjs";

const outDirs = [];

afterEach(async () => {
  await Promise.all(outDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function expectBuildFails(fixture) {
  const outDir = await makeOutDir();
  outDirs.push(outDir);
  await rm(outDir, { recursive: true, force: true }); // the pipeline must create it itself, or not at all

  let error;
  try {
    await buildContent({ contentDir: fixtureContentDir(fixture), outDir });
  } catch (err) {
    error = err;
  }

  expect(error).toBeInstanceOf(ContentBuildError);
  expect(error.issues.length).toBeGreaterThan(0);

  // AC9: no output files written on any validation failure.
  const written = await readdir(outDir).catch((err) => {
    if (err.code === "ENOENT") return [];
    throw err;
  });
  expect(written).toEqual([]);

  return error;
}

describe("validation failures (APP-3.6) — non-zero exit, zero output files", () => {
  it("fails on a malformed identifier and names the file and identifier (AC4)", async () => {
    const error = await expectBuildFails("invalid-id-format");
    expect(error.issues.some((issue) => issue.includes("cards.csv") && issue.includes("Bad_ID"))).toBe(true);
  });

  it("fails on an identifier over 64 characters and names the file and identifier (AC4)", async () => {
    const error = await expectBuildFails("id-too-long");
    expect(error.issues.some((issue) => issue.includes("cards.csv") && issue.includes("aaaa"))).toBe(true);
  });

  it("fails on a duplicate identifier across two different formats and names both sources (AC5)", async () => {
    const error = await expectBuildFails("duplicate-id-cross-format");
    const issue = error.issues.find((i) => i.includes("duplicate") && i.includes("shared-id"));
    expect(issue).toBeDefined();
    expect(issue).toContain("cards.csv");
    expect(issue).toContain("shared-id.json");
  });

  it("fails on a deck referencing an unknown identifier and names the deck and the reference (AC6)", async () => {
    const error = await expectBuildFails("dangling-deck-reference");
    const issue = error.issues.find((i) => i.includes("missing-card"));
    expect(issue).toBeDefined();
    expect(issue).toContain("deck.json");
    expect(issue).toContain("deck");
  });

  it("fails when a per-card file's name disagrees with its id field (AC7)", async () => {
    const error = await expectBuildFails("filename-id-mismatch");
    const issue = error.issues.find((i) => i.includes("foo.json"));
    expect(issue).toBeDefined();
    expect(issue).toContain("foo");
    expect(issue).toContain("bar");
  });
});
