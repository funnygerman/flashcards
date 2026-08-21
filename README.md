# Flashcards

Flashcards in the browser. One card on the screen and nothing else on it, a swipe to say whether you
knew it, and a Leitner schedule deciding when you see it again.

No accounts, no server, no build step to develop it, no runtime dependencies: `npm run serve` loads the
sources in this repository exactly as they are, and everything you have studied lives in your own
`localStorage`. The deployed site is the one exception — `npm run build` bundles and minifies `v2/src` into
`v2/dist` purely to cut what a reader's phone downloads; nothing about developing, testing, or forking this
repository needs it.

**Live:** [Everyday German](https://funnygerman.github.io/flashcards/v2/decks/everyday-german.html) ·
[Numbers and Time](https://funnygerman.github.io/flashcards/v2/decks/numbers-and-time.html) ·
[everything you have seen](https://funnygerman.github.io/flashcards/v2/dictionary.html)

## Running it

```sh
npm ci
npm run serve   # then open http://localhost:8000/v2/decks/everyday-german.html
```

ES modules do not load over `file://`, which is the only reason a server is needed at all.

```sh
npm test        # vitest, jsdom
npm run lint    # eslint
npm run build   # bundles + minifies v2/src into v2/dist, for deployment only
```

## A deck

One HTML file is one deck: its cards, and one call.

```html
<script type="module">
  import { openDeck } from "../src/deck.js";

  openDeck([
    { key: "wasser-water", frontText: "das Wasser", backText: "water", category: "noun" },
    { key: "laufen-to-run", frontText: "laufen", frontDetails: "on foot", backText: "to run" },
  ]);
</script>
```

## Where things are

```text
v2/README.md            how it works, and why it works that way
v2/docs/requirements.md what it is, statement by statement (`V2-*`)
v2/src/                 the library, the schedule, and the page that assembles them
v2/decks/               one file per deck
v2/dictionary.html      every card you have opened, as a deck
v2/dist/                built by npm run build; deployment's minified v2/src, not committed
scripts/dev-server.mjs  a static file server, because file:// cannot load modules
scripts/build.mjs       bundles + minifies v2/src for the deployed site only
```

Start with [`v2/README.md`](v2/README.md).

## History

This is the second attempt. The first — a TypeScript library, a separate application, a content pipeline
and a specification split across `LIB-*`, `APP-*` and a task graph — was retired once v2 did the same job
in a tenth of the code with no build step. It is gone from the tree; `git log` has it if you want it.
Everything that was still true about card sizing and content handling was carried across and is written
down in `v2/docs/requirements.md`.
