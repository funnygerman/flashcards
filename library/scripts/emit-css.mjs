#!/usr/bin/env node
/**
 * Writes `dist/flashcards.css` from the compiled `styles.js` module, after
 * `tsc` runs (LIB-9.4, LIB-7.6). `src/styles.ts` is the single source of
 * truth for both the injected `<style>` and this file, so they can't drift.
 *
 * Deliberately dependency-free, matching D4 (no bundler).
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const distDir = resolve(import.meta.dirname, "../dist");
const { STYLES } = await import(resolve(distDir, "styles.js"));

await writeFile(resolve(distDir, "flashcards.css"), `${STYLES}\n`, "utf8");
