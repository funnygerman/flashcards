import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// `new URL(<dynamic template>, import.meta.url)` is deliberately avoided
// here: Vite's static-asset analysis (which Vitest's transform pipeline
// shares) special-cases that exact call shape and, unable to resolve a
// non-literal template at build time, silently rewrites it to an always-
// empty glob lookup instead of leaving it as a runtime string. Building the
// path with plain `path.join` sidesteps that transform entirely.
const HERE = dirname(fileURLToPath(import.meta.url));

/** Absolute path to a `__fixtures__/<name>/content` directory. */
export function fixtureContentDir(name) {
  return join(HERE, "__fixtures__", name, "content");
}

/** A fresh, empty directory outside the repo for a test's build output. */
export async function makeOutDir() {
  return mkdtemp(join(tmpdir(), "content-pipeline-test-"));
}
