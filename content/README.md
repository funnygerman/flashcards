# Content

Card authoring sources, built by [T-20](../docs/tasks/T-20-content-pipeline.md)'s pipeline.

Three formats are supported here, and they may coexist — see
[D2](../docs/decisions/D2-authoring-formats.md):

```text
content/cards.csv           one row per card
content/cards/**/*.json     one card object, or an array of cards
content/cards/**/*.js       ES module with a default-exported card
```

Decks are defined separately, one JSON file per deck, under `content/decks/*.json`:

```json
{
  "id": "everyday-german",
  "title": "Everyday German",
  "description": "…",
  "cards": ["laufen-to-run", "gehen-to-go", "zelle-cell"]
}
```

`npm run build:content` validates all of this together (identifier format, global uniqueness across formats,
dangling deck references, per-card filename/id agreement) and emits the canonical runtime format into `data/`,
which is generated and git-ignored. The build is all or nothing: any validation failure writes zero output
files.

Nothing in this directory is fetched by the browser — authoring formats are a build-time concern only
(`APP-6.8`).

`content/decks/everyday-german.json` plus the ~20 cards it references are the demo deck required by
`APP-16.4`.
