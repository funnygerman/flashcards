import { join } from "node:path";

import { adapters } from "./adapters/index.mjs";
import { discoverSourceFiles } from "./discover.mjs";
import { emit } from "./emit.mjs";
import { ContentBuildError } from "./errors.mjs";
import { toRelativePosix } from "./fs-utils.mjs";
import { loadDeckFile } from "./load-decks.mjs";
import { validate } from "./validate.mjs";

/**
 * Runs the full pipeline: adapters → validate → emit (APP-6.5). Resolves
 * with the built cards and decks on success; rejects with a
 * `ContentBuildError` — naming every offending file and identifier — and
 * writes nothing at all on any validation failure (APP-3.6).
 *
 * @param {{ contentDir: string, outDir: string }} options
 */
export async function buildContent({ contentDir, outDir }) {
  const { cardFiles, deckFiles } = await discoverSourceFiles(contentDir, adapters);

  // Each file is loaded independently, but results are folded back in
  // `cardFiles`/`deckFiles` order (not resolution order) so issue messages
  // and output ordering stay deterministic regardless of I/O timing.
  const cardResults = await Promise.all(
    cardFiles.map(async (path) => {
      const relPath = toRelativePosix(contentDir, path);
      const adapter = adapters.find((a) => a.matches(path));
      try {
        const loaded = await adapter.load(path);
        return { entries: loaded.map((entry) => ({ ...entry, sourceFile: relPath })) };
      } catch (err) {
        return { issue: `${relPath}: ${err instanceof Error ? err.message : String(err)}` };
      }
    }),
  );

  const deckResults = await Promise.all(
    deckFiles.map(async (path) => {
      const relPath = toRelativePosix(contentDir, path);
      try {
        const { raw } = await loadDeckFile(path);
        return { entry: { raw, sourceFile: relPath } };
      } catch (err) {
        return { issue: `${relPath}: ${err instanceof Error ? err.message : String(err)}` };
      }
    }),
  );

  const loadIssues = [
    ...cardResults.filter((r) => r.issue).map((r) => r.issue),
    ...deckResults.filter((r) => r.issue).map((r) => r.issue),
  ];
  const cardEntries = cardResults.filter((r) => r.entries).flatMap((r) => r.entries);
  const deckEntries = deckResults.filter((r) => r.entry).map((r) => r.entry);

  const { issues: validationIssues, cards, decks } = validate({ cardEntries, deckEntries });
  const issues = [...loadIssues, ...validationIssues];

  if (issues.length > 0) {
    throw new ContentBuildError(issues);
  }

  await emit({ cards, decks, outDir });

  return { cards, decks };
}

/** Convenience for the CLI: repo-root-relative default locations. */
export function defaultPaths(repoRoot) {
  return {
    contentDir: join(repoRoot, "content"),
    outDir: join(repoRoot, "data"),
  };
}
