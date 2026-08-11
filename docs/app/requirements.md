# Flashcard Learning Application & Data Requirements

**Status:** specification · **Applies to:** `app/`, `content/` · **Requirement IDs:** `APP-*`

Every normative statement carries a stable ID (`APP-8.2`). Task specs in [`../tasks/`](../tasks/) cite these
IDs. IDs are never reused or renumbered.

Decisions that shaped this document are recorded in [`../decisions/`](../decisions/).

---

## 1. Purpose

**APP-1.1** This document describes the application built on top of the generic Flashcard Library.

**APP-1.2** The application provides: language-learning content; reusable cards; multiple decks; a personal
collection; local learning progress; and, later, spaced repetition.

**APP-1.3** The application owns **content management and learning state**. The library owns presentation and
interaction.

### 1.1 Releases

**APP-1.4** **Release 1.0** ships the deck page only: open a deck by URL, shuffled session, cards rendered by
the library. No stored progress.

**APP-1.5** **Release 1.1** adds the personal collection: progress recording and the collection page.

**APP-1.6** Everything else is specified in [`../roadmap.md`](../roadmap.md) and is not built in 1.x.

**APP-1.7** The 1.0 application does not subscribe to `onGrade`, even though the library emits it. Grading
gestures work and do nothing until 1.1. *This is what makes the 1.0/1.1 split an ordering choice rather than a
scope cut.*

---

## 2. Relationship to the Flashcard Library

**APP-2.1** The application converts its stored content into `Flashcard[]` and passes the resolved cards to
the library:

```text
Content / User Data
        ↓
Application Data Layer
        ↓
     Flashcard[]
        ↓
  Flashcard Library
        ↓
       UI
```

**APP-2.2** The application is independent of the library's internal implementation.

**APP-2.3** The application consumes the library through the published package interface only — never by
reaching into its DOM or CSS classes.

**APP-2.4** The application may attach its own properties (notably `id`) to the objects it passes; the library
ignores them (`LIB-2.5`).

**APP-2.5** The application maps a library index back to a card ID using the array it built. It must keep that
array, in order, for the lifetime of the mounted deck.

**APP-2.6** The application renders any of its own controls **outside** the library container, because the
library provides no slots (`LIB-6.13`).

---

## 3. Card Identity

**APP-3.1** Every logical card — one specific piece of content with one specific meaning — has exactly one
stable identifier.

**APP-3.2** These are separate cards and must never overwrite each other:

```text
laufen → to run
laufen → to operate
```

**APP-3.3** An identifier, once assigned, is never changed and never reused for different content.

**APP-3.4** Identifier format: `^[a-z0-9]+(-[a-z0-9]+)*$`, at most 64 characters. Human-readable where
practical (`laufen-to-run`, `capital-of-france`).

**APP-3.5** Identifiers are globally unique across the whole card repository, not merely within a deck.

**APP-3.6** The content build (§6) **fails** on: a malformed identifier; a duplicate identifier, including
across two different authoring formats; or a deck referencing an identifier that does not exist.

**APP-3.7** Where cards are authored as one file per card, the filename is the identifier and must match the
`id` field if one is present.

---

## 4. Card Repository

**APP-4.1** The application maintains a reusable repository of cards.

**APP-4.2** A card does not belong exclusively to one deck. The same card may be referenced by multiple decks,
by the personal collection, and by future review sessions.

**APP-4.3** Card content is never duplicated between decks.

**APP-4.4** Card content is static and is never modified as a result of a user reviewing a card
(see `APP-8.6`).

**APP-4.5** The repository is designed for up to ~5,000 cards. Beyond that, the runtime format
(`APP-6.6`) should be revisited before the authoring format.

---

## 5. Decks

**APP-5.1** A deck is a collection of references to cards, not a copy of card content.

```js
const DECK_DATA = {
  id: "everyday-german",
  title: "Everyday German",
  description: "…",
  cards: ["laufen-to-run", "gehen-to-go", "zelle-cell"]
};
```

**APP-5.2** The application resolves identifiers into `Flashcard` objects before initializing the library.

**APP-5.3** A deck may carry: id; title; description; cover/title text; information-panel text; card
references; and other application-specific metadata.

**APP-5.4** Deck metadata must not be added to the generic `Flashcard` structure.

**APP-5.5** Deck metadata maps to library configuration as follows:

| Deck field | Library configuration |
|---|---|
| `title`, `cover` | title screen content (`LIB-4.19`–`LIB-4.24`) |
| `description`, `info` | application section of the information panel (`LIB-4.27`) |

**APP-5.6** The application decides per mount whether to pass title configuration at all — that decision, not
a library flag, is what makes a title screen appear once (`LIB-4.24`). In 1.x the title screen is shown on the
first mount of a deck per browsing session, tracked in `sessionStorage`.

---

## 6. Content Authoring and Build

**APP-6.1** Three authoring formats are supported, and the author chooses freely between them:

| Location | Format |
|---|---|
| `content/cards.csv` | one row per card |
| `content/cards/**/*.json` | each file is one card object **or** an array of cards |
| `content/cards/**/*.js` | ES module with a default-exported card object |

**APP-6.2** Formats may coexist in one repository. Validation (`APP-3.6`) runs across all sources together.

**APP-6.3** Recommended default: one JSON file per topic or deck — bulk-editable, while a syntax error damages
one topic rather than the whole corpus.

**APP-6.4** Each format is handled by an adapter behind a single interface; the validator and the emitter are
shared. Adding a fourth format means adding one adapter and changing no runtime code.

**APP-6.5** `npm run build:content` runs adapters → validator → emitter.

**APP-6.6** The build emits the **canonical runtime format**, which is the only thing the browser ever fetches:

```text
data/decks/<deck-id>.json   resolved cards for one deck, in deck order
data/cards.json             global index of all cards, for the collection
```

**APP-6.7** Generated files are build output. They are not hand-edited, and they are produced in CI before
deployment.

**APP-6.8** No CSV parser and no per-card ES module loading ships to the browser. Authoring formats are a
build-time concern exclusively.

**APP-6.9** A deck page fetches exactly one file (`APP-6.6`) to render a deck.

---

## 7. Static / No-Login Architecture

**APP-7.1** The application requires no user accounts, no login, no backend, and no server-side user storage.

**APP-7.2** Static hosting (GitHub Pages) is supported.

**APP-7.3** A user can use the application without creating an account.

**APP-7.4** User-specific state is stored locally in the browser.

### 7.1 Routing

**APP-7.5** The application is a single `index.html` using hash-based routing, which needs no server rewrite
rules on static hosts:

```text
#/deck/<deck-id>    a deck session
#/dictionary        the personal collection   (1.1)
```

**APP-7.6** An unknown or missing route renders a not-found view listing the available decks, rather than a
blank page or an error.

**APP-7.7** The deck container is set to `height: 100dvh` by the application (`LIB-7.10`).

**APP-7.8** Navigating between routes calls `destroy()` (`LIB-6.5`) on the mounted deck before mounting the
next one.

---

## 8. Local User State

**APP-8.1** `localStorage` is the storage mechanism for user state in 1.x.

**APP-8.2** All user state lives under a **single key**, `fc.v1.progress`:

```ts
interface ProgressState {
  version: number;
  cards: Record<string, {
    seenCount: number;
    lastSeen: string;      // ISO date
    grade?: "easy" | "hard";
  }>;
  visitedDecks: string[];
  prefs: Record<string, unknown>;
}
```

**APP-8.3** The in-memory model is the source of truth. Writes are debounced and flushed on a timer and on
`pagehide` / `visibilitychange`, so recording a card view never blocks on a synchronous whole-blob write.

**APP-8.4** `version` drives a migration function applied on load. An unknown future version is left untouched
and treated as empty rather than being overwritten.

**APP-8.5** All access goes through a wrapper that degrades to in-memory-only when storage is unavailable or
throws (Safari private mode, quota exceeded, storage disabled). The application must stay usable in that
state, silently, aside from one non-blocking notice.

**APP-8.6** Source card content is never modified by user activity. User state and content are separate stores.

**APP-8.7** The store warns in the console when the serialized state exceeds 1 MB — the signal to move to
IndexedDB ([`../roadmap.md`](../roadmap.md)).

---

## 9. Personal Collection

**APP-9.1** The collection is **every card the user has seen**. There is no save button and no explicit save
action anywhere in the application.

**APP-9.2** A card enters the collection when the library reports `onCardShown` (`LIB-6.8`) — that is, once it
has been on screen for ≥ 400 ms or has been flipped.

**APP-9.3** `onCardShown` increments `seenCount` and updates `lastSeen`.

**APP-9.4** `onGrade` (`LIB-6.11`) sets `grade` for that card, overwriting any previous value.

**APP-9.5** The collection stores card identifiers and progress, never duplicated card content.

**APP-9.6** The collection is global and independent of the deck a card was first seen in.

**APP-9.7** Opening the collection resolves stored identifiers into `Flashcard[]` and mounts them as an
ordinary deck:

```text
stored card IDs → resolve → Flashcard[] → FlashcardDeck
```

**APP-9.8** The collection view can be ordered by last seen or by grade. Default: most recently seen first.

**APP-9.9** Identifiers whose card no longer exists in the repository are skipped when resolving, retained in
storage (so that re-adding the card restores it), and reported to the user as a count.

**APP-9.10** The collection is a 1.1 feature (`APP-1.5`).

---

## 10. Visited Decks

**APP-10.1** `visitedDecks` (`APP-8.2`) records the decks opened in this browser.

**APP-10.2** A catalog page displaying them is roadmap work, not 1.x.

**APP-10.3** This history is local to the browser unless a future synchronization mechanism is introduced.

---

## 11. Ordering

**APP-11.1** Cards are shuffled at the start of every deck session.

**APP-11.2** A session is one deck page load. The order stays stable for its duration.

**APP-11.3** The shuffle is a seeded Fisher–Yates; the seed is kept in `sessionStorage` per deck, so reloading
the tab preserves the order while a new tab or a later visit reshuffles.

**APP-11.4** Later: review scheduling may determine order, with unreviewed cards randomized.

---

## 12. Review and Spaced Repetition

**APP-12.1** Review data is user-specific and is never stored as part of static card content.

**APP-12.2** The `grade` captured in 1.1 (`APP-9.4`) is the input a future scheduler will build on.

**APP-12.3** A future review record may extend to:

```ts
review: {
  lastReviewed: string;
  nextDue: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}
```

**APP-12.4** An existing algorithm such as FSRS is to be evaluated before a custom one is written.

**APP-12.5** Scheduling is roadmap work, not 1.x.

---

## 13. Session-Level Learning

**APP-13.1** "Know / don't know" no longer exists as a separate feature — it is the same interaction as
grading (`LIB-5.8`), and its persistent form is `APP-9.4`.

**APP-13.2** Re-queueing a difficult card within the current session is roadmap work.

---

## 14. Export / Import

**APP-14.1** Export and import of the local progress state is roadmap work.

**APP-14.2** The single-key state shape (`APP-8.2`) is chosen partly so that export is a serialization of one
object.

**APP-14.3** Export/import must work without an account or backend.

---

## 15. Multilingual Content

**APP-15.1** No particular language direction is imposed. `German → English` and `English → German` are
equally valid, as are any other pairs.

**APP-15.2** Bidirectional learning is not automated. Opposite directions are represented as separate cards or
separate decks.

**APP-15.3** No further multilingual abstraction is introduced until a concrete use case requires it.

**APP-15.4** `category` is carried through the pipeline and passed to the library, but the application
provides no category filtering UI in 1.x. This is deliberate.

**APP-15.5** Application UI text is English in 1.x, with all user-facing strings collected in one module so
that translation later touches one file.

---

## 16. Content Maintenance

**APP-16.1** The repository must remain maintainable at hundreds to thousands of cards.

**APP-16.2** CSV authoring (`APP-6.1`) exists for bulk editing, spreadsheet compatibility, and simple
import/export of content.

**APP-16.3** The library never becomes dependent on CSV, or on any other authoring format (`APP-6.8`).

**APP-16.4** A demo deck of roughly 20 German cards is maintained in the repository so that every task has
something real to render.

---

## 17. Quality and Delivery

**APP-17.1** Implementation language and tooling: TypeScript compiled by `tsc` to plain ES modules, with no
bundler. The application resolves the library through an import map in `index.html`.

**APP-17.2** Workspace layout: npm workspaces, `library/` and `app/`. The application depends on
`@flashcards/library` via the workspace link; the library is not published externally in 1.x.

**APP-17.3** Testing: Vitest with jsdom for the content pipeline, resolver, and progress store; Playwright for
a deck-page smoke test. Library-side testing is specified in `LIB` tasks.

**APP-17.4** CI runs build, lint, unit tests, and Playwright tests on every push.

**APP-17.5** Deployment: a GitHub Actions workflow builds the library, then the content, then the application,
and publishes to GitHub Pages. The base path is configurable for project pages.

**APP-17.6** `file://` is not a supported way to run the application; a static HTTP server is required.

**APP-17.7** The application collects no analytics and sends no telemetry.

---

## 18. Future Architecture

**APP-18.1** The application remains independent of the library's internals.

**APP-18.2** Possible future additions — multiple repositories, additional deck types, offline support,
IndexedDB, import/export, device synchronization, optional accounts, cloud backup, spaced repetition, richer
card content, audio and images, additional languages — are tracked in [`../roadmap.md`](../roadmap.md).

**APP-18.3** Such additions belong to the application layer unless they are directly required by the generic
presentation component.
