/**
 * A deck, assembled: the library, review scheduling, session selection and the
 * way out, wired together the way every deck wires them. This is what a deck
 * page calls; order.js beside it is one deck's sequence, not this.
 *
 * This is composition, not library. `mount()` still knows nothing about boxes,
 * due dates or the dictionary (V2-5.9, V2-11.1, V2-12.2) — a deck that wants a
 * bare card and no schedule imports it directly and gets exactly that. What
 * lived in each deck file was never a choice any deck actually made
 * differently: the same four imports, the same onGrade, the same gradeOf, the
 * same box-to-squares mapping, copied per page and free to drift. It drifted
 * once already, a row of five squares written out beside a ladder of six boxes,
 * which is what put BOX_COUNT in review.js.
 *
 * So a deck file holds its cards and one call, and this holds the wiring.
 */

import { BOX_COUNT, gradedToday, recordGrade, reviewState } from "./review.js";
import { allCards, holdsMoreThan } from "./store.js";
import { chooseSession } from "./session.js";
import { mount } from "./flashcards.js";

const SVG = "http://www.w3.org/2000/svg";

/** A 4:3 rectangle in the icon's 20×20 box — the card, at the size of a mark. */
function card(x, y, className) {
  const rect = document.createElementNS(SVG, "rect");

  rect.setAttribute("x", x);
  rect.setAttribute("y", y);
  rect.setAttribute("width", "11");
  rect.setAttribute("height", "8.25");
  if (className) rect.setAttribute("class", className);

  return rect;
}

/**
 * The way out of this page: a small mark in a corner the card does not reach.
 *
 * It draws what it leads to. From a deck, the dictionary is many decks at once,
 * so two cards overlapping; from the dictionary, a deck is one card. Which way
 * round follows from `stacked`, which the caller reads off the same fact that
 * decides everything else here — whether this page brought cards of its own.
 *
 * Built element by element rather than from markup: card content is written as
 * text and never parsed as HTML (V2-2.6), and the rule holds for the page's own
 * furniture too rather than being relaxed where it happens to be safe.
 */
function createCorner({ href, label }, stacked) {
  const link = document.createElement("a");

  link.className = "fc-corner";
  link.href = href;
  link.title = label;
  link.setAttribute("aria-label", label);

  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("aria-hidden", "true");

  if (stacked) svg.append(card("6.5", "3.5"));
  svg.append(card(stacked ? "2.5" : "4.5", stacked ? "8.25" : "5.75", "fc-corner-near"));

  link.append(svg);
  return link;
}

/**
 * Open a deck that keeps a schedule. Returns the library's handle.
 *
 * `cards` is the deck's own; a page that brings none studies the whole
 * dictionary instead (V2-13.3), which is all `dictionary.html` is. `corner` is
 * `{ href, label }` for the link out — omit it for a page with nowhere to go.
 *
 * `element` defaults to the document's body, because one HTML file is one deck
 * (V2-1.2) and there is nothing else on the page for it to go beside. A deck
 * page therefore names no element at all. It is an option rather than a fixed
 * container so that a deck can still be embedded in a smaller one (V2-7.11),
 * and body rather than a required `<div id="...">` because the stylesheet
 * claims the page box through `html:has(> body > .fc)` — a wrapper would break
 * that, and with it the reason a phone's address bar stays put under a swipe.
 *
 * `storage`, `random` and `now` exist so this can be tested without globals,
 * exactly as they do in the modules underneath.
 */
export function openDeck(cards, options = {}) {
  const { element = document.body, corner, storage, random, now } = options;

  const own = cards.length > 0;
  const source = own ? cards : allCards(storage);

  /* A deck studies all of its own cards; the dictionary studies what is due
     out of everything (V2-13.4). The same fact decides both — whether this page
     brought cards of its own. */
  const deck = mount(element, chooseSession(source, { now, storage, onlyDue: !own }), {
    storage,
    random,
    onGrade: (card, level) => recordGrade(card.key, level, storage, now),
    gradeOf: (card) => gradedToday(card.key, storage, now),

    /* The box is the count outright, so box 0 fills no squares — what a card
       the reader has never got right should look like (V2-12.10) — and the row
       is one square per box above the first, sized from the ladder itself so
       that changing the ladder resizes the row (V2-11.15). */
    progress: {
      steps: BOX_COUNT - 1,
      of: (card) => reviewState(card.key, storage, now).box,
    },
  });

  /* Offered only where it leads somewhere new (V2-13.9): for the only deck a
     reader has ever opened it would lead straight back to these same cards, and
     where storage is unusable it would lead to a page that cannot render.
     Added after mounting rather than hidden in the markup, so it is never in
     the document at a moment when it should not be seen. */
  if (corner && holdsMoreThan(cards, storage)) element.append(createCorner(corner, own));

  return deck;
}
