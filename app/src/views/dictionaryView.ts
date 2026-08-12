/**
 * Placeholder personal-collection view (T-30 stub; real content is T-32,
 * release 1.1).
 */
import { strings } from "../strings.js";
import type { Mounted } from "../router.js";

export function mountDictionaryView(container: HTMLElement): Mounted {
  const wrapper = document.createElement("div");
  wrapper.className = "dictionary-view";

  const heading = document.createElement("p");
  heading.textContent = strings.dictionary.placeholderHeading;
  const body = document.createElement("p");
  body.textContent = strings.dictionary.placeholderBody;
  wrapper.append(heading, body);

  container.appendChild(wrapper);

  return {
    destroy(): void {
      wrapper.remove();
    },
  };
}
