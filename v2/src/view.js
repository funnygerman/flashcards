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
 * The progress row: `steps` stars along the card's bottom edge, the first
 * `filled` of them solid. What "filled" means is entirely the host's
 * business — the view only ever draws a count out of a count, never a box or
 * a schedule.
 *
 * A sibling of `.fc-card`, not a child of it: `.fc-card` is what rotates for
 * the flip, and this must not — it stays put and legible on whichever face is
 * showing, rather than flipping (and mirroring) with the card.
 */
function createProgress(slider, steps) {
  const row = createElement("div", "fc-progress", slider);
  const stars = Array.from({ length: steps }, () => createElement("span", "fc-star", row));

  return {
    set(filled) {
      stars.forEach((star, i) => {
        const isFilled = i < filled;
        star.classList.toggle("is-filled", isFilled);
        star.textContent = isFilled ? "★" : "☆";
      });
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

  const show = (data) => {
    renderFace(front, data.category, data.frontText, data.frontDetails);
    renderFace(back, data.category, data.backText, data.backDetails);
  };

  /** Face the front again without animating the rotation back. */
  const resetFlip = () => {
    card.classList.add("fc-instant");
    setFlipped(false);
    void card.offsetWidth; /* flush the reset before transitions resume */
    card.classList.remove("fc-instant");
  };

  /**
   * Show the card's grade by thickening the edge the gesture went towards:
   * the top edge for `harder`, the bottom for `easier`, neither for null. The
   * mark stays until the grade changes or the card does, because grading no
   * longer pages away — the reader has to be able to see what they marked.
   */
  const mark = (level) => {
    card.classList.toggle("is-harder", level === "harder");
    card.classList.toggle("is-easier", level === "easier");
  };

  return {
    root,
    show,
    mark,
    setProgress: (filled) => progress?.set(filled),
    flip: () => setFlipped(!flipped),

    /**
     * Page to `data`: next exits to the left and the following card enters
     * from the right — the reverse for previous — matching a swipe that
     * drags the card away in the direction travelled (right-to-left is
     * next) and, for the keyboard, the usual sense that "forward" arrives
     * from ahead. Returns a promise while it animates, null when the swap
     * was instant.
     */
    slide(direction, data) {
      const swap = () => {
        resetFlip();
        mark(null);
        show(data);
      };

      const out = animate(slider, offscreen(direction * -100));
      if (!out) {
        swap();
        return null;
      }

      return out.then(() => {
        swap();
        return animate(slider, offscreen(direction * 100).reverse());
      });
    },

    destroy: () => root.remove(),
  };
}
