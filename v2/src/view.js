/**
 * The card on screen.
 *
 * Two elements carry the two animations, one each: `.fc-slide` translates for
 * paging, `.fc-card` rotates for the flip. Keeping them apart is what lets a
 * card be paged away while it is still showing its back.
 */

const SLIDE_MS = 220;

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

const offscreen = (percent) => [
  { transform: "translateX(0)", opacity: 1 },
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

  const setFlipped = (value) => {
    flipped = value;
    card.classList.toggle("is-flipped", flipped);
  };

  /**
   * Show a card's grade by thickening the edge the gesture went towards: the
   * top edge for `harder`, the bottom for `easier`, neither for `null`. The
   * host is the one deciding what to pass here — this view has no memory of
   * its own between one `show`/`slide` and the next.
   */
  const mark = (level) => {
    card.classList.toggle("is-harder", level === "harder");
    card.classList.toggle("is-easier", level === "easier");
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
    show(data, level);
    onSwap?.();

    void slider.offsetWidth;
    slider.classList.remove("fc-instant");
  };

  return {
    root,
    show,
    mark,
    setProgress: (filled) => progress?.set(filled),
    flip: () => setFlipped(!flipped),

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
      const out = animate(slider, offscreen(direction * -100));
      if (!out) {
        swap(data, level, onSwap);
        return null;
      }

      return out.then(() => {
        swap(data, level, onSwap);
        return animate(slider, offscreen(direction * 100).reverse());
      });
    },

    destroy: () => root.remove(),
  };
}
