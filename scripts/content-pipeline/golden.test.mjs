import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildContent } from "./pipeline.mjs";
import { fixtureContentDir, makeOutDir } from "./test-utils.mjs";

let outDir;

afterEach(async () => {
  if (outDir) await rm(outDir, { recursive: true, force: true });
});

describe("emitted JSON shape (golden file, APP-6.6)", () => {
  it("pins data/cards.json exactly", async () => {
    outDir = await makeOutDir();
    await buildContent({ contentDir: fixtureContentDir("golden"), outDir });

    const cards = JSON.parse(await readFile(join(outDir, "cards.json"), "utf8"));

    expect(cards).toEqual([
      {
        id: "apfel-apple",
        front: { text: "Apfel", details: "a red one" },
        back: { text: "apple" },
        category: "noun",
      },
      {
        id: "laufen-to-run",
        front: { text: "laufen" },
        back: { text: "to run" },
        category: "verb",
      },
    ]);
  });

  it("pins data/decks/<id>.json exactly", async () => {
    outDir = await makeOutDir();
    await buildContent({ contentDir: fixtureContentDir("golden"), outDir });

    const deck = JSON.parse(await readFile(join(outDir, "decks", "mini.json"), "utf8"));

    expect(deck).toEqual({
      id: "mini",
      title: "Mini Deck",
      description: "A tiny deck for the golden-file test.",
      cards: [
        {
          id: "laufen-to-run",
          front: { text: "laufen" },
          back: { text: "to run" },
          category: "verb",
        },
        {
          id: "apfel-apple",
          front: { text: "Apfel", details: "a red one" },
          back: { text: "apple" },
          category: "noun",
        },
      ],
    });
  });
});
