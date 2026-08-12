import { readFile } from "node:fs/promises";

/**
 * @param {string} path
 * @returns {Promise<{ raw: unknown, sourceFile: string }>}
 */
export async function loadDeckFile(path) {
  const text = await readFile(path, "utf8");
  return { raw: JSON.parse(text), sourceFile: path };
}
