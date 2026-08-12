import { isValidId, MAX_ID_LENGTH } from "./identifiers.mjs";

const ID_HINT = `must match ^[a-z0-9]+(-[a-z0-9]+)*$ and be at most ${MAX_ID_LENGTH} characters`;

/**
 * Cross-format validation (APP-3.6, APP-6.2): identifier format, global
 * uniqueness (including across formats), per-file id agreement (APP-3.7),
 * and dangling deck references — run together so a single build reports
 * every problem, not just the first.
 *
 * @param {{ cardEntries: object[], deckEntries: { raw: unknown, sourceFile: string }[] }} input
 * @returns {{ issues: string[], cards: object[], decks: object[] }}
 */
export function validate({ cardEntries, deckEntries }) {
  const issues = [];

  /** @type {Map<string, { sourceFile: string }[]>} */
  const cardIdSources = new Map();
  const resolvedCards = [];

  for (const entry of cardEntries) {
    const { internalId, fileImpliedId, sourceFile } = entry;

    if (fileImpliedId !== undefined && internalId !== undefined && fileImpliedId !== internalId) {
      issues.push(
        `${sourceFile}: filename implies identifier "${fileImpliedId}" but the file's "id" field is "${internalId}" (APP-3.7)`,
      );
    }

    const id = internalId ?? fileImpliedId;

    if (id === undefined) {
      issues.push(`${sourceFile}: card is missing an id`);
      continue;
    }

    if (!isValidId(id)) {
      issues.push(`${sourceFile}: invalid card identifier "${id}" (${ID_HINT})`);
    }

    if (typeof entry.front?.text !== "string" || entry.front.text.length === 0) {
      issues.push(`${sourceFile} (${id}): missing front.text`);
    }
    if (typeof entry.back?.text !== "string" || entry.back.text.length === 0) {
      issues.push(`${sourceFile} (${id}): missing back.text`);
    }

    const sources = cardIdSources.get(id) ?? [];
    sources.push({ sourceFile });
    cardIdSources.set(id, sources);

    resolvedCards.push({
      id,
      front: { text: entry.front?.text, details: entry.front?.details },
      back: { text: entry.back?.text, details: entry.back?.details },
      category: entry.category,
    });
  }

  for (const [id, sources] of cardIdSources) {
    if (sources.length > 1) {
      const files = sources.map((s) => s.sourceFile).join(", ");
      issues.push(`duplicate card identifier "${id}" in: ${files}`);
    }
  }

  const knownCardIds = new Set(cardIdSources.keys());

  /** @type {Map<string, { sourceFile: string }[]>} */
  const deckIdSources = new Map();
  const resolvedDecks = [];

  for (const { raw, sourceFile } of deckEntries) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      issues.push(`${sourceFile}: deck file must contain a single deck object`);
      continue;
    }

    const id = raw.id;
    if (typeof id !== "string" || id.length === 0) {
      issues.push(`${sourceFile}: deck is missing an id`);
      continue;
    }
    if (!isValidId(id)) {
      issues.push(`${sourceFile}: invalid deck identifier "${id}" (${ID_HINT})`);
    }

    if (typeof raw.title !== "string" || raw.title.length === 0) {
      issues.push(`${sourceFile} (${id}): deck is missing a title`);
    }

    const cardRefs = Array.isArray(raw.cards) ? raw.cards : null;
    if (cardRefs === null) {
      issues.push(`${sourceFile} (${id}): deck "cards" must be an array of card identifiers`);
    } else {
      cardRefs.forEach((ref, index) => {
        if (typeof ref !== "string") {
          issues.push(`${sourceFile} (${id}): card reference at index ${index} must be a string`);
        } else if (!knownCardIds.has(ref)) {
          issues.push(`${sourceFile} (${id}): references unknown card identifier "${ref}"`);
        }
      });
    }

    const sources = deckIdSources.get(id) ?? [];
    sources.push({ sourceFile });
    deckIdSources.set(id, sources);

    resolvedDecks.push({
      id,
      title: raw.title,
      description: typeof raw.description === "string" ? raw.description : undefined,
      cover: typeof raw.cover === "string" ? raw.cover : undefined,
      info:
        raw.info && typeof raw.info === "object"
          ? { heading: raw.info.heading, body: raw.info.body }
          : undefined,
      cardRefs: cardRefs ?? [],
    });
  }

  for (const [id, sources] of deckIdSources) {
    if (sources.length > 1) {
      const files = sources.map((s) => s.sourceFile).join(", ");
      issues.push(`duplicate deck identifier "${id}" in: ${files}`);
    }
  }

  if (issues.length > 0) {
    return { issues, cards: [], decks: [] };
  }

  const cardsById = new Map(resolvedCards.map((card) => [card.id, card]));
  const cards = [...resolvedCards].sort((a, b) => a.id.localeCompare(b.id));
  const decks = resolvedDecks
    .map(({ cardRefs, ...deck }) => ({
      ...deck,
      cards: cardRefs.map((ref) => cardsById.get(ref)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return { issues: [], cards, decks };
}
