/**
 * The card on screen.
 *
 * Two elements carry the two animations, one each: `.fc-slide` translates for
 * paging, `.fc-card` rotates for the flip. Keeping them apart is what lets a
 * card be paged away while it is still showing its back.
 */

import { CHROME_CLASS, SWIPE_THRESHOLD } from "./input.js";

const SLIDE_MS = 220;

/** How long the card holds a message before going back to being a card. */
const MESSAGE_MS = 2400;

/**
 * A graded card holds still, wearing the mark it has just been given, before
 * it leaves — and then leaves faster than it would page. The hold is the only
 * moment in a session where the reader sees the row of stars answer their own
 * verdict (V2-8.10), so it has to be long enough to read; the exit is a flick
 * rather than a page turn, because the card is being got rid of rather than
 * filed. Both are short on purpose: fifty cards at a fifth of a second each is
 * ten seconds of a session spent watching confirmations.
 *
 * The hold also covers a graded card that was never dragged. A grade from the
 * keyboard draws its mark through the stylesheet's own 160 ms transition, and
 * without somewhere for that to happen the card would leave before the mark it
 * is leaving with had finished appearing — `↑` and a swipe up have to look
 * like the same thing (V2-9.3).
 */
const GRADE_HOLD_MS = 180;
const GRADE_EXIT_MS = 160;

/**
 * How far the card gives under a vertical drag that is still short of the
 * threshold, as a fraction of the distance dragged: resistance rather than
 * travel, because a gesture that stops here is not a grade and leaves nothing
 * behind (V2-4.11). Past the threshold the card breaks free and follows the
 * finger outright — see `verticalTravel`.
 */
const VERTICAL_GIVE = 0.22;

function createElement(tag, className, parent) {
  const element = document.createElement(tag);
  element.className = className;
  parent.append(element);
  return element;
}

/** One face of the card: an optional category, the text, optional details. */
function createFace(card, name) {
  const face = createElement("div", `fc-face fc-${name}`, card);

  return {
    /* The face itself, for what is drawn on the face rather than in it: the
       grade mark and the band it grows into are the face's own pseudo-elements,
       and `attr()` reads the element a pseudo-element belongs to and no other. */
    node: face,
    category: createElement("p", "fc-category", face),
    text: createElement("p", "fc-text", face),
    details: createElement("p", "fc-details", face),
  };
}

/** Card content is text, never markup — an empty line is hidden, not blank. */
function setLine(element, value) {
  element.textContent = value ?? "";
  element.hidden = !value;
}

function renderFace(face, category, text, details) {
  setLine(face.category, category);
  setLine(face.text, text);
  setLine(face.details, details);
}

function prefersReducedMotion() {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Whether there is any motion to run at all, for a caller that has to know. */
function moves(element) {
  return !prefersReducedMotion() && typeof element.animate === "function";
}

/**
 * Run one leg of the slide, or return null where there is no motion to run —
 * reduced-motion preferences and DOM implementations without the Web
 * Animations API both take the instant path.
 */
function animate(element, keyframes, duration = SLIDE_MS, easing = "ease") {
  if (!moves(element)) return null;

  return element.animate(keyframes, { duration, easing }).finished.catch(() => {});
}

/**
 * One leg of the slide, as keyframes. `from` is where the card already is —
 * nought, unless a finger dragged it somewhere first, in which case the slide
 * carries on from there rather than snapping back to the middle and setting off
 * again.
 */
const offscreen = (percent, from = 0) => [
  { transform: `translateX(${from}px)`, opacity: 1 },
  { transform: `translateX(${percent}%)`, opacity: 0 },
];

/**
 * A graded card leaving, as keyframes: it holds where the gesture left it,
 * wearing its finished mark, and then flies off the edge it was pushed towards
 * (V2-8.4). The hold is a keyframe rather than a timer so that it is part of
 * the same animation as the exit — the card must not spring back to the middle
 * between the two, and `release()` clearing the drag's inline transform while
 * the hold is still running would do exactly that.
 *
 * `from` is where the drag left the card, for the same reason `offscreen`
 * takes one (V2-8.7): the card carries on from under the finger rather than
 * snapping back and setting off again.
 */
const departure = (percent, from = 0) => [
  { transform: `translateY(${from}px)`, opacity: 1, offset: 0 },
  { transform: `translateY(${from}px)`, opacity: 1, offset: GRADE_HOLD_MS / (GRADE_HOLD_MS + GRADE_EXIT_MS) },
  { transform: `translateY(${percent}%)`, opacity: 0, offset: 1 },
];

/**
 * How far past the threshold a drag can still carry the card, as a fraction
 * of the viewport. A released card is sent off screen by the exit animation
 * regardless of where the drag left it, so this is not about how far a grade
 * is allowed to travel — it is about a finger that never lets go: without a
 * ceiling here, that finger can drag the card past the edge of the screen and
 * leave it there, held, with nothing visible to release.
 */
const VERTICAL_FREE_MAX = 0.4;

/**
 * How far the card actually moves under a vertical drag of `dy`.
 *
 * Short of the threshold it gives rather than travels: a gesture that stops
 * there is not a grade, and the card springing back is what says so (V2-4.11).
 * Past it the card breaks free and takes every further pixel one for one,
 * because past it the gesture *is* a grade and the card really is leaving —
 * up to `VERTICAL_FREE_MAX`, past which it holds at the edge instead of
 * following the finger off it.
 * The change of régime at the threshold is the point — it is the one moment
 * a finger can feel the difference between a drag and a swipe, on the axis
 * where nothing else distinguishes them.
 */
function verticalTravel(dy) {
  const held = Math.min(Math.abs(dy), SWIPE_THRESHOLD) * VERTICAL_GIVE;
  const free = Math.min(Math.max(0, Math.abs(dy) - SWIPE_THRESHOLD), window.innerHeight * VERTICAL_FREE_MAX);

  return Math.sign(dy) * (held + free);
}

/**
 * The progress row: `steps` marks along the card's bottom edge, the first
 * `filled` of them solid. What "filled" means is entirely the host's
 * business — the view only ever draws a count out of a count, never a box or
 * a schedule.
 *
 * What the mark *looks* like is the stylesheet's business and not this
 * module's: these are plain spans, and `.fc-dot` shapes them (stars today,
 * squares before that — see V2-12.9). Keeping the shape in CSS is what let
 * that change happen without a line of JavaScript moving.
 *
 * A sibling of `.fc-card`, not a child of it: `.fc-card` is what rotates for
 * the flip, and this must not — it stays put and legible on whichever face is
 * showing, rather than flipping (and mirroring) with the card.
 */
function createProgress(slider, steps) {
  const row = createElement("div", "fc-progress", slider);
  const dots = Array.from({ length: steps }, () => createElement("span", "fc-dot", row));

  return {
    set(filled) {
      dots.forEach((dot, i) => dot.classList.toggle("is-filled", i < filled));
    },
  };
}

/**
 * `steps` is omitted where no host has asked for a progress column at all, and
 * `labels` where no host has words for the two grades — a bare card takes
 * neither. `labels` is `{ easier, harder }`, the host's own text (V2-5.7a):
 * this view has no more idea what they say than it has what a `category` means,
 * and `mount()` has no sentence of its own to fall back on (V2-1.2).
 *
 * `facing(card)` is the host's answer to "which way up does this card arrive?"
 * — "front" or "back" (V2-16.4), asked afresh every time a card is put on
 * screen and never remembered here. It is the same shape as `progress.of` and
 * `gradeOf` one layer up: a question this view asks rather than a setting it
 * keeps, which is what lets "a random side each time" be a host's answer
 * rather than a third mode in here. Omitted, every card arrives front first,
 * which is what every card did before this existed.
 */
export function createView(container, steps, labels, facing = () => "front") {
  const root = createElement("div", "fc", container);
  const slider = createElement("div", "fc-slide", root);

  const progress = steps ? createProgress(slider, steps) : null;

  const card = createElement("div", "fc-card", slider);
  const front = createFace(card, "front");
  const back = createFace(card, "back");

  /* Where a host puts its own controls (V2-16.1): over the card, in the card's
     own coordinate space, and outside everything the card is. The layer is
     transparent to pointers — only what a host puts in it is not — so it costs
     the card no gesture it would otherwise have had, and input.js hands
     whatever does start in here to the control rather than to the deck. The
     library draws nothing in it and never looks inside. */
  const chrome = createElement("div", CHROME_CLASS, root);

  let flipped = false;

  /**
   * Both faces sit in the DOM at once — `backface-visibility` is what turns
   * one of them away, not removal — so without this a screen reader reads
   * both faces' text together regardless of which way the card is turned.
   * `aria-hidden` follows the same flip this class does, on the face that
   * is not the one showing.
   */
  const setFlipped = (value) => {
    flipped = value;
    card.classList.toggle("is-flipped", flipped);
    front.node.setAttribute("aria-hidden", String(flipped));
    back.node.setAttribute("aria-hidden", String(!flipped));
  };

  setFlipped(false); /* establishes the initial aria-hidden pair; the class toggle is a no-op */

  /**
   * Show a card's grade by marking the edge the gesture went towards: the
   * top edge for `easier`, the bottom for `harder`, neither for `null`. What
   * that mark is made of is the stylesheet's business, as with `.fc-dot`. The
   * host is the one deciding what to pass here — this view has no memory of
   * its own between one `show`/`slide` and the next.
   */
  let level = null;

  const mark = (given) => {
    level = given;
    card.classList.toggle("is-harder", level === "harder");
    card.classList.toggle("is-easier", level === "easier");
  };

  /**
   * The grade band: the mark grown deep enough to hold a word, naming the grade
   * the reader is about to give or has just given.
   *
   * `edge` is which side it is on — "top" for `easier`, "bottom" for `harder`,
   * `null` for no band at all. The edge rather than the grade, because the
   * moment this matters most is a drag past the threshold, when the card has
   * not been graded yet and may still be wearing the opposite grade from an
   * earlier visit: what the reader is pushing towards is the only thing that
   * says which word belongs.
   *
   * Separate from `announce`'s `data-message` rather than sharing it: that one
   * is a host's sentence, has a timer, and takes the progress row away while it
   * is up. This one is a state, lasts exactly as long as the gesture it belongs
   * to, and moves the row aside instead. A host that says something while a
   * grade band is up wins the pseudo-element, which is the right way round —
   * a sentence is deliberate and a label is not.
   */
  const band = (edge) => {
    if (!labels) return;

    const text = edge && (edge === "top" ? labels.easier : labels.harder);

    if (text) card.setAttribute("data-grade-edge", edge);
    else card.removeAttribute("data-grade-edge");

    for (const face of [front, back]) {
      if (text) face.node.setAttribute("data-grade", text);
      else face.node.removeAttribute("data-grade");
    }
  };

  let messageTimer = null;

  /**
   * Take the message off the card. Called whenever the card stops being the
   * card that was spoken to — a page turn, another message, teardown — as well
   * as by the timer, so a message cannot outlive what it was about.
   */
  const hush = () => {
    clearTimeout(messageTimer);
    messageTimer = null;
    for (const face of [front, back]) face.node.removeAttribute("data-message");
  };

  /**
   * Say something on the card itself: the grade mark grows into a band on the
   * edge it already marks and holds the words for a moment.
   *
   * The words are the host's — this view has no more idea what they mean than
   * it has what a `category` or a filled star means (V2-12.2). Where they go
   * and what they look like is the stylesheet's, through one attribute. What
   * belongs here is only the timing: a message is shown for as long as it takes
   * to read and then the card is a card again.
   */
  const announce = (text) => {
    hush();
    for (const face of [front, back]) face.node.setAttribute("data-message", text);
    messageTimer = setTimeout(hush, MESSAGE_MS);
  };

  /**
   * Which way up a card goes on screen, asked of the host every time rather
   * than carried from the last card: a host whose answer is "a random side"
   * (V2-16.5) must be re-rolled per card, and one whose answer is fixed is
   * unaffected by being asked again.
   */
  const face = (data) => setFlipped(facing(data) === "back");

  const show = (data, level = null) => {
    renderFace(front, data.category, data.frontText, data.frontDetails);
    renderFace(back, data.category, data.backText, data.backDetails);
    face(data);
    mark(level);
  };

  /**
   * Everything a page turn changes about the card, applied in one frame.
   *
   * `fc-instant` suspends every transition under the slider for the duration:
   * the flip turning to the side the arriving card faces, and the border mark
   * thickening or thinning. Each
   * is worth animating when it happens on the card in front of the reader, and
   * wrong here — a card arriving with a different grade from the one that left
   * would otherwise land and *then* morph, reading as the page turn having
   * changed it. The reflow flushes the new state while transitions are still
   * off, so they resume from it rather than towards it. The progress row was
   * once in that list too; a filled mark is now a mask swap rather than a
   * colour fade, so there is nothing left to suspend and `onSwap` running here
   * is enough to make the row arrive already correct.
   */
  const swap = (data, level, onSwap) => {
    slider.classList.add("fc-instant");

    hush(); /* whatever was said was said to the card that just left */
    band(null); /* and so was whatever it was graded — the arriving card is bare */
    show(data, level);
    onSwap?.();

    void slider.offsetWidth;
    slider.classList.remove("fc-instant");
  };

  /**
   * Where the card has been dragged to, in pixels, while a finger is down —
   * one axis or the other, never both, since a gesture is resolved on its
   * dominant axis (V2-4.3).
   *
   * Kept so that the card leaves from where the drag left it rather than from
   * the middle, whichever way it is leaving: releasing a card 80 px to the left
   * and watching it jump back before it goes is the sort of hitch that makes a
   * direct-manipulation gesture feel like a button press with extra steps.
   */
  let dragged = { x: 0, y: 0 };

  /**
   * Follow a drag in progress.
   *
   * Horizontal is a page turn, so the card goes with the finger one for one:
   * the reader is already moving the card towards the edge it will leave by.
   * Vertical is a grade, which now also takes the card away (V2-8.4) — but not
   * until the gesture is one: short of the threshold the card gives against the
   * drag and springs back, and past it it breaks free and follows the finger
   * like any other card on its way out (`verticalTravel`). The edge being
   * pushed towards fills in proportion to how much of the threshold the drag
   * has covered, so it is full at exactly the moment the card comes loose.
   * That is what tells the reader, before they have committed to anything, that
   * up and down mean something and what: the mark they are about to leave on
   * the card is already forming under their finger, and the card is already
   * beginning to go.
   *
   * Under `prefers-reduced-motion` the card does not move at all and only the
   * mark fills: the information is in the mark, and the travel is the part
   * somebody asking for less motion is asking to be spared.
   */
  const drag = ({ dx, dy, horizontal, progress }) => {
    slider.classList.add("is-dragging");

    const travel = horizontal ? dx : verticalTravel(dy);
    dragged = horizontal ? { x: travel, y: 0 } : { x: 0, y: travel };

    const still = prefersReducedMotion();
    const offset = horizontal ? `${still ? 0 : travel}px, 0` : `0, ${still ? 0 : travel}px`;

    slider.style.transform = `translate(${offset})`;

    /* Never below what the card already carries: a drag upwards on a card that
       is already marked easier must not shrink that mark on the way to
       redrawing it. The drag fills an edge; it never empties one. */
    const filling = horizontal ? 0 : progress;

    card.style.setProperty("--fc-mark-top", `${Math.max(dy < 0 ? filling : 0, level === "easier" ? 1 : 0)}`);
    card.style.setProperty("--fc-mark-bottom", `${Math.max(dy > 0 ? filling : 0, level === "harder" ? 1 : 0)}`);

    /* Past the threshold the gesture is a grade, so the mark grows into the
       band and names it. The reader can still drag back under and watch it go
       again, which is what keeps V2-4.10's experiment an experiment. */
    band(!horizontal && progress >= 1 ? (dy < 0 ? "top" : "bottom") : null);
  };

  /**
   * Let go. The card returns to the middle and the mark to whatever the card
   * actually carries — both by removing what the drag set, so the stylesheet's
   * own transitions ease them back rather than a second animation doing it.
   * A gesture that turned out to be a page turn takes the offset with it first
   * (see `slide`), so there is nothing left here to spring back.
   */
  const release = () => {
    slider.classList.remove("is-dragging");
    slider.style.transform = "";
    band(null); /* the gesture is over; `gradeSlide` puts one back for the exit */
    card.style.removeProperty("--fc-mark-top");
    card.style.removeProperty("--fc-mark-bottom");
    dragged = { x: 0, y: 0 };
  };

  return {
    root,

    /** Where a host's own controls go (V2-16.1). The library puts none there. */
    chrome,

    show,
    mark,
    setProgress: (filled) => progress?.set(filled),
    flip: () => setFlipped(!flipped),

    /**
     * Turn the card on screen to the side `facing` names *now* — for a host
     * whose answer has changed while a card is sitting there (V2-16.6). It
     * flips rather than swapping, because the reader is watching: the card
     * turning over is the result their choice has (V2-15.1), and there is no
     * new card arriving for `swap`'s instant frame to be right for.
     */
    reface: face,

    /**
     * Replace the card outright, with no slide: hushed, carrying `level`'s
     * mark, and facing whichever way `facing` says it arrives, all in the one
     * frame `swap` already gives a page turn (V2-8.6). For a host that changes which cards are being
     * studied without the reader having turned a page — there is no
     * direction to slide in, only a different card to be looking at.
     */
    replace: swap,

    /**
     * Page to `data`, arriving with grade `level` (the host's memory of
     * what — if anything — this card carries, not this view's): next exits
     * to the left and the following card enters from the right — the
     * reverse for previous — matching a swipe that drags the card away in
     * the direction travelled (right-to-left is next) and, for the
     * keyboard, the usual sense that "forward" arrives from ahead. Returns
     * a promise while it animates, null when the swap was instant.
     *
     * `onSwap` runs at the moment the cards are exchanged, off screen and
     * alongside the content and the mark: anything the host draws around the
     * card — the progress row — belongs to the arriving card too, and has to
     * change with it rather than after the slide has finished delivering it.
     */
    slide(direction, data, level = null, onSwap) {
      const from = dragged.x;

      /* The drag is over the moment the slide takes the card on: its offset has
         been handed to the first keyframe, and leaving the inline transform in
         place would fight the animation the frame it ends. */
      release();

      const out = animate(slider, offscreen(direction * -100, from));
      if (!out) {
        swap(data, level, onSwap);
        return null;
      }

      return out.then(() => {
        swap(data, level, onSwap);
        return animate(slider, offscreen(direction * 100).reverse());
      });
    },

    /**
     * Page away from a card that has just been graded: it holds still for a
     * moment wearing its finished mark, leaves by the edge the gesture went
     * towards — `up` for `easier`, down for `harder` — and the next card
     * arrives from the right exactly as it does for `next`.
     *
     * The two axes are saying two different things, which is why they are not
     * the same animation. Vertical is the reader's verdict, so the card goes
     * the way they pushed it and takes their mark with it. Horizontal is the
     * deck moving on, so the next card arrives the way every next card does:
     * one motion for what the reader said, one for what the deck did about it.
     * Bringing the next card up from the bottom instead would make the deck a
     * vertical feed, which is both a different claim about what the deck is
     * and a swipe the phone would rather use for its own address bar
     * (V2-7.10).
     *
     * Otherwise this is `slide`: same swap in the same off-screen frame
     * (V2-8.6), same instant path where there is no motion to run — the hold
     * included, since a hold is motion nobody asked to watch.
     */
    gradeSlide(up, data, level = null, onSwap) {
      const from = dragged.y;

      /* The drag is over the moment the exit takes the card on, exactly as it
         is for a page turn — its offset is in the first keyframe now, and the
         inline transform left behind would fight the animation as it ends. */
      release();

      const out = animate(slider, departure(up ? -100 : 100, from), GRADE_HOLD_MS + GRADE_EXIT_MS, "ease-in");
      if (!out) {
        swap(data, level, onSwap);
        return null;
      }

      /* The word rides the card out. A swipe has already shown it — it went up
         at the threshold and has not moved since — so this is continuity rather
         than a second announcement, and it is what stops the label vanishing at
         the exact moment the reader commits. For the keyboard it is the only
         time the word appears at all, which is the point: `↑` and a swipe up
         have to leave the same card behind (V2-9.3), and a key press has no
         part-way for the drag half to happen in (V2-4.10). Nothing is shown
         where there is no exit to ride — the instant path above has already
         returned. */
      band(up ? "top" : "bottom");

      return out.then(() => {
        swap(data, level, onSwap);
        return animate(slider, offscreen(100).reverse());
      });
    },

    drag,
    release,
    announce,

    destroy: () => {
      hush();
      root.remove();
    },
  };
}
