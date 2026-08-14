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

  /* Every card's grade, for as long as this deck stays mounted — keyed by
     card rather than by the one on screen, so paging away and back does not
     forget it. It used to live in a single variable that `page` reset
     unconditionally, which meant a revisited card looked ungraded again and
     the same swipe could be replayed on it indefinitely — silently
     reinflating a host's own data (e.g. review.js's box) with no new attempt
     at recall in between. A card's grade, once given, now holds until it is
     actually changed. */
  const grades = new Map();

  view.show(deck.current(), grades.get(deck.current()) ?? null);
  showProgress();

  /* A card leaving ungraded is not nothing — the reader saw it and moved on,
     which is itself worth reporting once, as a neutral outcome, so a card
     they simply forgot to grade is not indistinguishable from one they never
     saw at all. A card graded earlier this session, even in a visit before
     this one, does not count as leaving ungraded. */
  const page = (direction) => {
    if (!grades.has(deck.current())) onGrade?.(deck.current(), "neutral");

    const arriving = direction > 0 ? deck.next() : deck.previous();
    const level = grades.get(arriving) ?? null;

    /* The dots and the mark belong to the card that is about to be on
       screen, so they update once it actually arrives — not the one sliding
       away. */
    const sliding = view.slide(direction, arriving, level);
    if (!sliding) {
      showProgress();
      return null;
    }
    return sliding.then(showProgress);
  };

  /* Repeating the grade a card already carries — even after paging away and
     back — says nothing new and is dropped. Grading the other way is a
     change of mind, and counts, including changing back to one it carried
     before. */
  const grade = (level) => {
    const card = deck.current();
    if (grades.get(card) === level) return null;

    grades.set(card, level);
    view.mark(level);
    onGrade?.(card, level);
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
