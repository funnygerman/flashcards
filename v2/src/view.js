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

export function createView(container) {
  const root = createElement("div", "fc", container);
  const slider = createElement("div", "fc-slide", root);
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

  return {
    root,
    show,
    flip: () => setFlipped(!flipped),

    /**
     * Page to `data`: the card leaves in the direction of travel and the next
     * one arrives from the opposite edge. Returns a promise while it animates,
     * null when the swap was instant.
     */
    slide(direction, data) {
      const swap = () => {
        resetFlip();
        show(data);
      };

      const out = animate(slider, offscreen(direction * 100));
      if (!out) {
        swap();
        return null;
      }

      return out.then(() => {
        swap();
        return animate(slider, offscreen(direction * -100).reverse());
      });
    },

    destroy: () => root.remove(),
  };
}
