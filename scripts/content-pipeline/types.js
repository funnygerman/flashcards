/**
 * Shared shapes for the content pipeline (T-20). Documentation only — the
 * pipeline is plain JS, like `scripts/dev-server.mjs`; nothing here is
 * type-checked, but editors and `@satisfies` comments use it for
 * intellisense.
 *
 * @typedef {Object} SourceCardFront
 * @property {string} text
 * @property {string} [details]
 *
 * @typedef {Object} SourceCard
 * @property {string} [internalId] identifier declared inside the source itself
 * @property {string} [fileImpliedId] identifier implied by a per-card file's name (APP-3.7)
 * @property {SourceCardFront} front
 * @property {SourceCardFront} back
 * @property {string} [category]
 * @property {string} sourceFile path of the file this card was loaded from, for error messages
 * @property {string} sourceFormat the adapter's `name`
 *
 * @typedef {Object} CardSourceAdapter
 * @property {string} name
 * @property {(path: string) => boolean} matches
 * @property {(path: string) => Promise<SourceCard[]>} load
 */
export {};
