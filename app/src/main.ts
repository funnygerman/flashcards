/**
 * Application entry point.
 *
 * Scaffolding only (T-00): this exists to prove the import map resolves
 * `@flashcards/library` in a real browser with no bundler involved.
 *
 * The shell and hash router arrive in T-30, the deck page in T-31.
 */

import { VERSION } from "@flashcards/library";

const container = document.querySelector("#app");

if (container) {
  container.setAttribute("data-library-version", VERSION);
  container.textContent = `Scaffold ready — library ${VERSION}. See docs/tasks/README.md.`;
}
