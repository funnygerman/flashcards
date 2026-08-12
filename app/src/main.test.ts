import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { startRouter } from "./router.js";
import type { Route } from "./router.js";
import { mountDeckView } from "./views/deckView.js";
import { mountDictionaryView } from "./views/dictionaryView.js";
import { mountNotFoundView } from "./views/notFoundView.js";
import { AVAILABLE_DECKS } from "./deckCatalog.js";
import { strings } from "./strings.js";

function navigate(hash: string): void {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("application shell wiring (T-30)", () => {
  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    const routes: Route[] = [
      { path: "/deck/:id", mount: mountDeckView },
      { path: "/dictionary", mount: mountDictionaryView },
      { path: "*", mount: mountNotFoundView },
    ];
    startRouter(routes);
  });

  beforeEach(() => {
    navigate("");
  });

  it("mounts the deck placeholder view for #/deck/<id> (APP-7.5)", () => {
    navigate("#/deck/everyday-german");

    const mount = document.querySelector(".library-mount");
    expect(mount).not.toBeNull();
    expect(mount?.getAttribute("data-deck-id")).toBe("everyday-german");
  });

  it("renders application controls outside the library container (APP-2.6)", () => {
    navigate("#/deck/everyday-german");

    const controls = document.querySelector(".app-controls");
    const libraryMount = document.querySelector(".library-mount");
    expect(controls).not.toBeNull();
    expect(libraryMount).not.toBeNull();
    // Siblings, not nested: the library container never contains app chrome.
    expect(controls?.contains(libraryMount!)).toBe(false);
    expect(libraryMount?.contains(controls!)).toBe(false);
  });

  it("mounts the dictionary placeholder view for #/dictionary (APP-7.5)", () => {
    navigate("#/dictionary");

    const view = document.querySelector(".dictionary-view");
    expect(view?.textContent).toContain(strings.dictionary.placeholderHeading);
  });

  it("renders the not-found view listing available decks for an unknown route (APP-7.6)", () => {
    navigate("#/does/not/exist");

    const view = document.querySelector(".not-found-view");
    expect(view?.textContent).toContain(strings.notFound.heading);

    const links = Array.from(document.querySelectorAll(".available-decks a"));
    expect(links).toHaveLength(AVAILABLE_DECKS.length);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      AVAILABLE_DECKS.map((deck) => `#/deck/${deck.id}`),
    );
  });

  it("renders the not-found view for an empty hash rather than a blank page (APP-7.6)", () => {
    navigate("#/deck/everyday-german");
    navigate("");

    expect(document.querySelector(".not-found-view")).not.toBeNull();
    expect(document.querySelector(".deck-view")).toBeNull();
  });

  it("tears down the previous view's DOM when navigating away (APP-7.8)", () => {
    navigate("#/deck/everyday-german");
    expect(document.querySelector(".deck-view")).not.toBeNull();

    navigate("#/dictionary");
    expect(document.querySelector(".deck-view")).toBeNull();
    expect(document.querySelector(".dictionary-view")).not.toBeNull();
  });
});
