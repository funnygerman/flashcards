import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/**
 * Recursively lists every regular file under `root`, returning absolute
 * paths. Directories are walked in sorted order so results (and therefore
 * validation-error ordering) are deterministic across platforms.
 *
 * @param {string} root
 * @returns {Promise<string[]>}
 */
export async function walk(root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  const files = [];
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/** Path of `path` relative to `root`, using forward slashes on every platform. */
export function toRelativePosix(root, path) {
  return relative(root, path).split(sep).join("/");
}
