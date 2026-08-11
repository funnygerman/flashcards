# D5 — Deploy to GitHub Pages continuously, starting before release 1.0

**Status:** accepted

## Context

T-33 originally deployed to GitHub Pages only once the whole release-1.0 deck page (T-31) existed, so the
first time anyone could look at the project on a phone without running a local server was near the end of
milestone M3. D3 already established the value of getting real cards onto a real screen early, for the
application's own UI ("a card that looks wrong on a phone is worth discovering before any storage code
exists"). The same argument applies one level earlier: seeing *any* build artifact on a real device throughout
M1 and M2, not only the finished deck page, catches layout and tooling problems sooner and needs no local
build to check.

## Decision

A new task, **T-00b**, stands up `.github/workflows/deploy.yml` immediately after T-00. It builds and
publishes whatever currently exists in `app/` (plus `library/dist`) to GitHub Pages on every push to `main`.
Today that is the T-00 scaffold page; it becomes the T-10 demo page, and eventually the T-31 deck page,
automatically as those tasks land — the workflow itself does not change in between.

T-33 keeps ownership of `APP-17.5` in the requirement-coverage table and is not renumbered or removed. T-33 is
the task that hardens the *same* workflow file for release 1.0: folding in the content-pipeline build step,
the base-path handling, and the "renders a card" smoke check that only make sense once T-31 exists. T-00b is a
strict subset of T-33's eventual behaviour, not a competing implementation, and the workflow file is edited in
place by T-33 rather than replaced.

## Consequences

- Every push to `main` is visible on a real URL, from any device, starting right after T-00b — no local build
  required to check progress.
- `T-00b` does not formally claim `APP-17.5` in the requirement-coverage table; `T-33` still does, since
  `T-00b`'s workflow does not yet meet every one of `T-33`'s acceptance criteria (no content pipeline, no
  real-card smoke check, no project-page base-path exercise beyond the relative paths already in place from
  D4).
- One-time manual setup outside version control: GitHub Pages must be switched to "Source: GitHub Actions" in
  the repository settings before the workflow's first run can publish anything.
- `app/index.html`'s import map already uses paths relative to the document (D4), so no application code
  changes were needed to make this work under a project-page sub-path.

## Rejected

**Wait for T-33 as originally sequenced.** Correct per the original task graph, but it means nobody sees a
real deployment until release 1.0 is functionally complete — the exact risk D3 already flagged for the
application's UI, recurring one layer out, for the whole M1/M2 span.
