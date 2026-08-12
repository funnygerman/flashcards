/**
 * Placeholder deck session view (T-30 stub; real rendering is T-31).
 *
 * Builds the DOM split the deck page needs once T-31 lands: application
 * chrome sits in `.app-controls`, outside `.library-mount` — the element
 * that will be handed to `new FlashcardDeck(...)` (APP-2.6). `.library-mount`
 * fills its parent by percentage rather than a viewport unit; only the
 * top-level `#app` sets `100dvh` (APP-7.7, LIB-7.10).
 *
 * Registers a `resize` listener as a stand-in for what the mounted library
 * instance will eventually need, and removes it in `destroy()` so
 * navigating away leaves nothing behind (APP-7.8).
 */
import { strings } from "../strings.js";
import type { Mounted, RouteParams } from "../router.js";

export function mountDeckView(container: HTMLElement, params: RouteParams): Mounted {
  const deckId = params.id ?? "";

  const wrapper = document.createElement("div");
  wrapper.className = "deck-view";

  const chrome = document.createElement("div");
  chrome.className = "app-controls";
  const heading = document.createElement("p");
  heading.textContent = strings.deck.placeholderHeading(deckId);
  chrome.appendChild(heading);

  const libraryMount = document.createElement("div");
  libraryMount.className = "library-mount";
  libraryMount.setAttribute("data-deck-id", deckId);
  const placeholder = document.createElement("p");
  placeholder.textContent = strings.deck.placeholderBody;
  libraryMount.appendChild(placeholder);

  wrapper.append(chrome, libraryMount);
  container.appendChild(wrapper);

  const onResize = (): void => {
    // Placeholder: T-31's mounted library instance will own its own
    // layout recalculation; this stub has nothing to resize yet.
  };
  window.addEventListener("resize", onResize);

  return {
    destroy(): void {
      window.removeEventListener("resize", onResize);
      wrapper.remove();
    },
  };
}
