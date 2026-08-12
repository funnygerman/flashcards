/**
 * Hash-based application router (T-30).
 *
 * Everything lives after the `#`, so a static host needs no rewrite rules
 * (APP-7.2, APP-7.5). An unknown or empty hash always resolves to a match —
 * either the caller's own `"*"` route or a minimal built-in fallback — so
 * the page is never left blank or throws on a bad hash (APP-7.6).
 */

export type RouteParams = Readonly<Record<string, string>>;

/** Returned by a view's `mount`. `destroy()` must release everything the
 * view attached — listeners, timers, any library instance — before the
 * router mounts the next view (APP-7.8). */
export interface Mounted {
  destroy(): void;
}

export interface Route {
  /** A path like "/deck/:id" or "/dictionary". The literal path "*" is the
   * not-found fallback, matched only when no other route matches. */
  path: string;
  mount(container: HTMLElement, params: RouteParams): Mounted;
}

function parseHashPath(hash: string): string {
  const withoutHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const withoutQuery = withoutHash.split("?")[0] ?? "";
  return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
}

function segmentsOf(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0);
}

function matchPath(routePath: string, hashPath: string): RouteParams | null {
  const routeSegments = segmentsOf(routePath);
  const hashSegments = segmentsOf(hashPath);
  if (routeSegments.length !== hashSegments.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i]!;
    const hashSegment = hashSegments[i]!;
    if (routeSegment.startsWith(":")) {
      if (hashSegment.length === 0) return null;
      params[routeSegment.slice(1)] = decodeURIComponent(hashSegment);
    } else if (routeSegment !== hashSegment) {
      return null;
    }
  }
  return params;
}

interface RouteMatch {
  route: Route;
  params: RouteParams;
}

function findMatch(routes: readonly Route[], hashPath: string): RouteMatch | null {
  for (const route of routes) {
    if (route.path === "*") continue;
    const params = matchPath(route.path, hashPath);
    if (params) return { route, params };
  }
  const fallback = routes.find((route) => route.path === "*");
  return fallback ? { route: fallback, params: {} } : null;
}

function mountBuiltinFallback(container: HTMLElement, message: string): Mounted {
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  container.appendChild(paragraph);
  return { destroy: () => paragraph.remove() };
}

/** Starts hash routing against `routes` and renders immediately for the
 * current hash. Include a `"*"` route to control what unknown/empty
 * hashes render (typically a not-found view listing available decks,
 * APP-7.6); without one, a minimal built-in message is used instead so the
 * page still never ends up blank. */
export function startRouter(routes: Route[]): void {
  const foundContainer = document.getElementById("app");
  if (!foundContainer) {
    throw new Error("startRouter: no #app element found in the document.");
  }
  // TS does not carry the null-check narrowing above into the nested
  // `render` closure below, so bind it to a definitely-typed const instead.
  const container: HTMLElement = foundContainer;

  let mounted: Mounted | null = null;
  let viewRoot: HTMLElement | null = null;
  let lastHashPath: string | null = null;

  function render(): void {
    const hashPath = parseHashPath(window.location.hash);
    if (hashPath === lastHashPath) return;
    lastHashPath = hashPath;

    const match = findMatch(routes, hashPath);

    // APP-7.8: the previous view is torn down before the next one mounts.
    mounted?.destroy();
    viewRoot?.remove();

    const nextRoot = document.createElement("div");
    nextRoot.className = "app-view";
    container.appendChild(nextRoot);
    viewRoot = nextRoot;

    mounted = match
      ? match.route.mount(nextRoot, match.params)
      : mountBuiltinFallback(nextRoot, "Page not found.");
  }

  window.addEventListener("hashchange", render);
  render();
}
