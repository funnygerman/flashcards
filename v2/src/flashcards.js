/**
 * The whole library: mount a deck into an element.
 *
 *   import { mount } from "../src/flashcards.js";
 *   mount(document.body, cards);
 *
 * A card is `{ key, frontText, frontDetails?, backText, backDetails?, category? }`.
 * `key` is opaque here — it is the card's identity in local storage, nothing more.
 */

import { createOrder } from "./order.js";
import { bindInput } from "./input.js";
import { syncCards } from "./store.js";
import { createView } from "./view.js";

/**
 * @param element   where the deck is rendered
 * @param cards     the deck, shown in a random order
 * @param options   `storage` and `random` are injectable for tests; `onRefuse`
 *                  receives (card, "settled") when a grading gesture is
 *                  dropped because the card's grade is no longer the reader's
 *                  to change — the one case where the reader has done
 *                  something and the card can say nothing back; `onGrade`
 *                  receives (card, "harder" | "easier" | "neutral") — "neutral"
 *                  for a card the reader paged past without grading, so a
 *                  forgotten card is not silently skipped by whatever is
 *                  listening (e.g. review scheduling, see review.js).
 *                  `progress` draws a row of `steps` marks along the
 *                  card, `of(card)` filled — any host-supplied 0..steps
 *                  count, e.g. review.js's box; omit it for a bare card.
 *                  `gradeOf(card)` is the host's answer to "what has this card
 *                  already been graded?" — a grade the reader gave it before
 *                  this deck was mounted, e.g. review.js's `gradedToday`. Such
 *                  a card arrives wearing its mark and settled: see `locked`.
 */
export function mount(element, cards, options = {}) {
  const { storage, random = Math.random, onGrade, onRefuse, progress, gradeOf } = options;

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("flashcards: mount needs at least one card");
  }

  const deck = createOrder(syncCards(cards, storage), random);
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

  /* Cards whose grade is no longer the reader's to change: one they graded and
     then moved on from, and one that arrived already graded (`gradeOf`, e.g.
     review.js's grade from earlier today). While a card is in front of the
     reader they can say anything they like about it and change their mind
     freely; leaving it is what settles the answer. Without that, "the reader
     saw this card and judged it" would be worth however many times they cared
     to page back to it or reload the page — the same replay `grades` closed
     for a single visit, one level up. */
  const locked = new Set();

  /* A card's grade, asking the host once about a card neither this deck nor
     the reader has seen graded yet. */
  const gradeFor = (card) => {
    if (!grades.has(card)) {
      const given = gradeOf?.(card) ?? null;

      if (given) {
        grades.set(card, given);
        locked.add(card);
      }
    }

    return grades.get(card) ?? null;
  };

  view.show(deck.current(), gradeFor(deck.current()));
  showProgress();

  /* A card leaving ungraded is not nothing — the reader saw it and moved on,
     which is itself worth reporting once, as a neutral outcome, so a card
     they simply forgot to grade is not indistinguishable from one they never
     saw at all. A card graded earlier this session, even in a visit before
     this one, does not count as leaving ungraded. */
  const page = (direction) => {
    const leaving = deck.current();

    if (grades.has(leaving)) locked.add(leaving); /* the answer it leaves with is the answer */
    else onGrade?.(leaving, "neutral");

    const arriving = direction > 0 ? deck.next() : deck.previous();

    /* The dots and the mark belong to the card that is about to be on screen,
       so they change with it — in the same off-screen frame as its content,
       not once the slide that delivers it has finished. */
    return view.slide(direction, arriving, gradeFor(arriving), showProgress);
  };

  /* Repeating the grade a card already carries says nothing new and is
     dropped, and a card the reader has already left is settled (see `locked`).
     Otherwise grading the other way is a change of mind, and counts —
     including changing back to one it carried earlier this visit.

     The two silences are not the same silence, which is why only one of them
     is reported. A repeat is answered by the mark already on the card: the
     reader asked for exactly what they are looking at. A settled card answers
     with nothing at all — the gesture worked, the card heard it, and the screen
     is identical to one where nobody swiped, which is indistinguishable from
     the gesture not existing at all. What to say about that is the host's
     business (see deck.js); that it happened is this module's. */
  const grade = (level) => {
    const card = deck.current();

    if (locked.has(card)) {
      onRefuse?.(card, "settled");
      return null;
    }

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

  const unbind = bindInput(
    view.root,
    (intent) => {
      if (sliding) return;

      sliding = actions[intent]?.() ?? null;
      sliding?.finally(() => {
        sliding = null;
      });
    },

    /* The card follows the gesture while it is being made. Dropped mid-slide
       for the same reason an intent is (V2-4.9): the card being dragged is on
       its way off the screen and is no longer the reader's to move. */
    (gesture) => {
      if (sliding) return;

      if (gesture) view.drag(gesture);
      else view.release();
    },
  );

  return {
    /**
     * Say something on the card, for a moment: the grade mark grows into a band
     * on the edge it already marks and holds the words. What is worth saying is
     * the host's business — the library has no sentence of its own, only the
     * one place to put one. `onRefuse` is what usually prompts it.
     */
    say: (text) => view.announce(text),

    destroy() {
      unbind();
      view.destroy();
    },
  };
}
