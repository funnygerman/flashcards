# Decision Records

Short records of the decisions that shaped the specifications. Each states the context, the decision, its
consequences, and what was rejected — so that a future reader can tell an intentional choice from an accident.

| ID | Decision | Affects |
|---|---|---|
| [D1](D1-library-events.md) | The library reports events; it renders no application controls | `LIB-6.7`–`LIB-6.13`, `LIB-5.8`–`LIB-5.11` |
| [D1b](D1b-collection-is-everything-seen.md) | The personal collection is every card seen, not an opt-in list | `APP-9.*` |
| [D2](D2-authoring-formats.md) | Three authoring formats, one canonical runtime format | `APP-6.*` |
| [D2b](D2b-single-storage-key.md) | All user progress lives under one `localStorage` key | `APP-8.*` |
| [D3](D3-release-split.md) | Release 1.0 is the deck page; the collection follows in 1.1 | `APP-1.4`–`APP-1.7` |
| [D4](D4-typescript-no-bundler.md) | TypeScript compiled by `tsc`, no bundler | `APP-17.1`–`APP-17.2` |

## Superseded by these decisions

Statements in earlier drafts that these decisions overrode:

- Up/down gestures were "outside the initial implementation" — D1 moved them into v1.
- "Know / don't know" was a separate session feature — D1 folded it into grading.
- The personal dictionary was an opt-in save — D1b replaced it.
- The storage format was "intentionally left open" — D2 closed it.
