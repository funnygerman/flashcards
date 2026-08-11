# T-22 — Progress store

**Milestone:** M2 (ships in release 1.1) · **Depends on:** T-00 · **Blocks:** T-32
**Requirements covered:** `APP-8.1`–`APP-8.7`, `APP-14.2`

## Goal

Persist user progress under one `localStorage` key, without a synchronous write on every card view, and
without breaking when storage is unavailable.

## Public contract

```ts
export function createProgressStore(): ProgressStore;

interface ProgressStore {
  recordShown(id: string): void;
  recordGrade(id: string, grade: Grade): void;
  recordDeckVisit(deckId: string): void;
  get(id: string): CardProgress | undefined;
  all(): Record<string, CardProgress>;
  flush(): void;
  readonly persistent: boolean;
}
```

## Acceptance criteria

1. **Given** any progress, **then** it is stored under the single key `fc.v1.progress` in the shape of
   `APP-8.2` (`APP-8.1`, `APP-8.2`).
2. **Given** a `recordShown` call, **then** the in-memory model updates immediately and no write to
   `localStorage` happens synchronously (`APP-8.3`).
3. **Given** pending changes, **when** the debounce timer elapses, or `pagehide` or `visibilitychange` fires,
   **then** the state is written exactly once (`APP-8.3`).
4. **Given** 500 rapid `recordShown` calls, **then** at most a small bounded number of writes occur.
5. **Given** stored state with an older `version`, **when** loaded, **then** the migration for that version
   runs and the result is current (`APP-8.4`).
6. **Given** stored state with a *newer* version than this build understands, **then** it is left untouched
   and treated as empty rather than overwritten (`APP-8.4`).
7. **Given** `localStorage` that throws on read or write (private mode, quota, disabled), **then** the store
   degrades to memory only, `persistent` is `false`, and no call throws (`APP-8.5`).
8. **Given** corrupt JSON in the key, **then** it is treated as empty and the corrupt value is not
   propagated.
9. **Given** serialized state exceeding 1 MB, **then** a single `console.warn` is emitted (`APP-8.7`).
10. **Given** any operation, **then** no card content is written into the store — identifiers and progress
    only (`APP-8.6`).
11. **Given** the state object, **then** it is directly serializable, which is what makes export a
    serialization of one object (`APP-14.2`).

## Test plan

Vitest with fake timers and a mock storage that can be made to throw: debounce counting, flush on lifecycle
events, migration up-and-newer cases, corrupt payload, quota failure, and the size warning. A test asserts the
store's public surface contains no method that writes card content.

## Out of scope

The collection UI (T-32) and export/import (roadmap).
