# Content

Card authoring sources. Empty until [T-20](../docs/tasks/T-20-content-pipeline.md) builds the pipeline.

Three formats will be supported here, and they may coexist — see
[D2](../docs/decisions/D2-authoring-formats.md):

```text
content/cards.csv           one row per card
content/cards/**/*.json     one card object, or an array of cards
content/cards/**/*.js       ES module with a default-exported card
```

`npm run build:content` will validate these (identifier format, global uniqueness across formats, dangling
deck references) and emit the canonical runtime format into `data/`, which is generated and git-ignored.

Nothing in this directory is fetched by the browser — authoring formats are a build-time concern only
(`APP-6.8`).
