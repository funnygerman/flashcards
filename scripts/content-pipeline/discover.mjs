import { extname, sep } from "node:path";

import { walk } from "./fs-utils.mjs";

function isUnderDecksDir(path) {
  return path.split(sep).includes("decks");
}

/**
 * Splits every file under `contentDir` into card-source files (handed to
 * the adapters) and deck-definition files (`content/decks/**\/*.json`,
 * outside the adapter interface — decks are a single fixed format, not one
 * of the three authoring choices in D2). Anything else (README, dotfiles)
 * is ignored.
 *
 * @param {string} contentDir
 * @param {import("./types.js").CardSourceAdapter[]} adapters
 */
export async function discoverSourceFiles(contentDir, adapters) {
  const allFiles = await walk(contentDir);

  const deckFiles = [];
  const cardFiles = [];

  for (const path of allFiles) {
    if (isUnderDecksDir(path) && extname(path) === ".json") {
      deckFiles.push(path);
      continue;
    }
    if (adapters.some((adapter) => adapter.matches(path))) {
      cardFiles.push(path);
    }
  }

  return { cardFiles, deckFiles };
}
