import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      /* Tests run against library source, not its build output, so `npm test`
         works on a clean checkout without building first. */
      "@flashcards/library": fileURLToPath(new URL("./library/src/index.ts", import.meta.url)),
    },
  },
  test: {
    /* jsdom is the only DOM available: no layout, no CSS engine. Requirements
       depending on rendered geometry are verified manually — see the testing
       posture note in docs/tasks/T-00-scaffold.md. */
    environment: "jsdom",
    include: [
      "library/src/**/*.test.ts",
      "app/src/**/*.test.ts",
      "scripts/content-pipeline/**/*.test.mjs",
      "v2/src/**/*.test.js",
    ],
    globals: false,
  },
});
