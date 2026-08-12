import { basename, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";

function isUnderCardsDir(path) {
  return path.split(sep).includes("cards");
}

/**
 * APP-6.1 / D2: `content/cards/**\/*.js`, an ES module with a single
 * default-exported card object. This dynamic `import()` only ever runs at
 * build time, on Node — the browser never loads a per-card module
 * (APP-6.8, rejected in D2).
 *
 * @satisfies {import("../types.js").CardSourceAdapter}
 */
export const esmAdapter = {
  name: "esm",

  matches(path) {
    return isUnderCardsDir(path) && extname(path) === ".js";
  },

  async load(path) {
    const mod = await import(pathToFileURL(path).href);
    const card = mod.default;
    const fileImpliedId = basename(path, ".js");

    if (card === null || typeof card !== "object" || Array.isArray(card)) {
      throw new Error(`${path}: default export must be a single card object`);
    }

    return [
      {
        internalId: typeof card.id === "string" ? card.id : undefined,
        fileImpliedId,
        front: {
          text: card.front?.text ?? "",
          details: card.front?.details,
        },
        back: {
          text: card.back?.text ?? "",
          details: card.back?.details,
        },
        category: card.category,
        sourceFile: path,
        sourceFormat: esmAdapter.name,
      },
    ];
  },
};
