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

/**
 * The map stored under `key`, or an empty one if it is missing or unusable.
 *
 * With no prototype, which is what makes a card keyed `__proto__` an ordinary
 * key here (V2-6.9). Every module that reads one of these maps already guards
 * its lookups with `Object.hasOwn`, against a card keyed `constructor` or
 * `toString`; the writes were plain indexing, and on an ordinary object
 * `map.__proto__ = entry` sets the prototype instead of storing anything. The
 * grade went nowhere, `JSON.stringify` wrote `{}`, and the card came back
 * unanswered for ever — the one key a reader could never be done with. Fixing
 * it here rather than at each write fixes every bucket at once, including any
 * added later.
 */
export function readMap(storage, key) {
  const empty = () => Object.create(null);

  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "null");

    /* `Object.assign` writes each own key onto a target with no `__proto__`
       accessor to intercept it, so the awkward key arrives as a plain own
       property — which is what `JSON.parse` already made of it. */
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.assign(empty(), parsed) : empty();
  } catch {
    /* Absent, corrupt, or blocked storage all mean the same thing: start empty. */
    return empty();
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
