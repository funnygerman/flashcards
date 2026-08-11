# Implementation Tasks

Each task is implementable by one person holding only its own spec plus the *contracts* of its dependencies —
not their implementations. Tasks are the unit of work; requirements are the unit of truth.

## Working rule

**Specs are the source of truth.** An implementation may not change a requirement to match the code. If a
requirement turns out to be wrong or impossible, change the requirement first — in
[`../library/requirements.md`](../library/requirements.md) or [`../app/requirements.md`](../app/requirements.md),
with a decision record in [`../decisions/`](../decisions/) when the change is structural — and then write the
code against it.

Every task cites the requirement IDs it implements, and tests are expected to name them.

## Task template

```text
Goal · Depends on · Requirement IDs covered · Public contract
Acceptance criteria (Given / When / Then) · Test plan · Out of scope
```

## Milestones

| Milestone | Tasks | Outcome |
|---|---|---|
| **M0** foundations | [T-00](T-00-scaffold.md) | Workspace, build, tests, CI |
| **M1** library | [T-01](T-01-types-and-config.md) · [T-02](T-02-sizing-engine.md) · [T-03](T-03-dom-skeleton.md) · [T-04](T-04-card-rendering.md) · [T-05](T-05-flip.md) · [T-06](T-06-gesture-engine.md) · [T-07](T-07-chrome.md) · [T-08](T-08-accessibility.md) · [T-09](T-09-title-and-info.md) · [T-10](T-10-public-api.md) | `FlashcardDeck`, published |
| **M2** data layer | [T-20](T-20-content-pipeline.md) · [T-21](T-21-resolver.md) · [T-22](T-22-progress-store.md) | Content pipeline, resolver, progress store |
| **M3** release 1.0 | [T-30](T-30-app-shell.md) · [T-31](T-31-deck-page.md) · [T-33](T-33-deploy.md) | Deck page, deployed |
| **M3.1** release 1.1 | [T-32](T-32-collection.md) | Personal collection |
| **M4** roadmap | — | See [`../roadmap.md`](../roadmap.md) |

## Dependency graph

```text
                    ┌─> T-02 ────────────────────────┐
T-00 ──┬─> T-01 ────┼─> T-03 ─> T-04,T-05,T-06,T-07, ┼─> T-10 ─┐
       │            │           T-08,T-09            │         │        release 1.0
       │            └─> T-20 ─> T-21 ────────────────┴─────────┼─> T-31 ──> T-33
       │                                                       │      ↑
       └─> T-30 ──────────────────────────────────────────────-┴──────┘
                                                                          release 1.1
           T-22 ──────────────────────────────────────────────> T-32 ──────┘
```

Critical path to release 1.0: `T-00 → T-01 → T-03 → T-05/T-06 → T-10 → T-31 → T-33`.

T-02, the T-20/T-21 data track, T-22, and T-30 all run parallel to that path. Only T-22 and T-32 are
1.1-exclusive, which is what makes shipping the deck page first an ordering choice rather than a scope cut
(see [D3](../decisions/D3-release-split.md)).

## Requirement coverage

Every requirement ID belongs to exactly one task, or is explicitly deferred to the roadmap.

### Library

| Task | Requirement IDs |
|---|---|
| T-01 | `LIB-1.1`–`1.5`, `2.1`–`2.9`, `6.14`, `6.15`, `7.11`, `7.12`, `9.5` |
| T-02 | `LIB-4.3`–`4.10`, `4.13` |
| T-03 | `LIB-4.1`, `4.2`, `4.32`–`4.34`, `6.5`, `7.1`–`7.10`, `9.4` |
| T-04 | `LIB-3.1`–`3.7`, `4.11`, `4.12`, `4.14`, `4.29`–`4.31` |
| T-05 | `LIB-4.35`, `4.36`, `5.12`–`5.15`, `5.20`, `5.22` |
| T-06 | `LIB-5.1`–`5.11`, `5.16`, `5.17` |
| T-07 | `LIB-4.15`–`4.18`, `5.18`, `5.19`, `6.3`, `6.4` |
| T-08 | `LIB-5.21`, `5.23`, `8.1`–`8.9` |
| T-09 | `LIB-4.19`–`4.28` |
| T-10 | `LIB-6.1`, `6.2`, `6.6`–`6.13`, `9.1`–`9.3`, `9.6`, `10.1`–`10.4` |

### Application

| Task | Requirement IDs |
|---|---|
| T-00 | `APP-17.1`–`17.4`, `17.6` |
| T-20 | `APP-3.1`–`3.7`, `4.1`–`4.5`, `6.1`–`6.9`, `15.1`–`15.4`, `16.1`–`16.4` |
| T-21 | `APP-2.1`, `2.2`, `2.4`, `2.5`, `5.1`–`5.5` |
| T-22 | `APP-8.1`–`8.7`, `14.2` |
| T-30 | `APP-2.3`, `2.6`, `7.1`–`7.8`, `15.5`, `17.7` |
| T-31 | `APP-1.1`–`1.4`, `1.7`, `5.6`, `11.1`–`11.4` |
| T-32 | `APP-1.5`, `9.1`–`9.10`, `10.1` |
| T-33 | `APP-17.5` |
| roadmap | `APP-1.6`, `10.2`, `10.3`, `12.1`–`12.5`, `13.1`, `13.2`, `14.1`, `14.3`, `18.1`–`18.3` |
