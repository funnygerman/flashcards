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
import { allCards } from "./store.js";
import { chooseSession } from "./session.js";
import { migrateKeys } from "./migrate.js";
import { mount } from "./flashcards.js";
import { pageStorage, readMap, writeMap } from "./storage.js";
import { stringsFor } from "./strings.js";

const SVG = "http://www.w3.org/2000/svg";

/** Where the reader last was, so the dictionary knows what "back" means. */
export const DECK_KEY = "flashcards.deck";

/** Whether the reader has been shown the guide. One flag, nothing else. */
export const HINTS_KEY = "flashcards.hints";

/** Which side a card arrives on, as the reader last asked for it (V2-16.8). */
export const SIDE_KEY = "flashcards.side";

/**
 * The three answers to "which side comes up first?" (V2-16.4, V2-16.5), in the
 * order the menu offers them: the card as its author wrote it, the card turned
 * over, and a coin tossed per card.
 *
 * `back` is what readers asked for and `random` is what they asked for next,
 * and the two are not the same request: one is a reader who studies English →
 * German and wants the deck the other way round for good, the other is a
 * reader who noticed they were recalling the *position* of an answer rather
 * than the answer. Both are about the deck rather than about one card, which
 * is why this is a preference and not a gesture.
 */
export const SIDES = ["front", "back", "random"];

/**
 * The side the reader last chose, or the front.
 *
 * Remembered past the page, unlike the schedule filter beside it in the menu
 * (V2-13.13): a reader who wants the deck the other way round wants it every
 * morning, and asking again each time would be asking them to re-answer a
 * question about themselves. Nothing about it can cost them progress, which
 * is the whole of why the filter is not remembered and this is — the worst an
 * unreadable or nonsense value can do is show the front, which is where every
 * reader starts anyway (V2-6.4).
 */
function readSide(storage = pageStorage()) {
  const { side } = readMap(storage, SIDE_KEY);

  return SIDES.includes(side) ? side : "front";
}

function writeSide(side, storage = pageStorage()) {
  writeMap(storage, SIDE_KEY, { side });
}

/**
 * The guide: five cards that teach the deck by being one.
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
 * These five are the app. Each one asks for the gesture it is teaching, and the
 * reader's own gesture is what answers: tap this card, and the back is the
 * answer; swipe up where it says to, and the card leaves wearing the mark and
 * the next card is already there. The reader is never told what would happen —
 * they do it, and the deck agrees with them. Learning the deck and using the
 * deck become the same act, and the guide costs the interface nothing, because
 * it *is* the interface.
 *
 * The two grades used to share card two, up on its front and down on its back.
 * They cannot now: a grade takes the card away (V2-8.4), so swiping up on that
 * front delivers the next card rather than the same card's other side, and the
 * half of the lesson written on the back would never be read. One grade per
 * card, and the advance the reader's own swipe causes is what turns the page
 * to the other one — which is the guide's own principle applied to a gesture it
 * could not previously apply it to, rather than a concession to the change.
 *
 * Every line is short on purpose too. Card text is sized for a word, not a
 * sentence (V2-7.7), so a line that runs to three of them on a phone is a line
 * that will not be read. Nothing here explains the mark in words for that
 * reason: a drag fills the edge it is going towards while the finger is still
 * down (V2-4.10), which says it without spending a line.
 *
 * "Swipe left for the next one — or press →" is spelled out once, on the
 * first card, because that is the only time that form needs saying — the rest
 * just say "Swipe left", trusting what card one already taught rather than
 * repeating it in full four more times. The two grading cards name their own
 * key in the same breath as their swipe, where card one names the tap's, since
 * a reader on a keyboard has no swipe to discover and nothing else would tell
 * them the arrows grade. No full stops anywhere: these are instructions and
 * labels, not sentences, and a card is not a page of prose.
 *
 * Card three's back is where the day's end of a grade is taught: an answered
 * card is gone until tomorrow (V2-5.16), which is the one consequence of
 * grading a reader cannot see from the gesture itself. It used to teach
 * `previous` as the way to take a grade back, and could not go on doing so
 * once a grade stopped being takeable back — a guide that taught an undo the
 * app does not have would be worse than no line at all.
 *
 * No `key` on any of them, which is what keeps them out of everything a card
 * normally touches: they are not written to the dictionary (V2-6.3), never
 * turn up in it later, and carry no schedule. `category` names them so nobody
 * mistakes one for a word they are supposed to know.
 *
 * The five cards themselves \u2014 English default plus translations \u2014 live in
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
 * Where the way back leads, drawn in the 4:3 of the real card: one card for a
 * single deck, two overlapping for a dictionary, which is many decks at once.
 * `stacked` is true for the two-card form.
 *
 * Only the one-card form is drawn today — the deck ↔ dictionary switch that
 * drew the other is a menu row now, and a row says which side it leads to in
 * words (V2-16.3). The two-card form stays because the shape is the app's
 * word for "everything you have seen" wherever it has to be said without
 * room for a sentence, which is what a link back from the dictionary would
 * need if one is ever drawn from the other direction.
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
 * Three lines, in the 20×20 box the other marks use.
 *
 * The plainest mark there is for "here are the choices", and deliberately not
 * a drawing of any one of them: the menu holds three unrelated questions
 * (V2-16.3) and an icon that answered one of them would be a lie about the
 * other two. The two it replaced could each draw their own subject because
 * each *was* one question; this one cannot, and pretending otherwise is how a
 * button ends up meaning nothing at all.
 */
function menuIcon() {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("aria-hidden", "true");

  for (const y of ["6", "10", "14"]) {
    const line = document.createElementNS(SVG, "line");

    line.setAttribute("x1", "3.5");
    line.setAttribute("x2", "16.5");
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    svg.append(line);
  }

  return svg;
}

/**
 * The menu: one button beside the card, and the reader's choices behind it.
 *
 * `groups()` is asked for the choices afresh every time the sheet is drawn,
 * which is what keeps a row out of it where it would do nothing (V2-16.3) and
 * what lets the answer to one question change which questions there are — a
 * reader switching pools may switch to one whose schedule is holding nothing
 * back, and the row that offered a way past it has to go with it. Nothing here
 * is refreshed by anybody: a sheet that is not on screen has no state worth
 * keeping in step, and the one that is has just been built.
 *
 * Each group is a list of `{ label, chosen, choose }` — the states the reader
 * can be in, with a mark beside the one they are in. Not "press this to get
 * to the other side", which is what a single corner button has to say and
 * what made two of them unreadable as a pair: the reader had to work out from
 * a solid star that they were currently seeing the unsolid one's cards.
 *
 * `choose()` reports whether it applied, exactly as `switchTo` does and for
 * the same reason (V2-3.8): a choice refused mid-slide must not move the mark.
 */
function deckMenu(chrome, strings, groups) {
  /* Everything the open sheet covers, so that the tap which dismisses it is
     spent on dismissing it. Inside the chrome layer, so input.js hands that
     tap to the furniture rather than reading it as a tap on the card
     (V2-16.2) — without it, closing the menu would also flip the card. */
  const scrim = document.createElement("div");
  scrim.className = "fc-menu-scrim";
  scrim.hidden = true;

  const root = document.createElement("div");
  root.className = "fc-menu";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "fc-menu-open";
  button.title = strings.menu.open;
  button.setAttribute("aria-label", strings.menu.open);
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", "false");
  button.append(menuIcon());

  const sheet = document.createElement("div");
  sheet.className = "fc-menu-sheet";
  sheet.setAttribute("role", "menu");
  sheet.hidden = true;

  root.append(button, sheet);
  chrome.append(scrim, root);

  let items = [];
  let shown = false;

  /* Built element by element, like every other mark this file draws: card
     content is written as text and never parsed as HTML (V2-2.6), and the
     rule holds for the page's own furniture too. */
  const draw = (focus) => {
    items = [];

    sheet.replaceChildren(
      ...groups().map((options) => {
        const group = document.createElement("div");
        group.className = "fc-menu-group";
        group.setAttribute("role", "group");

        for (const option of options) {
          const item = document.createElement("button");
          const at = items.length;

          item.type = "button";
          item.className = "fc-menu-item";
          item.setAttribute("role", "menuitemradio");
          item.setAttribute("aria-checked", String(option.chosen));
          item.textContent = option.label;

          /* Choosing what is already chosen is not a change and must not be
             treated as one: no session dealt again, no card reported as paged
             past, no fresh roll of a random side. The mark is already where
             the reader is putting it. */
          item.addEventListener("click", () => {
            if (!option.chosen && option.choose()) draw(at);
          });

          items.push(item);
          group.append(item);
        }

        return group;
      }),
    );

    /* Where the reader was, if that row still exists — answering a question
       can take a later group away with it. Nowhere to land means the button,
       never the document body, which would strand a keyboard mid-menu. */
    (items[focus] ?? button).focus();
  };

  const setShown = (value) => {
    shown = value;
    button.setAttribute("aria-expanded", String(shown));
    sheet.hidden = !shown;
    scrim.hidden = !shown;

    if (shown) draw(0);
    else button.focus();
  };

  /**
   * The keys an open menu takes off the deck.
   *
   * On the capture phase, so they are taken before input.js — bound to the
   * same document — reads them as the deck's (V2-16.7). The four arrows are
   * the deck's while the card is the page, and an open menu is the one moment
   * it is not: grading a card the reader has a sheet over is not what `↑`
   * means here, so up and down walk the rows instead, which is what a list of
   * choices does with them. Everything else is left alone, `Enter` and `Space`
   * included: input.js already declines to take those from a focused control,
   * so a row presses itself.
   */
  const keys = (event) => {
    if (!shown) return;

    const walk = { ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (!walk && !["Escape", "ArrowLeft", "ArrowRight"].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Escape") setShown(false);
    else if (walk) {
      const at = items.indexOf(document.activeElement);
      items[(Math.max(at, 0) + walk + items.length) % items.length]?.focus();
    }
  };

  button.addEventListener("click", () => setShown(!shown));
  scrim.addEventListener("click", () => setShown(false));
  document.addEventListener("keydown", keys, true);

  return {
    remove() {
      document.removeEventListener("keydown", keys, true);
      scrim.remove();
      root.remove();
    },
  };
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
 * The sessions one page can deal, dealt once each and kept.
 *
 * Two independent questions make four: which pool — this deck's own cards, or
 * the whole dictionary (V2-13.9) — and whether the schedule filters it
 * (V2-13.13). Each answer is dealt the first time it is asked for and then
 * kept, because switching away and back is meant to return to the same card
 * rather than deal a fresh session (V2-3.3 as V2-3.8 extends it), and mount()
 * keys its own orders by the very array it was handed.
 *
 * The dictionary's pool is read at that moment rather than up front: this
 * deck's own cards are written to it by mount() (V2-6.1), so a pool read
 * before mounting would be missing exactly the cards the reader is looking at.
 *
 * A pool with nothing due deals the one card that says so (V2-13.12). A pool
 * with nothing *in* it deals nothing at all, which is what mount() refuses
 * (V2-13.8) — "you are done for today" is false where there was never
 * anything to be done.
 *
 * A session is selected afresh every time it is asked for, and kept only where
 * the answer has not changed (V2-13.16). Keeping it outright was the first
 * version and it was wrong in the one way that matters: the four sessions
 * overlap, so a card answered on one of them is still standing in the other
 * three. A reader who graded a card under "Every card" met it again under
 * "Due today", refusing them (V2-5.16) — the very card the day was finished
 * with, offered back by the session that exists to hold only what can still be
 * answered. Grade a whole deck across both filters and the due session went on
 * offering every card of it, refusing all of them, never reaching the card that
 * says the day is done. Re-selecting reads the schedule, which is where the
 * answer actually lives, so every session agrees with it and with the others —
 * and, being storage, with whatever another tab has been doing too.
 *
 * Unchanged means the same cards, in whatever order they come back in, which
 * is what lets V2-3.8's "switching back returns to the card you left" survive:
 * an untouched session comes back as the very array it was dealt as, so mount()
 * finds the order it already built for it. Order is deliberately not part of
 * the comparison — review state selects what is studied and does not order it
 * (V2-13.4), the shuffle does, and `neutral` moves a card's `dueAt` just by
 * being paged past (V2-11.5), so the same session can sort differently one
 * moment to the next without a single card having left it. A session whose
 * cards have actually gone is a different session and is dealt as one.
 *
 * `redeal` is the same selection made again, for a session that has been
 * worked through to the end (V2-13.15). It asks only for what the reader can
 * still answer today — a card already graded is done for the day whatever the
 * schedule says about it (V2-5.16) — so a deck bigger than one sitting hands
 * over its next fifty rather than stopping at the cap, and a pool with nothing
 * left deals the card that says so. It also marks that session spent, which is
 * what stops the reader's own "every card" filter dealing a finished sitting
 * back to them: having been through it once, it too asks only for what is
 * left.
 */
function dealer(source, storage, dictionary, now, done) {
  const dealt = new Map();
  const spent = new Set();

  const pool = (all) => (all ? allCards(storage, dictionary) : source);

  const select = (all, everything, onlyUnanswered) => {
    const cards = pool(all);
    const chosen = chooseSession(cards, { now, storage, onlyDue: !everything, onlyUnanswered });

    return chosen.length === 0 && cards.length > 0 ? [done] : chosen;
  };

  /* Two selections are the same session when they hold the same cards. By key,
     because a pool read back out of storage is a fresh set of objects every
     time (store.js) and identity would call every selection new; the card that
     says there is nothing left carries none, and compares equal to itself,
     which is exactly right — one done card is another. */
  const same = (held, fresh) => {
    if (held.length !== fresh.length) return false;

    const keys = new Set(held.map((card) => card.key));
    return fresh.every((card) => keys.has(card.key));
  };

  const deal = (all, everything) => {
    const id = `${all}:${everything}`;
    const held = dealt.get(id);

    /* A first deal under the reader's own filter shows every card in the pool,
       today's answered ones included: they wear their marks and refuse a
       second grade (V2-5.16), which is the only place that refusal is ever
       met. A due session has no room for them — nothing could be done with
       one — so it asks for unanswered cards from the start (V2-13.14), and so
       does a session the reader has already been through. */
    const fresh = select(all, everything, !everything || spent.has(id));

    if (held && same(held, fresh)) return held;

    dealt.set(id, fresh);
    return fresh;
  };

  const redeal = (all, everything) => {
    const id = `${all}:${everything}`;

    spent.add(id);

    const next = select(all, everything, true);
    dealt.set(id, next);
    return next;
  };

  return { deal, redeal };
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
 * words — the guide, the two corners' labels, the card that says there is
 * nothing to repeat today — from strings.js, English where it is unset or
 * names a language strings.js has none for. Card content is never touched by
 * it: that stays whatever a deck author wrote.
 *
 * `wasKey` on a card names the key it used to be filed under, and the reader's
 * entry is moved to the card's current key — schedule and dictionary both —
 * before anything reads either (migrate.js). That is how a key can be corrected
 * without the card losing the box a reader spent weeks earning on it.
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

  /* A card whose key has changed brings the reader's old entry with it, in the
     dictionary and in the schedule both, before either is read (V2-6.8). Here
     rather than later because chooseSession is about to ask what is due, and a
     card whose schedule is still filed under its old key would answer as a card
     with no schedule at all — due today, box empty, however long the reader has
     actually been studying it. Only a deck's own cards: the dictionary's come
     back out of storage, where the rename has already happened. */
  const settled = own ? migrateKeys(cards, storage) : cards;
  const source = own && dictionary !== undefined ? settled.map((card) => ({ ...card, dictionary })) : settled;

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

  /* The card a page shows when its own schedule has nothing for today
     (V2-13.12). Copied out of strings.js so that it is this mount's card and
     no other's: it is the one card two of the four sessions can hold at once,
     and identity is how the wiring below tells it from a deck's own card and
     from a guide card. */
  const done = { ...strings.done };

  /* A deck and the dictionary both study what is due, out of their own pool —
     a deck's own cards, the dictionary everything (V2-13.4). Whether this page
     brought cards of its own decides only which pool it draws from, not
     whether the schedule filters it; the reader's own menu decides that
     (V2-13.13), for whichever pool they are on. */
  const { deal, redeal } = dealer(source, storage, dictionary, now, done);

  let showingAll = !own;
  let everything = false;
  let side = readSide(storage);

  /* The coin the random side is tossed with. `random` is the deck's own
     injectable source everywhere else here, and it is this one too, so a test
     that pins the shuffle pins which way up a card lands as well. */
  const roll = random ?? Math.random;

  const deck = mount(element, deal(showingAll, everything), {
    storage,
    random,
    lead: guide,

    /* Which way up a card arrives (V2-16.4). Asked per card, so "random"
       really is per card rather than per session — the point of it is that
       the reader cannot learn which side a given card will show. The library
       is told "front" or "back" and never hears the word random: what it
       needs is which side this card lands on, and that is all this answers. */
    facing: () => (side === "random" ? (roll() < 0.5 ? "back" : "front") : side),

    /* What the band calls each grade, in the reader's language (V2-14.4) —
       the app's own words, like the guide's, never a card's. */
    labels: strings.grades,

    /* A card with no key is not the reader's to be asked about again: the
       dictionary does not store it (V2-6.3) and the schedule does not either,
       which is the whole of what keeps the guide out of both. It can still be
       swiped at and marked — that is the point of it — the grade itself goes
       nowhere, even while the row above reacts to it. */
    onGrade: (card, level) => {
      if (card === done) return; /* not material, and not teaching the row either */

      if (!card.key) {
        guideBox = nextBox(level, guideBox);
        return;
      }

      recordGrade(card.key, level, storage, now);
    },

    /* Which cards a grade is the last word on: the ones this page keeps a
       schedule for, which is the ones with a key (V2-5.16). A guide card and
       the card that says there is nothing left today carry none — their grades
       go nowhere at all (V2-15.5, V2-13.12) — so there is nothing about either
       to be finished with, and the guide goes on answering a reader who swipes
       at its grading cards twice. */
    settles: (card) => Boolean(card.key),

    /* A grading gesture dropped because the card has already had its answer
       today. The card cannot show this itself — nothing about it moves — so
       the page says it in words, on the card, which is the one register this
       app has for a sentence (V2-15.2). */
    onRefuse: (card, reason) => {
      if (reason === "settled") deck.say(strings.settled);
    },

    /* The session has been worked through. What follows is the same selection
       made again out of what the reader can still answer today — the next
       sitting's worth of a pool too big for one, or the card that says there
       is nothing left (V2-13.15). */
    onEmpty: () => redeal(showingAll, everything),
    /* What the reader said about this card earlier today, so a card comes back
       after a reload wearing the mark it already had (V2-5.14) — and, being a
       card this page settles, wearing it for the rest of the day: a second
       grading gesture on it is refused above rather than applied (V2-5.16).
       A due session never holds such a card (V2-13.14); the reader's own
       "every card" filter is where they are met. */
    gradeOf: (card) => card.key && gradedToday(card.key, storage, now),

    /* The box is the count outright, so box 0 fills no marks — what a card
       the reader has never got right should look like (V2-12.10) — and the row
       is one mark per box above the first, sized from the ladder itself so
       that changing the ladder resizes the row (V2-11.15). */
    progress: {
      steps: BOX_COUNT - 1,
      of: (card) => {
        if (card.key) return reviewState(card.key, storage, now).box;

        /* The done card is not a card the reader is learning, so it earns
           nothing however it is swiped at; the guide's own box is the guide's
           (V2-15.4a). */
        return card === done ? 0 : guideBox;
      },
    },
  });

  /* mount() has now either thrown or actually shown the guide as the lead —
     only past this point is it true that the reader met it. */
  if (guide.length) rememberGuide(storage);

  /* Which cards are on screen, in one place: the menu's two pool-and-schedule
     groups each ask for a change along their own axis and neither knows about
     the other's, so the pair of answers lives here rather than half in each
     row. A refused switch (V2-3.8) changes nothing, here or in the sheet. */
  const show = (nextAll, nextEverything) => {
    if (!deck.switchTo(deal(nextAll, nextEverything))) return false;

    showingAll = nextAll;
    everything = nextEverything;
    return true;
  };

  /* A side the reader has just chosen applies to the card in front of them,
     not merely to the next one (V2-16.6): a choice whose only result is a
     mark moving in a sheet they are about to close is a choice they have no
     reason to believe landed. It cannot be refused — nothing about which way
     up a card is drawn depends on a slide being over — so this always reports
     that it applied. */
  const setSide = (next) => {
    side = next;
    writeSide(next, storage);
    deck.reface();

    return true;
  };

  /**
   * What the menu offers: the same three questions every time it is opened
   * (V2-16.3).
   *
   * They do not come and go with the reader's schedule. The two corner marks
   * this replaced each appeared only where it would change something, and that
   * rule was right for a mark: a lone icon that leads nowhere is clutter with
   * no way to say so. It is wrong for a row. A row says which state the reader
   * is in, and that is worth saying whether or not the other state differs
   * today — where the corner's rule lands instead is a reader opening the menu
   * on a deck they have never graded, finding two groups, and having no way to
   * tell whether the third is missing because it does not apply or because the
   * app is broken. A menu whose shape changes underneath a reader is a menu
   * they have to re-read every time.
   *
   * So the questions are fixed and only the answers move. On a deck nobody has
   * graded yet, every card is due and "Every card" selects exactly what "Due
   * today" already does: a row that changes nothing this morning, and the one
   * the reader wants the moment the schedule starts holding cards back —
   * which, for them, will be tomorrow.
   *
   * Two things still decide a group out, and neither is about the schedule.
   * A page with no cards of its own is not offered the pool: it *is* the
   * dictionary, and "this deck" would name nothing. And a dictionary with no
   * cards in it is not offered either, because `switchTo` refuses an empty
   * source (V2-13.8) — that is a row that could not act even in principle, not
   * one whose two sides happen to agree today.
   */
  const groups = () => {
    const offered = [
      SIDES.map((value) => ({
        label: strings.menu.side[value],
        chosen: side === value,
        choose: () => setSide(value),
      })),
    ];

    if (own && allCards(storage, dictionary).length > 0) {
      offered.push([
        /* The deck's own name where the page has one: "Everyday German" says
           what this side is in a way "This deck" cannot, and the reader has
           the other side's name in full right beside it. */
        { label: document.title || strings.menu.pool.deck, chosen: !showingAll, choose: () => show(false, everything) },
        { label: strings.menu.pool.all, chosen: showingAll, choose: () => show(true, everything) },
      ]);
    }

    offered.push([
      { label: strings.menu.scope.due, chosen: !everything, choose: () => show(showingAll, false) },
      { label: strings.menu.scope.every, chosen: everything, choose: () => show(showingAll, true) },
    ]);

    return offered;
  };

  /* Added after mounting rather than written into the markup, so nothing is
     in the document at a moment when it should not be seen — and into the
     library's own chrome layer (V2-16.1) rather than beside the deck, which
     is what puts it within reach of the card instead of out in a corner of
     the viewport the reader's thumb never goes (V2-16.2). */
  const menu = deckMenu(deck.chrome, strings, groups);

  /* The way out, and only from a page with no cards of its own: a deck
     switches to the dictionary in place, from the menu, and has nowhere to
     go. A real link is what crossing between two files needs (V2-13.11), so
     it stays a link rather than becoming a row in a list of study options —
     it is the one control here that is not one. */
  const link = own ? null : cornerLink(storage);
  if (link) deck.chrome.append(link);

  /* The library's handle takes back everything this page added as well as
     everything mount() did (V2-3.7): the furniture assembled here is no more
     the caller's to remember than the deck's own listeners are. The chrome
     layer goes with the view, which takes the elements — the menu is asked
     anyway, because the document still holds the key listener it bound
     (V2-16.7) and nothing else would take that back. */
  return {
    ...deck,

    destroy() {
      deck.destroy();
      menu.remove();
    },
  };
}
