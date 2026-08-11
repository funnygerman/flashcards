# T-33 — GitHub Pages deployment

**Milestone:** M3 · **Depends on:** T-31 · **Blocks:** —
**Requirements covered:** `APP-17.5`

## Goal

Publish the application to GitHub Pages from CI, with the content build as part of the pipeline.

## Public contract

`.github/workflows/deploy.yml`, triggered on pushes to the default branch:

```text
install → build library → build content → build app → upload Pages artifact → deploy
```

## Acceptance criteria

1. **Given** a push to the default branch, **then** the workflow builds and deploys without manual steps
   (`APP-17.5`).
2. **Given** a failing build, lint, or test step, **then** nothing is deployed.
3. **Given** a project page served from a sub-path, **then** the base path is configurable and all fetches of
   generated content resolve correctly.
4. **Given** the deployed site, **then** the import map resolves the library from the deployed layout, not
   from a local path.
5. **Given** the deployed site, **then** `#/deck/<id>` loads directly on first request, with no server rewrite
   rules involved (`APP-7.5`).
6. **Given** generated content, **then** it is produced by the workflow rather than committed (`APP-6.7`).
7. **Given** a deployment, **then** a smoke check confirms the site returns 200 and renders a card.

## Test plan

The workflow itself is the test; a post-deploy Playwright smoke run against the published URL asserts a card
renders. Base-path handling is verified by building with a sub-path configured and serving the output from a
matching directory locally.

## Out of scope

Custom domains, and any CDN or caching configuration.
