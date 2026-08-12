/**
 * Not-found view for unknown or empty routes (APP-7.6). Lists the decks the
 * application knows about instead of leaving the page blank or throwing.
 */
import { strings } from "../strings.js";
import { AVAILABLE_DECKS } from "../deckCatalog.js";
import type { Mounted } from "../router.js";

export function mountNotFoundView(container: HTMLElement): Mounted {
  const wrapper = document.createElement("div");
  wrapper.className = "not-found-view";

  const heading = document.createElement("p");
  heading.textContent = strings.notFound.heading;
  wrapper.appendChild(heading);

  const decksHeading = document.createElement("p");
  decksHeading.textContent = strings.notFound.decksHeading;
  wrapper.appendChild(decksHeading);

  if (AVAILABLE_DECKS.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = strings.notFound.noDecks;
    wrapper.appendChild(empty);
  } else {
    const list = document.createElement("ul");
    list.className = "available-decks";
    for (const deck of AVAILABLE_DECKS) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#/deck/${deck.id}`;
      link.textContent = deck.title;
      item.appendChild(link);
      list.appendChild(item);
    }
    wrapper.appendChild(list);
  }

  container.appendChild(wrapper);

  return {
    destroy(): void {
      wrapper.remove();
    },
  };
}
