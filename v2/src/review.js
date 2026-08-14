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
 * library's grade is "harder" or "easier", never a five-point quality — and
 * it needs no dependency, which keeps V2-9.1 (no runtime dependency) intact
 * rather than reaching for SM-2 or FSRS. A third outcome, "neutral", covers a
 * card the reader only ever saw and paged past: neither promoted nor
 * demoted, just kept from going unscheduled.
 *
 * One grade per card per day, however many times the reader gives it. A grade
 * is applied to the box the card stood in at the *start of the day*, not to
 * whatever an earlier grade the same day already made of it, so changing one's
 * mind — or reloading the page and grading again — moves the card exactly one
 * step from where the day found it, and the last grade is the one that stands.
 */

import { pageStorage, readMap, writeMap } from "./storage.js";

export const STORAGE_KEY = "flashcards.review";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Box index -> days until a card in that box is due again. */
const INTERVALS_DAYS = [0, 1, 2, 4, 8, 16, 32];
const MAX_BOX = INTERVALS_DAYS.length - 1;

const isGrade = (level) => level === "easier" || level === "harder";
const validBox = (box) => Number.isInteger(box) && box >= 0 && box <= MAX_BOX;

/**
 * The reader's own calendar day, in their own time zone — a grade at 23:00 and
 * one at 01:00 belong to different days as they experience them, which UTC
 * would get wrong for most of the world.
 */
function dayOf(now) {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function schedule(box, now) {
  return { box, dueAt: now + INTERVALS_DAYS[box] * DAY_MS };
}

/**
 * A stored entry read back as something this module can use, or null.
 *
 * The schedule and the record of today's grade are distrusted separately: an
 * entry written before that record existed, or one whose day is half written,
 * is still a perfectly good schedule — it just reads as a card that has not
 * been graded today.
 */
function readEntry(entry) {
  if (!entry || typeof entry !== "object" || !validBox(entry.box) || !Number.isFinite(entry.dueAt)) {
    return null;
  }

  const { box, dueAt, baseBox, day, grade } = entry;

  return validBox(baseBox) && typeof day === "string" && isGrade(grade)
    ? { box, dueAt, baseBox, day, grade }
    : { box, dueAt };
}

const stored = (key, storage) => readEntry(readMap(storage, STORAGE_KEY)[key]);

/** A card's current schedule, or a fresh one due now if it has never been graded. */
export function reviewState(key, storage = pageStorage(), now = Date.now()) {
  const entry = stored(key, storage) ?? schedule(0, now);

  /* Only the schedule: what the reader said today (below) is a separate
     question, and V2-11.6 keeps this shape to `{ box, dueAt }`. */
  return { box: entry.box, dueAt: entry.dueAt };
}

/**
 * The grade a card already carries today — `"harder"`, `"easier"`, or null for
 * a card the reader has not made up their mind about yet today. This is what a
 * deck page hands back to `mount()` as `gradeOf`, so a card returns from a page
 * reload wearing the mark it was left with, and locked (V2-5.13).
 */
export function gradedToday(key, storage = pageStorage(), now = Date.now()) {
  const entry = stored(key, storage);

  return entry?.day === dayOf(now) ? entry.grade : null;
}

/** The box a grade moves a card to, from the box it is in now. */
function nextBox(level, box) {
  if (level === "easier") return Math.min(box + 1, MAX_BOX);
  if (level === "harder") return 0;

  /* "neutral" — the reader saw the card and moved on without an opinion. That
     is evidence of neither recall nor difficulty, so it neither promotes nor
     demotes; the box stays. */
  return box;
}

/**
 * Where today's grade starts from: the box the card stood in before the day's
 * first grade, or — the card not having been graded today — the box it is in
 * now, which is the same thing.
 */
function baseFor(current, day) {
  return current.day === day ? current.baseBox : current.box;
}

/**
 * Record a grade and persist the card's new schedule.
 *
 * `easier` promotes one box towards a longer interval, capped at the last
 * box. `harder` sends the card back to the first box, due again immediately —
 * a wrong answer means starting over, not stepping back one box at a time. A
 * card the reader could not recall is not a month-away card however it earned
 * that box, and box 0 is due immediately, so it comes round again this session.
 *
 * Both apply to `baseBox`, the box the card stood in before the day's first
 * grade, so a second grade the same day replaces the first rather than
 * stacking on it: easier then harder then easier leaves the card one box up
 * from where the day found it, not three moves away from it.
 *
 * `"neutral"` keeps the current box and simply renews it from now, so a card
 * that is only ever seen and never graded still gets a schedule instead of
 * staying permanently, indistinguishably due. It is not an opinion, so it
 * neither uses up the day's grade nor overwrites one already given.
 */
export function recordGrade(key, level, storage = pageStorage(), now = Date.now()) {
  const map = readMap(storage, STORAGE_KEY);
  const current = readEntry(map[key]) ?? schedule(0, now);
  const day = dayOf(now);
  const base = baseFor(current, day);

  const next = isGrade(level)
    ? { ...schedule(nextBox(level, base), now), baseBox: base, day, grade: level }
    : { ...current, ...schedule(current.box, now) };

  map[key] = next;
  writeMap(storage, STORAGE_KEY, map);

  return { box: next.box, dueAt: next.dueAt };
}

/** Whether a card's schedule says it is due for review. */
export function isDue(state, now = Date.now()) {
  return now >= state.dueAt;
}
