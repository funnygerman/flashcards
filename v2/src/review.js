/**
 * Review scheduling: how well a card sticks, from the grades it has been given.
 *
 * Not part of the library's mount() — V2-5.9 keeps the library itself from
 * storing a grade or computing a schedule, so this is a separate module a
 * deck page wires up through onGrade if it wants one, the same way it would
 * reach for any other host-side concern.
 *
 * A Leitner system: cards sit in a box, a wrong answer sends a card back to
 * the first box due immediately, a right answer promotes it one box to a
 * longer interval. It is the classic scheduler for a binary signal — this
 * library's grade is exactly "harder" or "easier", never a five-point quality
 * — and it needs no dependency, which keeps V2-9.1 (no runtime dependency)
 * intact rather than reaching for SM-2 or FSRS.
 */

import { pageStorage, readMap, writeMap } from "./storage.js";

export const STORAGE_KEY = "flashcards.review";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Box index -> days until a card in that box is due again. */
const INTERVALS_DAYS = [0, 1, 2, 4, 8, 16, 32];
const MAX_BOX = INTERVALS_DAYS.length - 1;

function schedule(box, now) {
  return { box, dueAt: now + INTERVALS_DAYS[box] * DAY_MS };
}

/** A stored entry that is actually a schedule this box count can use. */
function validSchedule(entry) {
  return entry &&
    typeof entry === "object" &&
    Number.isInteger(entry.box) &&
    entry.box >= 0 &&
    entry.box <= MAX_BOX &&
    Number.isFinite(entry.dueAt)
    ? entry
    : null;
}

/** A card's current schedule, or a fresh one due now if it has never been graded. */
export function reviewState(key, storage = pageStorage(), now = Date.now()) {
  return validSchedule(readMap(storage, STORAGE_KEY)[key]) ?? schedule(0, now);
}

/**
 * Record a grade and persist the card's new schedule.
 *
 * `easier` promotes one box towards a longer interval, capped at the last
 * box. `harder` sends the card back to the first box, due again immediately —
 * a wrong answer means starting over, not stepping back one box at a time.
 */
export function recordGrade(key, level, storage = pageStorage(), now = Date.now()) {
  const map = readMap(storage, STORAGE_KEY);
  const current = validSchedule(map[key]) ?? schedule(0, now);
  const next = schedule(level === "easier" ? Math.min(current.box + 1, MAX_BOX) : 0, now);

  map[key] = next;
  writeMap(storage, STORAGE_KEY, map);

  return next;
}

/** Whether a card's schedule says it is due for review. */
export function isDue(state, now = Date.now()) {
  return now >= state.dueAt;
}
