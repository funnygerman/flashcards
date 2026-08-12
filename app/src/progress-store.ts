/**
 * Local progress store (T-22).
 *
 * Persists user progress under the single `fc.v1.progress` localStorage key
 * (APP-8.1, APP-8.2). The in-memory model is the source of truth; writes are
 * debounced and flushed on a timer or a page lifecycle event (APP-8.3), and
 * storage failures degrade the store to memory-only rather than throwing
 * (APP-8.5).
 */

import type { Grade } from "@flashcards/library";

const STORAGE_KEY = "fc.v1.progress";
const CURRENT_VERSION = 1;
const DEBOUNCE_MS = 500;
const MAX_SERIALIZED_BYTES = 1024 * 1024;

export interface CardProgress {
  seenCount: number;
  lastSeen: string; // ISO date
  grade?: Grade;
}

interface ProgressState {
  version: number;
  cards: Record<string, CardProgress>;
  visitedDecks: string[];
  prefs: Record<string, unknown>;
}

export interface ProgressStore {
  recordShown(id: string): void;
  recordGrade(id: string, grade: Grade): void;
  recordDeckVisit(deckId: string): void;
  get(id: string): CardProgress | undefined;
  all(): Record<string, CardProgress>;
  flush(): void;
  readonly persistent: boolean;
}

function emptyState(): ProgressState {
  return { version: CURRENT_VERSION, cards: {}, visitedDecks: [], prefs: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Keyed by the version a migration upgrades FROM. Version 0 predates
 * `visitedDecks` and `prefs`; only `cards` carries forward.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  0: (raw) => ({ version: 1, cards: raw.cards, visitedDecks: [], prefs: {} }),
};

function sanitize(candidate: Record<string, unknown>): ProgressState {
  const cards: Record<string, CardProgress> = {};
  if (isRecord(candidate.cards)) {
    for (const [id, value] of Object.entries(candidate.cards)) {
      if (!isRecord(value) || typeof value.seenCount !== "number" || typeof value.lastSeen !== "string") continue;
      const grade = value.grade === "easy" || value.grade === "hard" ? value.grade : undefined;
      cards[id] = { seenCount: value.seenCount, lastSeen: value.lastSeen, ...(grade ? { grade } : {}) };
    }
  }

  const visitedDecks = Array.isArray(candidate.visitedDecks)
    ? candidate.visitedDecks.filter((deckId): deckId is string => typeof deckId === "string")
    : [];

  const prefs = isRecord(candidate.prefs) ? candidate.prefs : {};

  return { version: CURRENT_VERSION, cards, visitedDecks, prefs };
}

/**
 * Runs the migration chain for `raw`. Returns `undefined` for anything that
 * doesn't land on `CURRENT_VERSION` — including a newer, not-yet-understood
 * version, which the caller then treats as empty rather than migrating or
 * overwriting (APP-8.4).
 */
function migrate(raw: unknown): ProgressState | undefined {
  if (!isRecord(raw) || typeof raw.version !== "number") return undefined;

  let candidate = raw;
  while (typeof candidate.version === "number" && candidate.version < CURRENT_VERSION) {
    const step = MIGRATIONS[candidate.version];
    if (!step) return undefined;
    candidate = step(candidate);
  }

  if (candidate.version !== CURRENT_VERSION) return undefined;
  return sanitize(candidate);
}

function readLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

export function createProgressStore(): ProgressStore {
  let storage = readLocalStorage();
  let persistent = storage !== undefined;
  let state = emptyState();
  let migrated = false;

  if (storage) {
    let raw: string | null = null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      persistent = false;
      storage = undefined;
    }

    if (raw !== null) {
      try {
        const parsed: unknown = JSON.parse(raw);
        const upgraded = migrate(parsed);
        if (upgraded) {
          state = upgraded;
          migrated = isRecord(parsed) && parsed.version !== CURRENT_VERSION;
        }
      } catch {
        // Corrupt JSON: treated as empty, not propagated. Storage itself is
        // fine, so this does not affect `persistent`.
      }
    }
  }

  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function writeNow(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (!dirty || !persistent || !storage) {
      dirty = false;
      return;
    }
    dirty = false;

    const json = JSON.stringify(state);
    if (new TextEncoder().encode(json).length > MAX_SERIALIZED_BYTES) {
      console.warn(`${STORAGE_KEY}: serialized progress exceeds 1 MB — consider moving to IndexedDB.`);
    }
    try {
      storage.setItem(STORAGE_KEY, json);
    } catch {
      persistent = false;
    }
  }

  function scheduleWrite(): void {
    dirty = true;
    if (!persistent || timer !== undefined) return;
    timer = setTimeout(writeNow, DEBOUNCE_MS);
  }

  // Persist the upgraded shape so storage doesn't stay pinned to an older
  // version forever, without writing synchronously during construction.
  if (migrated) scheduleWrite();

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") writeNow();
    });
  }
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => writeNow());
  }

  return {
    recordShown(id) {
      const existing = state.cards[id];
      state.cards[id] = {
        seenCount: (existing?.seenCount ?? 0) + 1,
        lastSeen: new Date().toISOString(),
        ...(existing?.grade !== undefined ? { grade: existing.grade } : {}),
      };
      scheduleWrite();
    },

    recordGrade(id, grade) {
      const existing = state.cards[id];
      state.cards[id] = {
        seenCount: existing?.seenCount ?? 0,
        lastSeen: existing?.lastSeen ?? new Date().toISOString(),
        grade,
      };
      scheduleWrite();
    },

    recordDeckVisit(deckId) {
      if (state.visitedDecks.includes(deckId)) return;
      state.visitedDecks.push(deckId);
      scheduleWrite();
    },

    get(id) {
      return state.cards[id];
    },

    all() {
      return { ...state.cards };
    },

    flush: writeNow,

    get persistent() {
      return persistent;
    },
  };
}
