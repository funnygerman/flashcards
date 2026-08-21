/**
 * The card on screen.
 *
 * Two elements carry the two animations, one each: `.fc-slide` translates for
 * paging, `.fc-card` rotates for the flip. Keeping them apart is what lets a
 * card be paged away while it is still showing its back.
 */

const SLIDE_MS = 220;

/** How long the card holds a message before going back to being a card. */
const MESSAGE_MS = 2400;

/**
 * How far the card actually travels under a vertical drag, as a fraction of
 * the distance dragged. Grading does not move the card anywhere (V2-8.4), so
 * this is resistance rather than travel: the card gives a little, the edge it
 * is being pushed towards fills, and it springs back on release. A horizontal
 * drag is a page turn and follows the finger outright.
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

/**
 * Run one leg of the slide, or return null where there is no motion to run —
 * reduced-motion preferences and DOM implementations without the Web
 * Animations API both take the instant path.
 */
function animate(element, keyframes) {
  if (prefersReducedMotion() || typeof element.animate !== "function") return null;

  return element.animate(keyframes, { duration: SLIDE_MS, easing: "ease" }).finished.catch(() => {});
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

/** `steps` is omitted where no host has asked for a progress column at all. */
export function createView(container, steps) {
  const root = createElement("div", "fc", container);
  const slider = createElement("div", "fc-slide", root);

  const progress = steps ? createProgress(slider, steps) : null;

  const card = createElement("div", "fc-card", slider);
  const front = createFace(card, "front");
  const back = createFace(card, "back");

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

  const show = (data, level = null) => {
    renderFace(front, data.category, data.frontText, data.frontDetails);
    renderFace(back, data.category, data.backText, data.backDetails);
    mark(level);
  };

  /**
   * Everything a page turn changes about the card, applied in one frame.
   *
   * `fc-instant` suspends every transition under the slider for the duration:
   * the flip rotating back, and the border mark thickening or thinning. Each
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

    setFlipped(false);
    hush(); /* whatever was said was said to the card that just left */
    show(data, level);
    onSwap?.();

    void slider.offsetWidth;
    slider.classList.remove("fc-instant");
  };

  /**
   * Where the card has been dragged to, in pixels, while a finger is down.
   *
   * Kept so that a page turn can start its slide from where the drag left the
   * card rather than from the middle: releasing a card 80 px to the left and
   * watching it jump back before it leaves is the sort of hitch that makes a
   * direct-manipulation gesture feel like a button press with extra steps.
   */
  let dragged = 0;

  /**
   * Follow a drag in progress.
   *
   * Horizontal is a page turn, so the card goes with the finger one for one:
   * the reader is already moving the card towards the edge it will leave by.
   * Vertical is a grade, and grading does not move the card anywhere (V2-8.4)
   * — so the card gives a little against the drag and springs back, while the
   * edge being pushed towards fills in proportion to how much of the threshold
   * the drag has covered. That is what tells the reader, before they have
   * committed to anything, that up and down mean something and what: the mark
   * they are about to leave on the card is already forming under their finger.
   *
   * Under `prefers-reduced-motion` the card does not move at all and only the
   * mark fills: the information is in the mark, and the travel is the part
   * somebody asking for less motion is asking to be spared.
   */
  const drag = ({ dx, dy, horizontal, progress }) => {
    slider.classList.add("is-dragging");

    dragged = horizontal ? dx : 0;

    const still = prefersReducedMotion();
    const offset = horizontal ? `${still ? 0 : dx}px, 0` : `0, ${still ? 0 : dy * VERTICAL_GIVE}px`;

    slider.style.transform = `translate(${offset})`;

    /* Never below what the card already carries: a drag upwards on a card that
       is already marked easier must not shrink that mark on the way to
       redrawing it. The drag fills an edge; it never empties one. */
    const filling = horizontal ? 0 : progress;

    card.style.setProperty("--fc-mark-top", `${Math.max(dy < 0 ? filling : 0, level === "easier" ? 1 : 0)}`);
    card.style.setProperty("--fc-mark-bottom", `${Math.max(dy > 0 ? filling : 0, level === "harder" ? 1 : 0)}`);
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
    card.style.removeProperty("--fc-mark-top");
    card.style.removeProperty("--fc-mark-bottom");
    dragged = 0;
  };

  return {
    root,
    show,
    mark,
    setProgress: (filled) => progress?.set(filled),
    flip: () => setFlipped(!flipped),

    /**
     * Replace the card outright, with no slide: unflipped, hushed, and
     * carrying `level`'s mark, all in the one frame `swap` already gives a
     * page turn (V2-8.6). For a host that changes which cards are being
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
      const from = dragged;

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

    drag,
    release,
    announce,

    destroy: () => {
      hush();
      root.remove();
    },
  };
}
