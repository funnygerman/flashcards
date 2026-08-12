import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildContent } from "./pipeline.mjs";
import { makeOutDir } from "./test-utils.mjs";

// APP-4.5: the repository is designed for up to ~5,000 cards; the build
// must stay fast at that size and the per-deck output must stay one file.
const CARD_COUNT = 5000;

let contentDir;
let outDir;

beforeAll(async () => {
  contentDir = await makeOutDir();
  outDir = await makeOutDir();

  const cards = Array.from({ length: CARD_COUNT }, (_, i) => ({
    id: `generated-card-${i}`,
    front: { text: `front ${i}` },
    back: { text: `back ${i}` },
    category: i % 2 === 0 ? "even" : "odd",
  }));

  await mkdir(join(contentDir, "cards"), { recursive: true });
  await mkdir(join(contentDir, "decks"), { recursive: true });
  await writeFile(join(contentDir, "cards", "generated.json"), JSON.stringify(cards));
  await writeFile(
    join(contentDir, "decks", "generated-deck.json"),
    JSON.stringify({
      id: "generated-deck",
      title: "Generated deck",
      cards: cards.map((c) => c.id),
    }),
  );
});

afterAll(async () => {
  await Promise.all([contentDir, outDir].map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("5,000-card fixture (APP-4.5)", () => {
  it("builds in reasonable time and keeps the deck output a single file", async () => {
    const start = performance.now();
    const { cards, decks } = await buildContent({ contentDir, outDir });
    const elapsedMs = performance.now() - start;

    expect(cards.length).toBe(CARD_COUNT);
    expect(decks.length).toBe(1);
    expect(elapsedMs).toBeLessThan(10_000);

    const deckDir = await readdir(join(outDir, "decks"));
    expect(deckDir).toEqual(["generated-deck.json"]);
  });
});
