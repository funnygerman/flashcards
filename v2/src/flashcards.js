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
 * @param options   `storage` and `random` are injectable for tests; `onGrade`
 *                  receives (card, "harder" | "easier" | "neutral") — "neutral"
 *                  for a card the reader paged past without grading, so a
 *                  forgotten card is not silently skipped by whatever is
 *                  listening (e.g. review scheduling, see review.js).
 *                  `labels` is `{ easier, harder }`, the words the grade band
 *                  names each grade with (V2-5.7a) — the host's, like every
 *                  other word on the page; omit them and no band is drawn.
 *                  `progress` draws a row of `steps` marks along the
 *                  card, `of(card)` filled — any host-supplied 0..steps
 *                  count, e.g. review.js's box; omit it for a bare card.
 *                  `lead` is cards to show first, in the order given and
 *                  unshuffled, ahead of the deck proper — a guide, or anything
 *                  else whose sequence is the point (V2-15.3). It applies only
 *                  to `cards`, the source mounted first — never to one handed
 *                  to `switchTo` later.
 *                  `gradeOf(card)` is the host's answer to "what has this card
 *                  already been graded?" — a grade the reader gave it before
 *                  this deck was mounted, e.g. review.js's `gradedToday`. Such
 *                  a card arrives wearing its mark, and the reader may disagree
 *                  with it exactly as they may with one given a moment ago.
 */
export function mount(element, cards, options = {}) {
  const { storage, random = Math.random, onGrade, progress, gradeOf, labels, lead = [] } = options;

  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("flashcards: mount needs at least one card");
  }

  /* One order per source a host has switched to, keyed by the array it was
     given for that source — so switching away and back (deck.js's deck ↔
     dictionary toggle, V2-13.9) returns to the same card and the same cursor
     rather than a fresh shuffle. Built lazily: a source `switchTo` is never
     asked to switch to never gets an order made for it. The lead is shown,
     not studied —
     it goes in front of the deck in the order it was given (order.js) and
     does not pass through the dictionary the way the deck's own cards do — so
     it applies only the first time `cards` itself is ordered, never to a
     source reached through `switchTo`. */
  const orders = new Map();
  const orderFor = (source, sourceLead = []) => {
    let order = orders.get(source);

    if (!order) {
      order = createOrder(syncCards(source, storage), random, sourceLead);
      orders.set(source, order);
    }

    return order;
  };

  let deck = orderFor(cards, lead);
  const view = createView(element, progress?.steps, labels);

  /* Progress is the host's data, not the library's — read fresh every time
     the reader could plausibly have changed it (a new card, or a grade on
     this one) rather than held as state here. */
  const showProgress = () => {
    if (!progress) return;

    const filled = Math.max(0, Math.min(progress.of(deck.current()) || 0, progress.steps));
    view.setProgress(filled);
  };

  /* An intent arriving mid-slide would page from a card that is already
     leaving, so it is dropped rather than queued (V2-4.9). */
  let sliding = null;

  /* The moment one card becomes another, off screen and half-way through a
     page turn (V2-8.6). The progress row is read for the card arriving, and
     the deck stops being busy: from here the reader is looking at the new card,
     so the next intent they make is about that card and is theirs to make.

     Waiting for the whole animation instead cost a reader grading quickly —
     three cards, three swipes up, faster than a card takes to leave — the
     second and third of their swipes. Dropping an intent costs nothing when it
     is a page turn the reader will simply make again; it costs a grade now that
     a grade is what the dropped intent was. */
  const swapped = () => {
    showProgress();
    sliding = null;
  };

  /* Every card's grade, for as long as this deck stays mounted — keyed by
     card rather than by the one on screen, so paging away and back does not
     forget it. It used to live in a single variable that `page` reset
     unconditionally, which meant a revisited card looked ungraded again and
     the reader had no way of telling what they had already said about it.
     A card's grade, once given, holds until it is actually changed.

     Nothing here is locked. A grade takes the card away now (V2-8.4), so the
     gesture that gives one and the gesture that leaves the card are the same
     gesture, and a rule that settled a grade on leaving would settle every
     grade the instant it was given — making the reader's own last swipe the
     one thing they could not take back. Paging back to a card therefore
     re-opens it: the mark it is still wearing (V2-5.6) is the affordance, and
     `previous` is the undo. What stops that being a way to inflate a host's
     own data is the host's own rule, not a lock here — review.js counts one
     grade per card per day against the box the day found it in (V2-11.10), so
     a reader who changes their mind ends up exactly where saying it once would
     have left them, however many times they say it. */
  const grades = new Map();

  /* A card's grade, asking the host once about a card neither this deck nor
     the reader has seen graded yet. A card the host answers for arrives
     wearing its mark and is no more settled than any other: the reader may
     disagree with a grade they gave before a reload exactly as they may
     disagree with one they gave a moment ago. */
  const gradeFor = (card) => {
    if (!grades.has(card)) {
      const given = gradeOf?.(card) ?? null;

      if (given) grades.set(card, { level: given });
    }

    return grades.get(card)?.level ?? null;
  };

  view.show(deck.current(), gradeFor(deck.current()));
  showProgress();

  /* A card leaving ungraded is not nothing — the reader saw it and moved on,
     which is itself worth reporting once, as a neutral outcome, so a card
     they simply forgot to grade is not indistinguishable from one they never
     saw at all. A card graded earlier this session, even in a visit before
     this one, does not count as leaving ungraded. Shared between paging and
     `switchTo`, below: a card left behind by a source change is left exactly
     as one paged past is, the reader having moved on from it either way. */
  const leave = (card) => {
    if (!grades.has(card)) onGrade?.(card, "neutral");
  };

  const page = (direction) => {
    leave(deck.current());

    const arriving = direction > 0 ? deck.next() : deck.previous();

    /* The dots and the mark belong to the card that is about to be on screen,
       so they change with it — in the same off-screen frame as its content,
       not once the slide that delivers it has finished. */
    return view.slide(direction, arriving, gradeFor(arriving), swapped);
  };

  /* A grade answers the card and then takes it away: the mark finishes, the
     row above it moves, the card leaves by the edge the gesture went towards
     and the next one arrives (V2-8.4). Answering and moving on are one act
     because the reader made one gesture, and a swipe that left the card sitting
     there was the single thing first readers reported as broken.

     Repeating the grade a card already carries still says nothing new, so the
     host does not hear about it twice (V2-5.4) — but the card leaves all the
     same. The alternative is a gesture with no result at all, which is the one
     thing an interface with no chrome cannot afford (V2-15.1), and the reader
     agreeing with a mark they can see is not an error to be corrected. */
  const grade = (level) => {
    const card = deck.current();

    if (grades.get(card)?.level !== level) {
      grades.set(card, { level });
      view.mark(level);
      onGrade?.(card, level);
      showProgress(); /* onGrade already ran, so the host's own data is current */
    }

    /* `leave` before the card goes, exactly as a page turn does it — the entry
       above is already in place, so a card that has just been graded is never
       also reported as one paged past ungraded (V2-5.11). */
    leave(card);

    const arriving = deck.next();
    return view.gradeSlide(level === "easier", arriving, gradeFor(arriving), swapped);
  };

  const actions = {
    flip: () => view.flip(),
    next: () => page(1),
    previous: () => page(-1),
    harder: () => grade("harder"),
    easier: () => grade("easier"),
  };

  const unbind = bindInput(
    view.root,
    (intent) => {
      if (sliding) return;

      sliding = actions[intent]?.() ?? null;
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
     * one place to put one.
     */
    say: (text) => view.announce(text),

    /**
     * Switch which cards are being studied, in place: same element, same view,
     * same input bindings — only the order underneath changes. What the two
     * sources mean, and when a host offers a way to move between them, is
     * entirely outside the library (deck.js's deck ↔ dictionary toggle,
     * V2-13.9); this only knows that `source` is another list of cards, and
     * that it remembers where it left each one.
     *
     * Returns whether the switch actually happened, since a host that draws
     * its own state around this call — deck.js's toggle icon and label — has
     * two ways to end up asking for one that does not: mid-slide (below), and
     * a source that turns out to hold no cards, refused for the same reason
     * `mount()` itself refuses one (V2-3.6) rather than leaving the deck
     * showing a card that belongs to neither source.
     *
     * Otherwise dropped mid-slide, the same posture an intent arriving then
     * gets (V2-4.9): the card on screen is already on its way off and is not
     * the reader's, or this call's, to replace.
     *
     * The card leaving is left exactly as a paged-past card is (`leave`), and
     * the arriving one is drawn exactly as one paged to is — its mark, and the
     * progress row, read fresh rather than assumed.
     */
    switchTo(source) {
      if (sliding || !Array.isArray(source) || source.length === 0) return false;

      leave(deck.current());
      deck = orderFor(source);

      const arriving = deck.current();
      view.replace(arriving, gradeFor(arriving), showProgress);
      return true;
    },

    destroy() {
      unbind();
      view.destroy();
    },
  };
}
