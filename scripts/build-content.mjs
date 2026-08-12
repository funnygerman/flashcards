#!/usr/bin/env node
/**
 * `npm run build:content` — T-20. Runs the content pipeline (adapters →
 * validate → emit) against the repository's `content/` directory and
 * writes the canonical runtime format to `data/` (APP-6.5, APP-6.6).
 */

import { resolve } from "node:path";

import { buildContent, defaultPaths } from "./content-pipeline/pipeline.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const { contentDir, outDir } = defaultPaths(ROOT);

try {
  const { cards, decks } = await buildContent({ contentDir, outDir });
  console.log(`content build ok: ${cards.length} card(s), ${decks.length} deck(s)`);
} catch (err) {
  if (err && err.name === "ContentBuildError") {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
}
