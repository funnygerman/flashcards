# D2 — Three authoring formats, one canonical runtime format

**Status:** accepted

## Context

Both specifications deliberately left the card storage format open — CSV, JSON, or per-card ES modules — and
listed the trade-offs without choosing. Spec-driven tasks cannot be written against an open choice, but the
choice is also genuinely a matter of authoring taste, which changes over the life of a content repository.

## Decision

Support all three, and normalize at build time.

```text
content/cards.csv          ─┐
content/cards/**/*.json    ─┼─> adapter ─> validate ─> emit ─> data/decks/<id>.json
content/cards/**/*.js      ─┘                                   data/cards.json
```

- **Authoring** is the author's choice, and the formats may coexist in one repository.
- **Validation** is shared and runs across all sources together: identifier format, global uniqueness
  including across formats, and dangling deck references. The build fails on any of them.
- **Runtime** is fixed: generated JSON, one file per deck plus a global index. That is all the browser fetches.

For JSON, a file may contain a single card object *or* an array of cards, so `cards/verbs.json` with 200 verbs
and `cards/laufen-to-run.json` with one can sit side by side.

## Consequences

- The content pipeline task grows from one parser to three adapters behind one interface. Each adapter is
  small; the validator and emitter are written once.
- Adding a fourth authoring format later means adding one adapter and changing no runtime code.
- No CSV parser and no per-card `import()` ships to the browser — authoring cost stays at build time, where it
  is paid once by the author rather than repeatedly by every visitor.
- A deck page fetches exactly one file, which is what makes the ~5,000 card target unremarkable.
- Generated files are build output, produced in CI before deployment, never hand-edited.

## Rejected

**Per-card ES modules at runtime**, as the original draft sketched with `import(\`./cards/${key}.js\`)`. One
HTTP request per card does not survive a few hundred cards, and the template-literal specifier defeats static
analysis if a bundler is ever introduced. The format survives as an *authoring* option, where those costs do
not apply.

**Picking one format and closing the question.** Cheaper to build, but the authoring format is the part of
this system the author touches daily, and normalizing at build time makes supporting all three nearly free.
