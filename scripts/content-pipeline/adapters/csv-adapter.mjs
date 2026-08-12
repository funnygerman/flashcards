import { readFile } from "node:fs/promises";

import { parseCsvRecords } from "../csv.mjs";

/**
 * APP-6.1: `content/cards.csv`, one row per card. Columns: `id`, `front_text`,
 * `front_details`, `back_text`, `back_details`, `category`. Only `id`,
 * `front_text`, and `back_text` are required; the rest may be blank.
 *
 * @satisfies {import("../types.js").CardSourceAdapter}
 */
export const csvAdapter = {
  name: "csv",

  matches(path) {
    return path.endsWith("cards.csv");
  },

  async load(path) {
    const text = await readFile(path, "utf8");
    const records = parseCsvRecords(text);

    return records.map((record) => ({
      internalId: record.id?.trim() || undefined,
      fileImpliedId: undefined,
      front: {
        text: record.front_text ?? "",
        details: record.front_details?.trim() ? record.front_details : undefined,
      },
      back: {
        text: record.back_text ?? "",
        details: record.back_details?.trim() ? record.back_details : undefined,
      },
      category: record.category?.trim() ? record.category : undefined,
      sourceFile: path,
      sourceFormat: csvAdapter.name,
    }));
  },
};
