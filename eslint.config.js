import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "data/**"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      /* LIB-3.4: card content is written with textContent only. Building DOM
         from HTML strings is what makes LIB-3.3 ("content must never be
         interpreted as HTML") violable, so it is banned outright rather than
         reviewed case by case. Enforced from T-00 so it can never creep in. */
      "no-restricted-properties": [
        "error",
        { property: "innerHTML", message: "LIB-3.4: use textContent — card content must never be parsed as HTML." },
        { property: "outerHTML", message: "LIB-3.4: use textContent — card content must never be parsed as HTML." },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: "LIB-3.4: use textContent — card content must never be parsed as HTML.",
        },
        {
          selector: "CallExpression[callee.property.name='write'][callee.object.name='document']",
          message: "LIB-3.4: document.write is not used.",
        },
      ],

      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  {
    files: ["**/*.test.ts"],
    rules: {
      "no-restricted-properties": "off",
    },
  },

  {
    /* Build and dev tooling runs in Node, not the browser. Declared inline
       rather than pulling in the `globals` package for two identifiers. */
    files: ["scripts/**/*.mjs", "*.config.ts"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly" },
    },
  },

  {
    /* T-10: the library's plain-JS demo page (library/demo/index.html) runs
       in the browser only — no TS project backs it (unlike app/src and
       library/src, where the DOM lib already covers these), so its globals
       are declared the same way as the Node ones above. */
    files: ["library/demo/**/*.js"],
    languageOptions: {
      globals: { document: "readonly", window: "readonly", console: "readonly" },
    },
  },

  {
    /* v2/ is plain browser JavaScript with no build step and no TS project
       behind it, so its globals are declared the same way as the demo's. */
    files: ["v2/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        localStorage: "readonly",
        console: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        DOMException: "readonly",
        globalThis: "readonly",
      },
    },
  },
);
