/**
 * Runtime data layer (T-21): fetches the generated content (`data/cards.json`,
 * `data/decks/<id>.json`, APP-6.6) and turns identifiers into the
 * `Flashcard[]` the library consumes.
 *
 * `loadDeck` is mostly a typed fetch-and-parse — T-20's pipeline already
 * resolved id-references to full card objects at build time (APP-5.1,
 * APP-4.3), so a deck file never needs a lookup against the card index.
 * `resolveCards` is the one piece that does a runtime id→card lookup,
 * against however many cards currently exist — used later by T-32's
 * collection view, which stores only ids (APP-9.9).
 *
 * Depends on nothing from `@flashcards/library` beyond the `Flashcard`
 * type (APP-2.2).
 */
import type { Flashcard } from "@flashcards/library";

const CARDS_PATH = "data/cards.json";

function deckPath(deckId: string): string {
  return `data/decks/${deckId}.json`;
}

/** APP-2.4: the application's own identifier, carried alongside the
 * library's fields. The library's `Flashcard` type doesn't declare `id`, so
 * it neither requires nor rejects it (LIB-2.5) — this is what lets the
 * application map a library index back to an identifier (APP-2.5). */
export interface AppCard extends Flashcard {
  readonly id: string;
}

/** APP-5.3, APP-5.5: exposed separately from `cards` so deck metadata can
 * never be merged into a `Flashcard` object (APP-5.4). */
export interface DeckMeta {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly cover?: string;
  readonly info?: string;
}

export interface ResolvedDeck {
  readonly meta: DeckMeta;
  readonly cards: AppCard[];
}

export type ResolverErrorKind = "fetch-failed" | "invalid-json";

/** Thrown by `loadDeck`/`resolveCards` instead of letting a network failure
 * or malformed payload surface as an unhandled rejection — callers catch
 * this and render a message, keyed off `kind`/`path`. */
export class ResolverError extends Error {
  readonly kind: ResolverErrorKind;
  readonly path: string;

  constructor(kind: ResolverErrorKind, path: string, message: string) {
    super(message);
    this.name = "ResolverError";
    this.kind = kind;
    this.path = path;
  }
}

async function fetchJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ResolverError("fetch-failed", path, `Network error fetching ${path}: ${reason}`);
  }

  if (!response.ok) {
    throw new ResolverError("fetch-failed", path, `${path} responded with HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    throw new ResolverError("invalid-json", path, `${path} did not contain valid JSON`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface DeckPayload {
  id: string;
  title: string;
  description: string;
  cover?: string;
  info?: string;
  cards: AppCard[];
}

function isDeckPayload(value: unknown): value is DeckPayload {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.cards)
  );
}

/** APP-2.1, APP-6.9: fetches exactly one file and returns metadata plus
 * cards in deck order — already resolved by the content pipeline, so this
 * does no id lookups of its own (APP-5.1, APP-4.3). */
export async function loadDeck(deckId: string): Promise<ResolvedDeck> {
  const path = deckPath(deckId);
  const raw = await fetchJson(path);

  if (!isDeckPayload(raw)) {
    throw new ResolverError("invalid-json", path, `Malformed deck payload at ${path}`);
  }

  const meta: DeckMeta = {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    ...(raw.cover !== undefined ? { cover: raw.cover } : {}),
    ...(raw.info !== undefined ? { info: raw.info } : {}),
  };

  return { meta, cards: raw.cards };
}

/** APP-9.9: looks up `ids` against the global card index, returning found
 * cards and reporting the rest in `missing` rather than throwing — an id
 * whose card no longer exists is a normal, expected outcome, not an error. */
export async function resolveCards(ids: string[]): Promise<{ cards: AppCard[]; missing: string[] }> {
  const raw = await fetchJson(CARDS_PATH);

  if (!Array.isArray(raw)) {
    throw new ResolverError("invalid-json", CARDS_PATH, `Malformed card index at ${CARDS_PATH}`);
  }

  const byId = new Map<string, AppCard>();
  for (const item of raw) {
    if (isRecord(item) && typeof item.id === "string") byId.set(item.id, item as unknown as AppCard);
  }

  const cards: AppCard[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const card = byId.get(id);
    if (card) cards.push(card);
    else missing.push(id);
  }

  return { cards, missing };
}
