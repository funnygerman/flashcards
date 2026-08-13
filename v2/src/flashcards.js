/**
 * The whole library: mount a deck into an element.
 *
 *   import { mount } from "../src/flashcards.js";
 *   mount(document.body, cards);
 *
 * A card is `{ key, frontText, frontDetails?, backText, backDetails?, category? }`.
 * `key` is opaque here — it is the card's identity in local storage, nothing more.
 */

import { createDeck } from "./deck.js";
import { bindInput } from "./input.js";
import { syncCards } from "./store.js";
import { createView } from "./view.js";

/**
 * @param element   where the deck is rendered
 * @param cards     the deck, shown in a random order
 * @param options   `storage` and `random` are injectable for tests; `onGrade`
 *                  receives (card, "harder" | "easier") — the review logic that
 *                  will act on it is the next step
 */
export function mount(element, cards, options = {}) {
  const { storage, random = Math.random, onGrade } = options;

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("flashcards: mount needs at least one card");
  }

  const deck = createDeck(syncCards(cards, storage), random);
  const view = createView(element);

  view.show(deck.current());

  /* The grade the card in front of the reader is currently marked with. Held
     here rather than in the view because it is what the reader has said, not
     how it is drawn. */
  let graded = null;

  const page = (direction) => {
    graded = null;
    return view.slide(direction, direction > 0 ? deck.next() : deck.previous());
  };

  /* Grading keeps the card in place, so the same grade can arrive many times
     over: repeating it says nothing new and is dropped. Grading the other way
     is a change of mind, and counts. */
  const grade = (level) => {
    if (level === graded) return null;

    graded = level;
    view.mark(level);
    onGrade?.(deck.current(), level);
    return null;
  };

  const actions = {
    flip: () => view.flip(),
    next: () => page(1),
    previous: () => page(-1),
    harder: () => grade("harder"),
    easier: () => grade("easier"),
  };

  /* An intent arriving mid-slide would page from a card that is already
     leaving, so it is dropped rather than queued. */
  let sliding = null;

  const unbind = bindInput(view.root, (intent) => {
    if (sliding) return;

    sliding = actions[intent]?.() ?? null;
    sliding?.finally(() => {
      sliding = null;
    });
  });

  return {
    destroy() {
      unbind();
      view.destroy();
    },
  };
}
