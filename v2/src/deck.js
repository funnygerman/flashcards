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

import { BOX_COUNT, STORAGE_KEY as REVIEW_KEY, gradedToday, nextBox, recordGrade, reviewState } from "./review.js";
import { allCards, holdsMoreThan } from "./store.js";
import { chooseSession } from "./session.js";
import { mount } from "./flashcards.js";
import { pageStorage, readMap, writeMap } from "./storage.js";
import { stringsFor } from "./strings.js";

const SVG = "http://www.w3.org/2000/svg";

/** Where the reader last was, so the dictionary knows what "back" means. */
export const DECK_KEY = "flashcards.deck";

/** Whether the reader has been shown the guide. One flag, nothing else. */
export const HINTS_KEY = "flashcards.hints";

/**
 * The guide: four cards that teach the deck by being one.
 *
 * Nothing on a card with no chrome on it advertises that swiping exists. A
 * reader can tap, read the back, tap again and page with the arrows for ever
 * without discovering grading at all — and for that reader the row of stars is
 * never explained either. The gestures cannot be inferred; they have to be
 * said, once.
 *
 * Said *as cards*, because a card is the one thing this app has already taught
 * the reader to use. An overlay is a second interface — a thing to read, then
 * dismiss, then act on — and it was tried here first and thrown out for exactly
 * that: a lid over the app, in a register the rest of the design does not use.
 * These four are the app. Each one asks for the gesture it is teaching, and its
 * other side is the reader's own gesture answering: tap this card, and the back
 * is the answer; swipe up where it says to, and the mark appears on the edge it
 * named. The reader is never told what would happen — they do it, and the deck
 * agrees with them. Learning the deck and using the deck become the same act,
 * and the guide costs the interface nothing, because it *is* the interface.
 *
 * Every front ends "tap this card" and every back "swipe left for the next
 * one", which is repetition on purpose: four cards is four turns of the same
 * two gestures, and a reader who starts reading at card three still knows how
 * to go on. Card two splits the two grades across its faces — up on the front,
 * down on the back — so both are performed rather than read about.
 *
 * Every line is short on purpose too. Card text is sized for a word, not a
 * sentence (V2-7.7), so a line that runs to three of them on a phone is a line
 * that will not be read. Nothing here explains the mark in words for that
 * reason: a drag fills the edge it is going towards while the finger is still
 * down (V2-4.10), which says it without spending a line.
 *
 * "Swipe left for the next one — or press →" is spelled out once, on the
 * first card, because that is the only time the keyboard equivalent needs
 * saying — cards two through four just say "Swipe left", trusting what card
 * one already taught rather than repeating it in full three more times. No
 * full stops anywhere: these are instructions and labels, not sentences, and
 * a card is not a page of prose.
 *
 * No `key` on any of them, which is what keeps them out of everything a card
 * normally touches: they are not written to the dictionary (V2-6.3), never
 * turn up in it later, and carry no schedule. `category` names them so nobody
 * mistakes one for a word they are supposed to know.
 *
 * The four cards themselves \u2014 English default plus translations \u2014 live in
 * strings.js (`stringsFor(lang).guide`) alongside the rest of the app's own
 * words, so a reader's chosen `lang` (V2-14.4) picks the guide's language the
 * same way it picks everything else here.
 */

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
function rememberDeck(storage = pageStorage()) {
  const href = globalThis.location?.pathname;
  const label = globalThis.document?.title;

  if (href && label) writeMap(storage, DECK_KEY, { href, label });
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
 * What the corner leads to, drawn in the 4:3 of the real card: two cards
 * overlapping for the dictionary, which is many decks at once, one card for a
 * single deck. `stacked` is true for the two-card form.
 */
function cornerIcon(stacked) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("aria-hidden", "true");

  if (stacked) svg.append(card("6.5", "3.5"));
  svg.append(card(stacked ? "2.5" : "4.5", stacked ? "8.25" : "5.75", "fc-corner-near"));

  return svg;
}

/**
 * Whether this is a reader's first time here.
 *
 * One flag says so, and a review schedule already in storage overrules it: a
 * reader with a schedule is not a first-timer whatever the flag says, because
 * the flag was added to v2 after it had readers, and being taught to tap the
 * card after a month of tapping it is not guidance. Unusable storage shows the
 * guide again, which is the harmless direction to fail in (V2-6.4) — a reader
 * who cannot keep a flag cannot keep a schedule either.
 */
function firstRun(storage = pageStorage()) {
  return readMap(storage, HINTS_KEY).guide !== true && Object.keys(readMap(storage, REVIEW_KEY)).length === 0;
}

/** Remembered as the guide is dealt, so it leads one session and no other. */
function rememberGuide(storage = pageStorage()) {
  writeMap(storage, HINTS_KEY, { guide: true });
}

/**
 * The corner for a deck with cards of its own: not navigation at all, but an
 * in-page switch of which cards `mount()` is showing — the deck's own, or the
 * dictionary's (V2-13.9, `switchTo`'s two sources). There is nowhere to *go*,
 * so this is a button rather than a link, and no `href` is ever true of it.
 * Offered only where it leads somewhere new — for the only deck a reader has
 * ever opened, the dictionary is these same cards and nothing else, so there
 * is nowhere for the switch to go.
 *
 * The dictionary side is computed once, on first use, and kept, for the same
 * reason `ownSession` is computed once by the caller: switching back a second
 * time is meant to return to the same card, not deal a fresh one.
 *
 * The icon and label are redrawn to whichever side of the toggle the reader
 * is now on — two cards and "Everything you have seen" pointing at the
 * dictionary, one card and this page's own title pointing back — so the
 * button always draws what pressing it would do next, never what it just
 * did. `switchTo` reports whether it actually applied — refused mid-slide
 * (V2-4.9), same as any other intent then — so that redraw happens only once
 * the mount's own state really has moved; left unconditional, a rapid second
 * tap while a page turn is still animating would show a dictionary icon over
 * the deck's own cards, or the reverse: true of the button, false of the
 * screen.
 *
 * `dictionary` is `openDeck`'s own option, passed through unchanged: this
 * toggle's "everything" means the same dictionary this deck's own cards
 * belong to, not every dictionary a reader has ever studied (V2-13.7) — a
 * French deck's toggle leads to the rest of the reader's French, not their
 * English too.
 *
 * Built element by element rather than from markup: card content is written
 * as text and never parsed as HTML (V2-2.6), and the rule holds for the
 * page's own furniture too rather than being relaxed where it happens to be
 * safe.
 */
function cornerToggle(cards, storage, ownSession, deck, now, allLabel, dictionary) {
  if (!holdsMoreThan(cards, storage, dictionary)) return null;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "fc-corner";

  let allSession = null;
  let showingAll = false;

  const draw = () => {
    button.replaceChildren(cornerIcon(!showingAll));

    const label = showingAll ? document.title : allLabel;
    button.title = label;
    button.setAttribute("aria-label", label);
  };

  button.addEventListener("click", () => {
    const next = !showingAll;
    allSession ??= chooseSession(allCards(storage, dictionary), { now, storage, onlyDue: true });

    if (!deck.switchTo(next ? allSession : ownSession)) return;

    showingAll = next;
    draw();
  });

  draw();
  return button;
}

/**
 * The corner for a page with none of its own: real navigation back to the
 * deck the reader last opened, if there is one to name (V2-13.11) — a page
 * with no cards is never itself somewhere a reader arrived to stay. A single
 * card, because from here there is exactly one deck to go back to — the one
 * `lastDeck` remembers.
 *
 * Built element by element rather than from markup, for the same reason
 * given above.
 */
function cornerLink(storage) {
  const to = lastDeck(storage);
  if (!to) return null;

  const link = document.createElement("a");
  link.className = "fc-corner";
  link.href = to.href;
  link.title = to.label;
  link.setAttribute("aria-label", to.label);
  link.append(cornerIcon(false));

  return link;
}

/**
 * Open a deck that keeps a schedule. Returns the library's handle.
 *
 * `cards` is the deck's own; a page that brings none studies the whole
 * dictionary instead (V2-13.3), which is all `empty-deck.html` is. The way out
 * is never something the caller names: a deck with cards of its own gets an
 * in-page switch to the dictionary and back (V2-13.9), a page with none gets a
 * real link back to the deck it was reached from (V2-13.11) — which of the two
 * follows from the same fact that decides everything else here, whether this
 * page brought cards of its own.
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
 * exactly as they do in the modules underneath. `lang` picks the app's own
 * words — the guide, the toggle's dictionary label, the "already rated"
 * refusal — from strings.js, English where it is unset or names a language
 * strings.js has none for. Card content is never touched by it: that stays
 * whatever a deck author wrote.
 *
 * `dictionary` splits the shared storage into several non-overlapping
 * dictionaries — a reader learning English and French wants two, not cards
 * from both shuffled into one (V2-13.7). It is a fact about the deck, said
 * once here rather than repeated on every card: this call stamps it onto
 * each of `cards` before anything is stored, so a deck author writes
 * `dictionary` nowhere else. Left unset, a card carries none — its own,
 * separate dictionary, the same one every card kept before this existed.
 * `syncCards` settles a `key` collision across dictionaries the same way it
 * settles any other disagreement about a card: first write wins.
 */
export function openDeck(cards, options = {}) {
  const { element = document.body, storage, random, now, lang, dictionary } = options;
  const strings = stringsFor(lang);

  const own = cards.length > 0;
  const source = own && dictionary !== undefined ? cards.map((card) => ({ ...card, dictionary })) : cards;

  /* Dealt in front of the session on a first run — remembered only once
     mount() actually succeeds, below, rather than here: a card-less page with
     an empty dictionary throws (V2-13.8) before ever showing the guide, and a
     reader who never saw it must not be marked as having, with no way to
     replay it (V2-15.6). A reload part-way through is a reader who has
     already met it, not one who needs it again from the top, which is what
     makes remembering it at all worthwhile. */
  const guide = firstRun(storage) ? strings.guide : [];

  /* Only a real deck is somewhere to come back to; the dictionary is not. */
  if (own) rememberDeck(storage);

  /* The guide's own box — in memory only, gone the moment this mount ends,
     the same as everything else about a guide card (V2-6.3). Card three
     claims "a star for each day you get it right... wrong answer clears
     them all" (V2-15.4's own gesture answering its own claim); without this
     the row stayed empty however a guide card was graded, since a keyless
     card has no schedule for `reviewState` to read a box from, and the very
     card teaching what the row means would be the one card that could never
     show it doing anything. Moved by review.js's own `nextBox` — same rule
     a scheduled card obeys, minus the part that writes to storage, since
     there is nowhere for a guide card's box to live once this mount is
     gone, nor should there be. */
  let guideBox = 0;

  /* A deck and the dictionary both study what is due, out of their own pool —
     a deck's own cards, the dictionary everything (V2-13.4). Whether this page
     brought cards of its own decides only which pool `chooseSession` draws
     from, not whether it filters. Computed once and kept: it is also the
     source the corner's toggle switches back to, below, and switching is
     meant to return to the same card, not deal a fresh session (V2-3.3's
     shuffle, stretched to cover a source revisited within one mount rather
     than reshuffled on every visit to it). */
  const ownSession = chooseSession(own ? source : allCards(storage, dictionary), { now, storage, onlyDue: true });

  const deck = mount(element, ownSession, {
    storage,
    random,
    lead: guide,

    /* A card with no key is not the reader's to be asked about again: the
       dictionary does not store it (V2-6.3) and the schedule does not either,
       which is the whole of what keeps the guide out of both. It can still be
       swiped at and marked — that is the point of it — the grade itself goes
       nowhere, even while the row above reacts to it. */
    onGrade: (card, level) => {
      if (!card.key) {
        guideBox = nextBox(level, guideBox);
        return;
      }

      recordGrade(card.key, level, storage, now);
    },
    gradeOf: (card) => card.key && gradedToday(card.key, storage, now),

    /* Both settled cases are the same fact from the reader's side and get the
       same sentence: a card graded before a page reload (gradeOf, V2-5.14) and
       one graded and paged away from in this session (V2-5.13) have both been
       rated today, since a grade in this session was recorded today by the line
       above. One message, and true in both. */
    onRefuse: (card, reason) => {
      if (reason === "settled") deck.say(strings.settled);
    },

    /* The box is the count outright, so box 0 fills no marks — what a card
       the reader has never got right should look like (V2-12.10) — and the row
       is one mark per box above the first, sized from the ladder itself so
       that changing the ladder resizes the row (V2-11.15). */
    progress: {
      steps: BOX_COUNT - 1,
      of: (card) => (card.key ? reviewState(card.key, storage, now).box : guideBox),
    },
  });

  /* mount() has now either thrown or actually shown the guide as the lead —
     only past this point is it true that the reader met it. */
  if (guide.length) rememberGuide(storage);

  /* The way out, added after mounting rather than hidden in the markup, so it
     is never in the document at a moment when it should not be seen. */
  const link = own ? cornerToggle(source, storage, ownSession, deck, now, strings.allLabel, dictionary) : cornerLink(storage);
  if (link) element.append(link);

  /* The library's handle takes back everything this page added as well as
     everything mount() did (V2-3.7): the furniture assembled here is no more
     the caller's to remember than the deck's own listeners are. */
  return {
    ...deck,

    destroy() {
      deck.destroy();
      link?.remove();
    },
  };
}
