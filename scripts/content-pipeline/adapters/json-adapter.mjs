import { readFile } from "node:fs/promises";
import { basename, extname, sep } from "node:path";

function isUnderCardsDir(path) {
  return path.split(sep).includes("cards");
}

function toSourceCard(raw, { fileImpliedId, sourceFile }) {
  return {
    internalId: typeof raw?.id === "string" ? raw.id : undefined,
    fileImpliedId,
    front: {
      text: raw?.front?.text ?? "",
      details: raw?.front?.details,
    },
    back: {
      text: raw?.back?.text ?? "",
      details: raw?.back?.details,
    },
    category: raw?.category,
    sourceFile,
    sourceFormat: jsonAdapter.name,
  };
}

/**
 * APP-6.1 / D2: `content/cards/**\/*.json`, either a single card object or
 * an array of cards. A single-object file's name doubles as its identifier
 * (APP-3.7); an array file has no such single identifier, so each entry
 * must carry its own `id`.
 *
 * @satisfies {import("../types.js").CardSourceAdapter}
 */
export const jsonAdapter = {
  name: "json",

  matches(path) {
    return isUnderCardsDir(path) && extname(path) === ".json";
  },

  async load(path) {
    const text = await readFile(path, "utf8");
    const data = JSON.parse(text);
    const fileImpliedId = basename(path, ".json");

    if (Array.isArray(data)) {
      return data.map((raw) => toSourceCard(raw, { fileImpliedId: undefined, sourceFile: path }));
    }
    return [toSourceCard(data, { fileImpliedId, sourceFile: path })];
  },
};
