import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    /* jsdom is the only DOM available: no layout, no CSS engine. Requirements
       that depend on rendered geometry — card size, the corner mark clearing
       the card, an arriving card carrying its mark before it lands — are
       verified in a real browser instead, and the traces recorded in the pull
       request that changed them. */
    environment: "jsdom",
    include: ["v2/src/**/*.test.js"],
    globals: false,
  },
});
