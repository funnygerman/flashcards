/**
 * The gesture engine: navigation and grading (T-06).
 *
 * See docs/library/requirements.md §5.1–§5.4 (LIB-5.1–LIB-5.11, LIB-5.16,
 * LIB-5.17). Pure state machine — no DOM, no timers — so the whole decision
 * surface is table-tested without a browser. `index.ts` is the only caller:
 * it turns real `PointerEvent`s into `GestureEvent`s, supplies a fresh
 * `GestureContext` (measured from the live DOM) on every call, and applies
 * the returned `GestureOutcome` to the track/card and to navigation/grading.
 *
 * Flip (T-05, `flip.ts`) and this engine watch the same pointer sequence but
 * must never both fire (`LIB-5.7`): `index.ts` cancels its pending tap-flip
 * the moment this reducer reports `"dragging"`, and otherwise leaves T-05's
 * existing tap/click arbitration untouched — this module has no opinion
 * about flipping at all, including for the `"tap"` outcome below, which
 * exists only to complete the contract's outcome union.
 */

import { gradeForDirection } from "./grade.js";
import type { Grade } from "./types.js";

export type Axis = "x" | "y";

export interface GestureEvent {
  readonly type: "down" | "move" | "up";
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

export type GestureOutcome =
  | { kind: "idle" }
  | { kind: "dragging"; axis: Axis; offset: number }
  | { kind: "navigate"; direction: -1 | 1 }
  | { kind: "grade"; grade: Grade }
  | { kind: "snapBack" }
  | { kind: "tap" };

/** Everything the reducer needs to decide an event that isn't itself part of
 * the pointer stream. `index.ts` recomputes this fresh for every call (cheap
 * — a couple of property reads and one DOM measurement) rather than caching
 * it, so a scroll that reaches its boundary mid-gesture, or a live option
 * change, is picked up on the very next event. */
export interface GestureContext {
  /** The current card's width/height in CSS pixels, as actually laid out —
   * not the configured target size — so the thresholds below are correct
   * even before/without the viewport-sizing pass that publishes
   * `--fc-card-w`. Zero (e.g. before first layout) disables commits on that
   * axis rather than dividing by zero. */
  readonly cardWidth: number;
  readonly cardHeight: number;
  /** LIB-5.5: applied to horizontal movement once there is no card left in
   * that direction. */
  readonly friction: number;
  /** LIB-5.6: fraction of `cardWidth` a horizontal drag must cross to
   * navigate rather than spring back. */
  readonly swipeThreshold: number;
  /** LIB-5.11: fraction of `cardHeight` a vertical drag must cross to grade
   * rather than spring back. */
  readonly gradeThreshold: number;
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  /** LIB-5.10: given the cumulative vertical movement `dy` (screen
   * convention — negative is up) since the press, whether the card's
   * content area is still scrollable in that direction and not yet at that
   * scroll boundary. While this is true, no vertical gesture starts and the
   * axis stays unlocked, so the pointer stream passes through and the
   * content's native scrolling owns the movement. */
  readonly verticalScrollBlocksGesture: (dy: number) => boolean;
}

interface IdleState {
  readonly phase: "idle";
}

interface PressedState {
  readonly phase: "pressed";
  readonly startX: number;
  readonly startY: number;
  readonly startT: number;
}

interface DraggingState {
  readonly phase: "dragging";
  readonly axis: Axis;
  readonly startX: number;
  readonly startY: number;
  readonly startT: number;
}

export type GestureState = IdleState | PressedState | DraggingState;

export const IDLE_GESTURE_STATE: GestureState = { phase: "idle" };

/** LIB-5.9: the axis is decided from the cumulative movement since the press
 * and, once decided, is carried in `DraggingState.axis` for the rest of the
 * gesture — this function only runs while still `"pressed"`. Returns `null`
 * when there isn't enough information yet to lock an axis: no movement at
 * all, or a vertical-dominant movement that `LIB-5.10` says belongs to the
 * content's own scrolling instead. */
function lockAxis(dx: number, dy: number, ctx: GestureContext): Axis | null {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) > Math.abs(dy)) return "x";
  if (ctx.verticalScrollBlocksGesture(dy)) return null;
  return "y";
}

/** LIB-5.4, LIB-5.5: full-speed until a card runs out in the drag's
 * direction, then scaled by `friction` — visual feedback that navigation
 * does not wrap, never an actual bound past the edge. */
function applyHorizontalResistance(dx: number, ctx: GestureContext): number {
  if (dx > 0 && !ctx.hasPrev) return dx * ctx.friction;
  if (dx < 0 && !ctx.hasNext) return dx * ctx.friction;
  return dx;
}

/** How far `distance` is into `size`, as a fraction. A non-positive `size`
 * (no measurement yet) reports 0 rather than `Infinity`/`NaN`, so a commit
 * threshold is never crossed by an unmeasured card. */
function fractionOf(distance: number, size: number): number {
  return size > 0 ? Math.abs(distance) / size : 0;
}

function reduceMove(state: GestureState, event: GestureEvent, ctx: GestureContext): [GestureState, GestureOutcome] {
  if (state.phase === "idle") return [state, { kind: "idle" }];

  const dx = event.x - state.startX;
  const dy = event.y - state.startY;
  const axis = state.phase === "dragging" ? state.axis : lockAxis(dx, dy, ctx);

  if (axis === null) return [state, { kind: "idle" }];

  const draggingState: DraggingState = { phase: "dragging", axis, startX: state.startX, startY: state.startY, startT: state.startT };
  const offset = axis === "x" ? applyHorizontalResistance(dx, ctx) : dy;
  return [draggingState, { kind: "dragging", axis, offset }];
}

function reduceUp(state: GestureState, event: GestureEvent, ctx: GestureContext): [GestureState, GestureOutcome] {
  if (state.phase === "idle") return [IDLE_GESTURE_STATE, { kind: "idle" }];
  // LIB-5.13's own thresholds (distance/duration/selection) decide the tap
  // itself, in flip.ts — this reducer only needs to say "no axis ever
  // locked", so index.ts's existing tap-flip path is the one left to run.
  if (state.phase === "pressed") return [IDLE_GESTURE_STATE, { kind: "tap" }];

  const dx = event.x - state.startX;
  const dy = event.y - state.startY;

  if (state.axis === "x") {
    // LIB-5.4: dragging left (dx < 0) reveals the next card, right reveals
    // the previous — never past whichever end is actually there.
    const direction: -1 | 1 = dx < 0 ? 1 : -1;
    const canNavigate = direction === 1 ? ctx.hasNext : ctx.hasPrev;
    if (canNavigate && fractionOf(dx, ctx.cardWidth) >= ctx.swipeThreshold) {
      return [IDLE_GESTURE_STATE, { kind: "navigate", direction }];
    }
    return [IDLE_GESTURE_STATE, { kind: "snapBack" }];
  }

  if (fractionOf(dy, ctx.cardHeight) >= ctx.gradeThreshold) {
    // Screen coordinates: dy < 0 is upward movement.
    return [IDLE_GESTURE_STATE, { kind: "grade", grade: gradeForDirection(dy < 0 ? "up" : "down") }];
  }
  return [IDLE_GESTURE_STATE, { kind: "snapBack" }];
}

/** LIB-5.1: the single entry point Pointer Events are reduced through — one
 * state machine for every pointer type index.ts feeds it, with no separate
 * mouse/touch branch inside this module. (Excluding mouse drags from
 * navigation, `LIB-5.16`, is a decision about *which* pointer sequences
 * index.ts feeds in here at all, not a branch in this reducer.) */
export function reduceGesture(state: GestureState, event: GestureEvent, ctx: GestureContext): [GestureState, GestureOutcome] {
  switch (event.type) {
    case "down":
      return [{ phase: "pressed", startX: event.x, startY: event.y, startT: event.t }, { kind: "idle" }];
    case "move":
      return reduceMove(state, event, ctx);
    case "up":
      return reduceUp(state, event, ctx);
  }
}
