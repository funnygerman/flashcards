# T-30 — Application shell and routing

**Milestone:** M3 · **Depends on:** T-00 · **Blocks:** T-31, T-32
**Requirements covered:** `APP-2.3`, `APP-2.6`, `APP-7.1`–`APP-7.8`, `APP-15.5`, `APP-17.7`

## Goal

One `index.html`, hash routing, and the page layout the library mounts into.

## Public contract

```text
#/deck/<deck-id>    deck session          (T-31)
#/dictionary        personal collection   (T-32, release 1.1)
```

```ts
export function startRouter(routes: Route[]): void;
```

## Acceptance criteria

1. **Given** a static host with no rewrite rules, **then** every route works, because routing is hash-based
   (`APP-7.2`, `APP-7.5`).
2. **Given** an unknown or empty route, **then** a not-found view renders listing the available decks — never
   a blank page or an uncaught error (`APP-7.6`).
3. **Given** the deck container, **then** the application sets `height: 100dvh` on it; the library never sets
   a viewport-relative height (`APP-7.7`, `LIB-7.10`).
4. **Given** a route change away from a mounted deck, **then** `destroy()` is called before the next mount,
   and no listeners or timers from the previous deck survive (`APP-7.8`).
5. **Given** repeated back-and-forward navigation between two routes, **then** memory and listener counts stay
   flat.
6. **Given** the application, **then** it requires no account, no login, and no backend (`APP-7.1`,
   `APP-7.3`), and stores user state only locally (`APP-7.4`).
7. **Given** the application code, **then** it touches the library only through its published API — no reads
   of `fc-` DOM or CSS internals (`APP-2.3`).
8. **Given** any application control, **then** it is rendered outside the library container (`APP-2.6`).
9. **Given** every user-facing string, **then** it comes from one strings module (`APP-15.5`).
10. **Given** the built application, **then** it makes no analytics or telemetry request (`APP-17.7`).

## Test plan

Vitest for route parsing including malformed hashes. Playwright for navigation between routes, the not-found
view, and a teardown test that navigates away and back ten times while asserting a single mounted deck. A
network-assertion test in Playwright fails the build if any request leaves the origin.

## Out of scope

What either route renders (T-31, T-32).
