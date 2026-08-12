/**
 * Placeholder deck listing for the not-found view (APP-7.6).
 *
 * T-21 will replace this with real deck metadata resolved from the
 * generated content (`data/decks/<id>.json`). Until that lands, the
 * not-found view still needs something to enumerate, so this holds the demo
 * deck referenced by T-20's acceptance criteria and T-31's public contract.
 */
export interface DeckSummary {
  readonly id: string;
  readonly title: string;
}

export const AVAILABLE_DECKS: readonly DeckSummary[] = [{ id: "everyday-german", title: "Everyday German" }];
