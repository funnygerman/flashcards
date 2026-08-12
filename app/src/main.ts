/**
 * Application entry point (T-30).
 *
 * Wires the three routes the shell knows about. `#/deck/:id` and
 * `#/dictionary` get their real content in T-31 and T-32 (release 1.1); both
 * mount placeholders here. `"*"` is the required not-found fallback
 * (APP-7.6).
 */
import { startRouter } from "./router.js";
import type { Route } from "./router.js";
import { mountDeckView } from "./views/deckView.js";
import { mountDictionaryView } from "./views/dictionaryView.js";
import { mountNotFoundView } from "./views/notFoundView.js";

const routes: Route[] = [
  { path: "/deck/:id", mount: mountDeckView },
  { path: "/dictionary", mount: mountDictionaryView },
  { path: "*", mount: mountNotFoundView },
];

startRouter(routes);
