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
 *                  receives (card, "harder" | "easier" | "neutral") — "neutral"
 *                  for a card the reader paged past without grading, so a
 *                  forgotten card is not silently skipped by whatever is
 *                  listening (e.g. review scheduling, see review.js).
 *                  `progress` draws a column of `steps` squares beside the
 *                  card, `of(card)` filled — any host-supplied 0..steps
 *                  count, e.g. review.js's box; omit it for a bare card.
 */
export function mount(element, cards, options = {}) {
  const { storage, random = Math.random, onGrade, progress } = options;

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("flashcards: mount needs at least one card");
  }

  const deck = createDeck(syncCards(cards, storage), random);
  const view = createView(element, progress?.steps);

  /* Progress is the host's data, not the library's — read fresh every time
     the reader could plausibly have changed it (a new card, or a grade on
     this one) rather than held as state here. */
  const showProgress = () => {
    if (!progress) return;

    const filled = Math.max(0, Math.min(progress.of(deck.current()) || 0, progress.steps));
    view.setProgress(filled);
  };

  view.show(deck.current());
  showProgress();

  /* The grade the card in front of the reader is currently marked with. Held
     here rather than in the view because it is what the reader has said, not
     how it is drawn. */
  let graded = null;

  /* A card leaving ungraded is not nothing — the reader saw it and moved on,
     which is itself worth reporting once, as a neutral outcome, so a card
     they simply forgot to grade is not indistinguishable from one they never
     saw at all. */
  const page = (direction) => {
    if (graded === null) onGrade?.(deck.current(), "neutral");

    graded = null;

    /* The dots belong to the card that is about to be on screen, so they
       update once it actually arrives — not the one sliding away. */
    const sliding = view.slide(direction, direction > 0 ? deck.next() : deck.previous());
    if (!sliding) {
      showProgress();
      return null;
    }
    return sliding.then(showProgress);
  };

  /* Grading keeps the card in place, so the same grade can arrive many times
     over: repeating it says nothing new and is dropped. Grading the other way
     is a change of mind, and counts. */
  const grade = (level) => {
    if (level === graded) return null;

    graded = level;
    view.mark(level);
    onGrade?.(deck.current(), level);
    showProgress(); /* onGrade already ran, so the host's own data is current */
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
