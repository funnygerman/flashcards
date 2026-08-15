import js from "@eslint/js";

export default [
  {
    ignores: ["**/node_modules/**"],
  },

  js.configs.recommended,

  {
    rules: {
      /* V2-2.6: card content is written with textContent only. Building DOM
         from HTML strings is what makes "content must never be interpreted as
         markup" violable, so it is banned outright rather than reviewed case by
         case. It has been enforced since the first commit so it can never creep
         in, and deck.js builds even the page's own furniture this way rather
         than relaxing the rule where it happens to be safe (V2-14.5). */
      "no-restricted-properties": [
        "error",
        { property: "innerHTML", message: "V2-2.6: use textContent — card content must never be parsed as HTML." },
        { property: "outerHTML", message: "V2-2.6: use textContent — card content must never be parsed as HTML." },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: "V2-2.6: use textContent — card content must never be parsed as HTML.",
        },
        {
          selector: "CallExpression[callee.property.name='write'][callee.object.name='document']",
          message: "V2-2.6: document.write is not used.",
        },
      ],

      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  {
    /* Dev tooling runs in Node, not the browser. Declared inline rather than
       pulling in the `globals` package for two identifiers. */
    files: ["scripts/**/*.mjs", "*.config.js"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly" },
    },
  },

  {
    /* v2/ is plain browser JavaScript with no build step, so the globals it
       uses are declared here rather than coming from a TypeScript DOM lib. */
    files: ["v2/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        localStorage: "readonly",
        console: "readonly",
        Element: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        setTimeout: "readonly",
        DOMException: "readonly",
        globalThis: "readonly",
      },
    },
  },
];
