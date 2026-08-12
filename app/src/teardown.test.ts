import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { startRouter } from "./router.js";
import type { Route } from "./router.js";
import { mountDeckView } from "./views/deckView.js";

function navigate(hash: string): void {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("teardown on repeated navigation (APP-7.8)", () => {
  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    const routes: Route[] = [{ path: "/deck/:id", mount: mountDeckView }];
    startRouter(routes);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps exactly one mounted deck and balanced listeners across ten back-and-forth navigations", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const resizeAdds = () => addSpy.mock.calls.filter((call) => call[0] === "resize").length;
    const resizeRemoves = () => removeSpy.mock.calls.filter((call) => call[0] === "resize").length;

    navigate("#/deck/deck-a");
    expect(resizeAdds() - resizeRemoves()).toBe(1);

    for (let i = 0; i < 10; i++) {
      navigate("#/deck/deck-b");
      expect(document.querySelectorAll(".deck-view").length).toBe(1);
      expect(document.querySelectorAll(".library-mount").length).toBe(1);
      expect(resizeAdds() - resizeRemoves()).toBe(1);

      navigate("#/deck/deck-a");
      expect(document.querySelectorAll(".deck-view").length).toBe(1);
      expect(document.querySelectorAll(".library-mount").length).toBe(1);
      expect(resizeAdds() - resizeRemoves()).toBe(1);
    }

    // Twenty-one mounts happened (the initial one plus ten round trips);
    // exactly as many listeners were added as were removed, minus the one
    // still held by the currently-mounted view.
    expect(resizeAdds()).toBe(21);
    expect(resizeRemoves()).toBe(20);
  });
});
