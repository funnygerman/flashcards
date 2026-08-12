import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResolverError, loadDeck, resolveCards } from "./resolver.js";

const LAUFEN = { id: "laufen-to-run", front: { text: "laufen" }, back: { text: "to run" }, category: "verb" };
const APFEL = {
  id: "apfel-apple",
  front: { text: "Apfel", details: "a red one" },
  back: { text: "apple" },
  category: "noun",
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function stubFetch(impl: (path: string) => Promise<Response>): void {
  vi.stubGlobal("fetch", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadDeck", () => {
  it("fetches exactly one file and returns metadata and cards in deck order (APP-2.1, APP-6.9)", async () => {
    stubFetch((path) => {
      expect(path).toBe("data/decks/mini.json");
      return Promise.resolve(
        jsonResponse({
          id: "mini",
          title: "Mini Deck",
          description: "A tiny deck.",
          cards: [LAUFEN, APFEL],
        }),
      );
    });

    const deck = await loadDeck("mini");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(deck.meta).toEqual({ id: "mini", title: "Mini Deck", description: "A tiny deck." });
    expect(deck.cards).toEqual([LAUFEN, APFEL]);
  });

  it("exposes cover and info when present (APP-5.3, APP-5.5)", async () => {
    stubFetch(() =>
      Promise.resolve(
        jsonResponse({
          id: "mini",
          title: "Mini Deck",
          description: "A tiny deck.",
          cover: "Cover text",
          info: "Info body",
          cards: [],
        }),
      ),
    );

    const deck = await loadDeck("mini");

    expect(deck.meta.cover).toBe("Cover text");
    expect(deck.meta.info).toBe("Info body");
  });

  it("never merges deck metadata into the card objects (APP-5.4)", async () => {
    stubFetch(() =>
      Promise.resolve(
        jsonResponse({
          id: "mini",
          title: "Mini Deck",
          description: "A tiny deck.",
          cover: "Cover text",
          info: "Info body",
          cards: [LAUFEN, APFEL],
        }),
      ),
    );

    const deck = await loadDeck("mini");

    for (const card of deck.cards) {
      expect(card).not.toHaveProperty("title");
      expect(card).not.toHaveProperty("description");
      expect(card).not.toHaveProperty("cover");
      expect(card).not.toHaveProperty("info");
    }
  });

  it("rejects with a typed ResolverError on network failure, not an unhandled rejection", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));

    await expect(loadDeck("mini")).rejects.toBeInstanceOf(ResolverError);
    await expect(loadDeck("mini")).rejects.toMatchObject({ kind: "fetch-failed", path: "data/decks/mini.json" });
  });

  it("rejects with a typed ResolverError on a non-2xx response", async () => {
    stubFetch(() => Promise.resolve(jsonResponse(undefined, false, 404)));

    await expect(loadDeck("missing-deck")).rejects.toMatchObject({ kind: "fetch-failed" });
  });

  it("rejects with a typed ResolverError when the response body isn't valid JSON", async () => {
    stubFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      } as unknown as Response),
    );

    await expect(loadDeck("mini")).rejects.toMatchObject({ kind: "invalid-json" });
  });

  it("rejects with a typed ResolverError when the parsed JSON has the wrong shape", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ id: "mini" })));

    await expect(loadDeck("mini")).rejects.toMatchObject({ kind: "invalid-json" });
  });
});

describe("resolveCards", () => {
  beforeEach(() => {
    stubFetch((path) => {
      expect(path).toBe("data/cards.json");
      return Promise.resolve(jsonResponse([LAUFEN, APFEL]));
    });
  });

  it("resolves known ids to their cards", async () => {
    const result = await resolveCards(["laufen-to-run", "apfel-apple"]);

    expect(result.cards).toEqual([LAUFEN, APFEL]);
    expect(result.missing).toEqual([]);
  });

  it("reports unknown ids in missing instead of throwing (APP-9.9)", async () => {
    const result = await resolveCards(["laufen-to-run", "no-such-id"]);

    expect(result.cards).toEqual([LAUFEN]);
    expect(result.missing).toEqual(["no-such-id"]);
  });

  it("rejects with a typed ResolverError on network failure", async () => {
    vi.unstubAllGlobals();
    stubFetch(() => Promise.reject(new Error("network down")));

    await expect(resolveCards(["laufen-to-run"])).rejects.toBeInstanceOf(ResolverError);
    await expect(resolveCards(["laufen-to-run"])).rejects.toMatchObject({
      kind: "fetch-failed",
      path: "data/cards.json",
    });
  });

  it("rejects with a typed ResolverError when the response body isn't valid JSON", async () => {
    vi.unstubAllGlobals();
    stubFetch(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      } as unknown as Response),
    );

    await expect(resolveCards(["laufen-to-run"])).rejects.toMatchObject({ kind: "invalid-json" });
  });

  it("rejects with a typed ResolverError when the parsed JSON isn't an array", async () => {
    vi.unstubAllGlobals();
    stubFetch(() => Promise.resolve(jsonResponse({ not: "an array" })));

    await expect(resolveCards(["laufen-to-run"])).rejects.toMatchObject({ kind: "invalid-json" });
  });
});
