# Roadmap

Features that are specified but deliberately not built in 1.x. Keeping them here is what stops "future" from
leaking into the v1 specifications — the requirement documents describe what is being built now, and
everything below has a milestone instead.

Covers `APP-1.6`, `APP-10.2`, `APP-10.3`, `APP-12.1`–`APP-12.5`, `APP-13.1`, `APP-13.2`, `APP-14.1`,
`APP-14.3`, `APP-18.1`–`APP-18.3`.

## Shipped scope, for reference

| Release | Contents |
|---|---|
| 1.0 | Deck page: open a deck by URL, shuffled session, library rendering |
| 1.1 | Personal collection: progress recorded on view and grade, collection reviewable as a deck |

## M4 — Next

### Catalog and visited decks
`APP-10.2`, `APP-10.3` — a home page listing available decks and the ones opened in this browser.
`visitedDecks` is already recorded in 1.1 (`APP-10.1`), so this is a view over existing data. Local to the
browser unless synchronization arrives.

### Session re-queue
`APP-13.2` — a card graded "hard" reappears later in the same session. Purely in-memory; no persistence, and
no interaction with scheduling. Note that "know / don't know" no longer exists as a separate feature
(`APP-13.1`) — it is the grading gesture from [D1](decisions/D1-library-events.md).

### Export / import
`APP-14.1`, `APP-14.3` — download the progress state as a file and load it in another browser. The
single-key state shape (`APP-8.2`) makes export a serialization of one object. Must work without an account
or backend. Import needs a merge strategy decision: replace, or union by most-recent `lastSeen`.

## M5 — Review scheduling

`APP-12.1`–`APP-12.5` — the reason grading exists.

- Evaluate FSRS before writing anything custom (`APP-12.4`).
- Review data stays user-specific and never enters static card content (`APP-12.1`).
- The `grade` captured in 1.1 is the input this builds on (`APP-12.2`).
- Ordering becomes scheduling-driven, with unreviewed cards randomized (`APP-11.4`).
- Likely extends the per-card record to `lastReviewed`, `nextDue`, `interval`, `easeFactor`, `repetitions`
  (`APP-12.3`).

## M6 — Storage and offline

- **IndexedDB** — the escape hatch when progress outgrows `localStorage`. The store warns past 1 MB
  (`APP-8.7`); see [D2b](decisions/D2b-single-storage-key.md). Asynchronous and indexed, so one record per
  card becomes the right shape there.
- **Offline support** — a service worker caching the shell and generated content. This is also the most
  likely trigger for revisiting the no-bundler decision ([D4](decisions/D4-typescript-no-bundler.md)).

## Unscheduled

Tracked so they are not rediscovered as surprises. None has a concrete use case yet, and per `APP-15.3` no
abstraction should be introduced in advance of one.

| Item | Note |
|---|---|
| Device synchronization | Needs a backend or a third-party store; breaks `APP-7.1` and needs its own decision record |
| Optional accounts, cloud backup | Same |
| Multiple card repositories | The adapter interface (`APP-6.4`) already anticipates the shape |
| Additional deck types | e.g. generated or filtered decks |
| Richer card content, audio, images | Out of scope for the library in v1 (`LIB-10.3`); would change `LIB-2.1` |
| Automated bidirectional cards | Deliberately manual today (`APP-15.2`) |
| Category filtering | `category` is carried through but unused (`APP-15.4`) |
| Additional UI languages | Strings are already isolated in one module (`APP-15.5`) |
| Dark mode in the library | Non-goal for v1 (`LIB-4.34`); custom properties make it an application concern today |
| RTL arrow-key semantics | Documented limitation (`LIB-9.6`) |

## Adding to this document

A feature belongs here, not in the requirement documents, until it has a release. When it gets one, move its
requirements into the relevant specification with new IDs and add a task spec — do not renumber existing IDs.
