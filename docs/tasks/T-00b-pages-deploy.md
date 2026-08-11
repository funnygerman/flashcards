# T-00b — Continuous Pages deployment

**Milestone:** M0 · **Depends on:** T-00 · **Blocks:** — (T-33 extends the same workflow)
**Requirement IDs covered:** none formally — anticipates `APP-17.5`, `APP-7.2`; see
[D5](../decisions/D5-continuous-pages-deployment.md) for why this task doesn't claim the requirement itself.

## Goal

Publish whatever currently exists in `app/` to GitHub Pages on every push to `main`, so the project is visible
on a real URL, from any device, without a local build — starting now, not at the end of milestone M3.

## Public contract

```text
.github/workflows/deploy.yml
```

Triggered on push to `main`, and manually via `workflow_dispatch`. Pipeline:

```text
install → build → lint → test → assemble _site/ (app/, library/dist/) → upload Pages artifact → deploy
```

## Acceptance criteria

1. **Given** a push to `main`, **when** the workflow runs, **then** the Pages URL serves the current
   `app/index.html`, with `library/dist` reachable at the same relative path the app already uses locally
   (`../library/dist/...`, D4) — no application code changes required.
2. **Given** a failing build, lint, or test step, **then** nothing is deployed (same guarantee T-33 will make
   for the full release).
3. **Given** the Pages URL's root, **then** it redirects to `./app/`, matching the layout `npm run serve`
   already uses locally (`http://localhost:8000/app/`).
4. **Given** the current scaffold, **then** the deployed page shows the same "Scaffold ready" text the local
   dev server shows — proving the pipeline, not a placeholder page committed to the repo.
5. **Given** no content pipeline yet (T-20), **then** this task does not attempt to publish `content/`.

## Test plan

The workflow itself is the test, same posture as T-33. After the first deploy, load the Pages URL by hand and
confirm it matches what `npm run dev` shows locally at that point in the project's history.

## Out of scope

The content pipeline; the release-1.0 "renders a card" smoke check; any base-path handling beyond the
relative paths already in place. All three fold into T-33 once T-31 exists.

## Follow-up: library demo page (T-10)

T-10 adds a library-only demo page at `library/demo/index.html` (its AC13, AC14) — a real `FlashcardDeck`
mounted with a sample deck, no app or content pipeline involved. When T-10 lands, extend this workflow's
`_site/` assembly step to copy `library/demo/` alongside `app/` (and `library/dist/`, which it already needs),
so the library itself is visible on a real device from T-10 onward, well before T-31's deck page exists. No
other part of this workflow changes.
