/**
 * Every user-facing string in the application, collected in one module so a
 * translation pass has a single place to work (APP-15.5). English only in
 * 1.x.
 */
export const strings = {
  deck: {
    placeholderHeading: (deckId: string): string => (deckId.length > 0 ? `Deck: ${deckId}` : "Deck"),
    placeholderBody: "This deck's session view arrives in a later release.",
  },
  dictionary: {
    placeholderHeading: "My collection",
    placeholderBody: "The personal collection arrives in a later release.",
  },
  notFound: {
    heading: "Page not found",
    decksHeading: "Available decks",
    noDecks: "No decks are available yet.",
    fallbackMessage: "Page not found.",
  },
} as const;
