import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { startRouter } from "./router.js";
import type { Mounted, Route, RouteParams } from "./router.js";

function navigate(hash: string): void {
  window.location.hash = hash;
  // jsdom's own hashchange dispatch timing is not something to depend on;
  // firing it explicitly keeps navigation synchronous and deterministic.
  // The router de-dupes identical hashes (see router.ts), so this stays
  // correct even if jsdom also dispatches its own event for the change.
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

interface Call {
  route: string;
  params: RouteParams;
}

function trackingRoute(path: string, calls: Call[], events: string[]): Route {
  return {
    path,
    mount(_container: HTMLElement, params: RouteParams): Mounted {
      calls.push({ route: path, params });
      events.push(`mount:${path}`);
      return {
        destroy(): void {
          events.push(`destroy:${path}`);
        },
      };
    },
  };
}

describe("startRouter (T-30)", () => {
  const calls: Call[] = [];
  const events: string[] = [];

  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    const routes: Route[] = [
      trackingRoute("/deck/:id", calls, events),
      trackingRoute("/dictionary", calls, events),
      trackingRoute("*", calls, events),
    ];
    startRouter(routes);
  });

  beforeEach(() => {
    // Reset to a known state before every test, then drop whatever that
    // reset itself recorded so each test only sees its own navigation.
    navigate("");
    calls.length = 0;
    events.length = 0;
  });

  it("matches a deck route and extracts the id param (APP-7.5)", () => {
    navigate("#/deck/everyday-german");
    expect(calls.at(-1)).toEqual({ route: "/deck/:id", params: { id: "everyday-german" } });
  });

  it("matches the exact-path dictionary route with no params", () => {
    navigate("#/dictionary");
    expect(calls.at(-1)).toEqual({ route: "/dictionary", params: {} });
  });

  it("treats an empty hash as not-found rather than a blank page (APP-7.6)", () => {
    navigate("#/deck/a"); // move away from "" first so the transition is observable
    calls.length = 0;
    navigate("");
    expect(calls.at(-1)?.route).toBe("*");
  });

  it("treats a bare '#' as not-found", () => {
    // A real browser normalizes "#" to the same empty hash as "" (asserted
    // via the previous test), so this only becomes observable by first
    // moving away from the empty hash.
    navigate("#/deck/a");
    calls.length = 0;
    navigate("#");
    expect(calls.at(-1)?.route).toBe("*");
  });

  it("falls back to not-found for an unknown route", () => {
    navigate("#/nonsense/path");
    expect(calls.at(-1)?.route).toBe("*");
  });

  it("falls back to not-found when a required param segment is empty", () => {
    navigate("#/deck/");
    expect(calls.at(-1)?.route).toBe("*");
  });

  it("falls back to not-found when a required param segment is entirely absent", () => {
    navigate("#/deck");
    expect(calls.at(-1)?.route).toBe("*");
  });

  it("tolerates a missing leading slash", () => {
    navigate("#dictionary");
    expect(calls.at(-1)).toEqual({ route: "/dictionary", params: {} });
  });

  it("collapses repeated slashes", () => {
    navigate("#//deck//everyday-german//");
    expect(calls.at(-1)).toEqual({ route: "/deck/:id", params: { id: "everyday-german" } });
  });

  it("ignores a trailing query string", () => {
    navigate("#/deck/everyday-german?ref=home");
    expect(calls.at(-1)).toEqual({ route: "/deck/:id", params: { id: "everyday-german" } });
  });

  it("decodes a percent-encoded id segment", () => {
    navigate("#/deck/caf%C3%A9");
    expect(calls.at(-1)).toEqual({ route: "/deck/:id", params: { id: "café" } });
  });

  it("rejects a deck path with too many segments", () => {
    navigate("#/deck/one/two");
    expect(calls.at(-1)?.route).toBe("*");
  });

  it("destroys the previous view before mounting the next one (APP-7.8)", () => {
    navigate("#/deck/a");
    events.length = 0;
    navigate("#/dictionary");

    const destroyIndex = events.indexOf("destroy:/deck/:id");
    const mountIndex = events.indexOf("mount:/dictionary");
    expect(destroyIndex).toBeGreaterThanOrEqual(0);
    expect(mountIndex).toBeGreaterThan(destroyIndex);
  });
});
