import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildContent } from "./pipeline.mjs";
import { fixtureContentDir, makeOutDir } from "./test-utils.mjs";

const outDirs = [];

async function build(fixture) {
  const outDir = await makeOutDir();
  outDirs.push(outDir);
  const result = await buildContent({ contentDir: fixtureContentDir(fixture), outDir });
  return { ...result, outDir };
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(outDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("CardSourceAdapter formats (APP-6.1)", () => {
  it("loads CSV cards", async () => {
    const { cards } = await build("csv-only");
    expect(cards.map((c) => c.id).sort()).toEqual(["apfel-apple", "birne-pear"]);
  });

  it("loads a single JSON card object and a JSON array of cards (AC2)", async () => {
    const { cards } = await build("json-only");
    expect(cards.map((c) => c.id).sort()).toEqual(["gehen-to-go", "sein-to-be", "zelle-cell"]);
  });

  it("loads ESM cards, each a default-exported object", async () => {
    const { cards } = await build("esm-only");
    expect(cards.map((c) => c.id).sort()).toEqual(["laufen-to-operate", "laufen-to-run"]);
  });

  it("keeps laufen-to-run and laufen-to-operate distinct (APP-3.2)", async () => {
    const { cards } = await build("esm-only");
    const run = cards.find((c) => c.id === "laufen-to-run");
    const operate = cards.find((c) => c.id === "laufen-to-operate");
    expect(run.front.text).toBe("laufen");
    expect(operate.front.text).toBe("laufen");
    expect(run.back.text).not.toBe(operate.back.text);
  });

  it("merges and validates all three formats together when they coexist (AC3, APP-6.2)", async () => {
    const { cards, decks } = await build("mixed");
    expect(cards.map((c) => c.id).sort()).toEqual(
      ["danke-thank-you", "gut-good", "haus-house", "hund-dog", "schlecht-bad"].sort(),
    );
    expect(decks.map((d) => d.id).sort()).toEqual(["everyday", "nouns-only"]);
  });
});

describe("emitted output (AC8, AC10, AC11)", () => {
  it("writes data/cards.json and one data/decks/<id>.json per deck, fully resolved in deck order", async () => {
    const { outDir } = await build("mixed");

    const cards = JSON.parse(await readFile(join(outDir, "cards.json"), "utf8"));
    expect(cards.map((c) => c.id).sort()).toEqual(
      ["danke-thank-you", "gut-good", "haus-house", "hund-dog", "schlecht-bad"].sort(),
    );

    const deckFiles = (await readdir(join(outDir, "decks"))).sort();
    expect(deckFiles).toEqual(["everyday.json", "nouns-only.json"]);

    const everyday = JSON.parse(await readFile(join(outDir, "decks", "everyday.json"), "utf8"));
    expect(everyday.cards.map((c) => c.id)).toEqual([
      "danke-thank-you",
      "haus-house",
      "hund-dog",
      "gut-good",
      "schlecht-bad",
    ]);
    // Fully resolved: not bare id references.
    expect(everyday.cards[0]).toMatchObject({
      id: "danke-thank-you",
      front: { text: "danke" },
      back: { text: "thank you" },
    });
  });

  it("emits no CSV in the output (AC10)", async () => {
    const { outDir } = await build("mixed");
    const cardsText = await readFile(join(outDir, "cards.json"), "utf8");
    expect(cardsText).not.toContain(",front_text,");
    JSON.parse(cardsText); // valid JSON, not CSV
  });

  it("rendering a deck needs exactly one generated file (AC11)", async () => {
    const { outDir } = await build("mixed");
    const deck = JSON.parse(await readFile(join(outDir, "decks", "everyday.json"), "utf8"));
    // Every card the deck needs is inline; no further fetch is implied.
    for (const card of deck.cards) {
      expect(card.front.text).toEqual(expect.any(String));
      expect(card.back.text).toEqual(expect.any(String));
    }
  });

  it("carries category through unchanged (AC12, APP-15.4)", async () => {
    const { cards } = await build("mixed");
    const houseCard = cards.find((c) => c.id === "haus-house");
    expect(houseCard.category).toBe("noun");
  });
});
