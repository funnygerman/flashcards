/**
 * What every module that persists to local storage needs, and nothing each
 * has a reason to duplicate: the page's own storage, and a `{ [key]: value }`
 * map read back safely regardless of what is actually stored there.
 */

/**
 * The page's own storage, or null where there is none to have. Reading the
 * property is itself what throws on an opaque origin or with site data
 * blocked, so it cannot be left to a default parameter.
 */
export function pageStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The map stored under `key`, or an empty one if it is missing or unusable. */
export function readMap(storage, key) {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    /* Absent, corrupt, or blocked storage all mean the same thing: start empty. */
    return {};
  }
}

/** Persist `map` under `key`. Failing silently costs persistence, not the session. */
export function writeMap(storage, key, map) {
  try {
    storage.setItem(key, JSON.stringify(map));
  } catch {
    // Full or blocked storage: the caller already has its in-memory result.
  }
}
