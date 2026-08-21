#!/usr/bin/env node
/**
 * A minified build, for deployment only.
 *
 * V2-9.1's "no build step" is about running or developing this repository:
 * `npm ci && npm run serve` loads v2/src exactly as written, no compiled output
 * involved, and that stays true whether or not this script has ever run. What
 * it produces is an additional artifact — v2/dist/flashcards.{min.js,min.css}
 * — that only the deployed site's own deck pages are rewritten to reference
 * (see .github/workflows/deploy.yml), purely to cut the payload a reader's
 * phone downloads. Nothing here is committed; CI runs it fresh before every
 * deploy, the same way it runs the tests fresh.
 *
 * v2/src/deck.js is the one entry point every deck file actually imports
 * (`openDeck`), so bundling from there pulls in exactly what a deck page
 * uses and nothing this library doesn't already export.
 */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import * as esbuild from "esbuild";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = resolve(ROOT, "v2/src");
const OUT = resolve(ROOT, "v2/dist");

await mkdir(OUT, { recursive: true });

await esbuild.build({
  entryPoints: [resolve(SRC, "deck.js")],
  bundle: true,
  minify: true,
  format: "esm",
  outfile: resolve(OUT, "flashcards.min.js"),
});

await esbuild.build({
  entryPoints: [resolve(SRC, "flashcards.css")],
  minify: true,
  outfile: resolve(OUT, "flashcards.min.css"),
});

process.stdout.write(`built v2/dist/flashcards.min.js and v2/dist/flashcards.min.css\n`);
