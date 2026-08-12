import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * APP-6.6 / APP-6.9: writes the canonical runtime format — one resolved
 * deck file per deck, plus a global card index. Only called after
 * validation has fully succeeded (APP-3.6: all or nothing), so there is no
 * partial-output case to guard against here.
 *
 * @param {{ cards: object[], decks: object[], outDir: string }} input
 */
export async function emit({ cards, decks, outDir }) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, "decks"), { recursive: true });

  await writeFile(join(outDir, "cards.json"), `${JSON.stringify(cards, null, 2)}\n`, "utf8");

  for (const deck of decks) {
    await writeFile(join(outDir, "decks", `${deck.id}.json`), `${JSON.stringify(deck, null, 2)}\n`, "utf8");
  }
}
