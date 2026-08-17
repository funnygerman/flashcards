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
 * same box-to-marks mapping, copied per page and free to drift. It drifted
 * once already, a row of five marks written out beside a ladder of six boxes,
 * which is what put BOX_COUNT in review.js.
 *
 * So a deck file holds its cards and one call, and this holds the wiring.
 */

import { BOX_COUNT, gradedToday, recordGrade, reviewState } from "./review.js";
import { allCards, holdsMoreThan } from "./store.js";
import { chooseSession } from "./session.js";
import { mount } from "./flashcards.js";
import { pageStorage, readMap, writeMap } from "./storage.js";

const SVG = "http://www.w3.org/2000/svg";

/** How long a transient line stays up: long enough to read twice. */
const MESSAGE_MS = 2400;

/**
 * What a refused gesture says. The library reports that it refused and why
 * (`onRefuse`, V2-5.15); the wording is this layer's, because "today" is the
 * schedule's idea and mount() has none — it knows only that this card's grade
 * is no longer the reader's to change.
 */
const SETTLED = "Already rated today — a card counts once a day";

/** Where the reader last was, so the dictionary knows what "back" means. */
export const DECK_KEY = "flashcards.deck";

/**
 * The deck the reader last opened, as `{ href, label }`, or null.
 *
 * The dictionary is reached from a deck and has to lead back to one, and with
 * more than one deck in existence there is no such thing as *the* deck to name
 * in its markup. Naming the one they came from is the only answer that stays
 * true as decks are added — and it always exists when it is needed, because a
 * dictionary with nothing in it cannot render at all (V2-13.8): if there is
 * something to come back from, a deck was opened to put it there.
 *
 * This is routing, which the library holds none of (V2-1.2). It lives here, in
 * the layer that assembles a page, and not in flashcards.js.
 */
export function lastDeck(storage = pageStorage()) {
  const { href, label } = readMap(storage, DECK_KEY);

  return typeof href === "string" && typeof label === "string" ? { href, label } : null;
}

/** An absolute path, so the record reads the same from any page on the site. */
function rememberDeck(storage) {
  const href = globalThis.location?.pathname;
  const label = globalThis.document?.title;

  if (href && label) writeMap(storage ?? pageStorage(), DECK_KEY, { href, label });
}

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
 * A line of text that appears for a moment and then leaves again.
 *
 * The page is otherwise the card and nothing else (V2-7.1), and this does not
 * change that: there is no element in the document until something needs
 * saying, and none of the reader's attention is spent on it before then — the
 * same posture the corner takes towards a link that leads nowhere.
 *
 * It exists because a refused gesture is the one thing the card cannot answer
 * for itself. Every other interaction shows its own result: the card flips,
 * pages, or takes a mark. A grade the schedule will not accept leaves the
 * screen exactly as it was, so a reader who has just discovered the swipe is
 * shown the same nothing as a reader who never swiped — and concludes the same
 * thing from it.
 *
 * A live region rather than decoration, because it says something the reader
 * cannot see anywhere else. V2-10.5 leaves the flip and the grade unannounced:
 * both have a visible result that speaks for itself, which is exactly what
 * this one lacks.
 */
function createMessages(element) {
  let node = null;
  let timer = null;

  const say = (text) => {
    if (!node) {
      node = document.createElement("p");
      node.className = "fc-message";
      node.setAttribute("role", "status");
      element.append(node);
    }

    node.textContent = text;
    node.classList.add("is-shown");

    clearTimeout(timer);
    timer = setTimeout(() => node.classList.remove("is-shown"), MESSAGE_MS);
  };

  const destroy = () => {
    clearTimeout(timer);
    node?.remove();
  };

  return { say, destroy };
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

  /* Only a real deck is somewhere to come back to; the dictionary is not. */
  if (own) rememberDeck(storage);

  const messages = createMessages(element);

  /* A deck studies all of its own cards; the dictionary studies what is due
     out of everything (V2-13.4). The same fact decides both — whether this page
     brought cards of its own. */
  const deck = mount(element, chooseSession(source, { now, storage, onlyDue: !own }), {
    storage,
    random,
    onGrade: (card, level) => recordGrade(card.key, level, storage, now),
    gradeOf: (card) => gradedToday(card.key, storage, now),

    /* Both settled cases are the same fact from the reader's side and get the
       same sentence: a card graded before a page reload (gradeOf, V2-5.14) and
       one graded and paged away from in this session (V2-5.13) have both been
       rated today, since a grade in this session was recorded today by the line
       above. One message, and true in both. */
    onRefuse: (card, reason) => {
      if (reason === "settled") messages.say(SETTLED);
    },

    /* The box is the count outright, so box 0 fills no marks — what a card
       the reader has never got right should look like (V2-12.10) — and the row
       is one mark per box above the first, sized from the ladder itself so
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
  const link = corner && holdsMoreThan(cards, storage) ? createCorner(corner, own) : null;
  if (link) element.append(link);

  /* The library's handle takes back everything this page added as well as
     everything mount() did (V2-3.7): the furniture assembled here is no more
     the caller's to remember than the deck's own listeners are. */
  return {
    destroy() {
      deck.destroy();
      messages.destroy();
      link?.remove();
    },
  };
}
