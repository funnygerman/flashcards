import { describe, expect, it } from "vitest";

import {
  IDLE_GESTURE_STATE,
  reduceGesture,
  type GestureContext,
  type GestureEvent,
  type GestureState,
} from "./gesture.js";

// cardWidth 200, cardHeight 300 make the thresholds land on tidy pixel
// values: 18% of 200 = 36px, 15% of 300 = 45px.
function ctx(overrides: Partial<GestureContext> = {}): GestureContext {
  return {
    cardWidth: 200,
    cardHeight: 300,
    friction: 0.35,
    swipeThreshold: 0.18,
    gradeThreshold: 0.15,
    hasPrev: true,
    hasNext: true,
    verticalScrollBlocksGesture: () => false,
    ...overrides,
  };
}

function down(x: number, y: number, t = 0): GestureEvent {
  return { type: "down", x, y, t };
}
function move(x: number, y: number, t = 0): GestureEvent {
  return { type: "move", x, y, t };
}
function up(x: number, y: number, t = 0): GestureEvent {
  return { type: "up", x, y, t };
}

describe("reduceGesture: down (LIB-5.1)", () => {
  it("presses from idle, emitting idle", () => {
    const [state, outcome] = reduceGesture(IDLE_GESTURE_STATE, down(10, 20, 5), ctx());
    expect(outcome).toEqual({ kind: "idle" });
    expect(state).toMatchObject({ phase: "pressed", startX: 10, startY: 20, startT: 5 });
  });
});

describe("reduceGesture: move before any lock, no movement", () => {
  it("stays idle if move arrives with no prior down", () => {
    const [state, outcome] = reduceGesture(IDLE_GESTURE_STATE, move(10, 10), ctx());
    expect(outcome).toEqual({ kind: "idle" });
    expect(state).toEqual(IDLE_GESTURE_STATE);
  });

  it("stays pressed, idle outcome, when a move reports no displacement", () => {
    const pressed: GestureState = { phase: "pressed", startX: 0, startY: 0, startT: 0 };
    const [state, outcome] = reduceGesture(pressed, move(0, 0), ctx());
    expect(outcome).toEqual({ kind: "idle" });
    expect(state).toEqual(pressed);
  });
});

describe("reduceGesture: axis lock (LIB-5.9)", () => {
  const pressed: GestureState = { phase: "pressed", startX: 0, startY: 0, startT: 0 };

  it("locks to x on a diagonal drag where |dx| > |dy|", () => {
    const [state, outcome] = reduceGesture(pressed, move(10, 4), ctx());
    expect(state).toMatchObject({ phase: "dragging", axis: "x" });
    expect(outcome).toEqual({ kind: "dragging", axis: "x", offset: 10 });
  });

  it("locks to y on a diagonal drag where |dx| < |dy|", () => {
    const [state, outcome] = reduceGesture(pressed, move(4, 10), ctx());
    expect(state).toMatchObject({ phase: "dragging", axis: "y" });
    expect(outcome).toEqual({ kind: "dragging", axis: "y", offset: 10 });
  });

  it("locks to y when |dx| equals |dy| (only strictly-greater dx wins x)", () => {
    const [state] = reduceGesture(pressed, move(8, 8), ctx());
    expect(state).toMatchObject({ phase: "dragging", axis: "y" });
  });

  it("does not change axis mid-gesture even once the dominant direction flips", () => {
    const [lockedX] = reduceGesture(pressed, move(10, 0), ctx());
    expect(lockedX).toMatchObject({ phase: "dragging", axis: "x" });

    // The gesture continues with a move that is now vertical-dominant from
    // the press point — the lock must still hold at x.
    const [, outcome] = reduceGesture(lockedX, move(10, 50), ctx());
    expect(outcome).toEqual({ kind: "dragging", axis: "x", offset: 10 });

    const [lockedY] = reduceGesture(pressed, move(0, 10), ctx());
    expect(lockedY).toMatchObject({ phase: "dragging", axis: "y" });
    const [, outcome2] = reduceGesture(lockedY, move(50, 10), ctx());
    expect(outcome2).toEqual({ kind: "dragging", axis: "y", offset: 10 });
  });
});

describe("reduceGesture: vertical scroll suppression (LIB-5.10)", () => {
  const pressed: GestureState = { phase: "pressed", startX: 0, startY: 0, startT: 0 };

  it("does not lock an axis while the content area can still scroll toward this drag", () => {
    const [state, outcome] = reduceGesture(pressed, move(2, -20), ctx({ verticalScrollBlocksGesture: () => true }));
    expect(outcome).toEqual({ kind: "idle" });
    expect(state).toEqual(pressed);
  });

  it("locks to y once the content is no longer scrollable in that direction", () => {
    const [state, outcome] = reduceGesture(pressed, move(2, -20), ctx({ verticalScrollBlocksGesture: () => false }));
    expect(state).toMatchObject({ phase: "dragging", axis: "y" });
    expect(outcome).toEqual({ kind: "dragging", axis: "y", offset: -20 });
  });

  it("is not consulted, and does not block, a horizontal-dominant drag", () => {
    const [state] = reduceGesture(pressed, move(20, 2), ctx({ verticalScrollBlocksGesture: () => true }));
    expect(state).toMatchObject({ phase: "dragging", axis: "x" });
  });
});

describe("reduceGesture: horizontal edge resistance (LIB-5.4, LIB-5.5)", () => {
  const pressed: GestureState = { phase: "pressed", startX: 0, startY: 0, startT: 0 };

  it("passes horizontal offset through unresisted mid-track", () => {
    const [, outcome] = reduceGesture(pressed, move(100, 0), ctx({ hasPrev: true, hasNext: true }));
    expect(outcome).toEqual({ kind: "dragging", axis: "x", offset: 100 });
  });

  it("scales a rightward drag (revealing the previous card) by friction when there is no previous card", () => {
    const [, outcome] = reduceGesture(pressed, move(100, 0), ctx({ hasPrev: false, friction: 0.35 }));
    expect(outcome).toEqual({ kind: "dragging", axis: "x", offset: 35 });
  });

  it("scales a leftward drag (revealing the next card) by friction when there is no next card", () => {
    const [, outcome] = reduceGesture(pressed, move(-100, 0), ctx({ hasNext: false, friction: 0.35 }));
    expect(outcome).toEqual({ kind: "dragging", axis: "x", offset: -35 });
  });

  it("does not resist a rightward drag when a previous card exists, even with no next card", () => {
    const [, outcome] = reduceGesture(pressed, move(100, 0), ctx({ hasPrev: true, hasNext: false }));
    expect(outcome).toEqual({ kind: "dragging", axis: "x", offset: 100 });
  });
});

describe("reduceGesture: horizontal commit threshold (LIB-5.6)", () => {
  const dragging: GestureState = { phase: "dragging", axis: "x", startX: 0, startY: 0, startT: 0 };

  it("snaps back just under 18% of card width (35.9px of 200)", () => {
    const [state, outcome] = reduceGesture(dragging, up(-35.9, 0), ctx());
    expect(outcome).toEqual({ kind: "snapBack" });
    expect(state).toEqual(IDLE_GESTURE_STATE);
  });

  it("navigates at exactly 18% of card width (36px of 200) — the boundary is inclusive", () => {
    const [, outcome] = reduceGesture(dragging, up(-36, 0), ctx());
    expect(outcome).toEqual({ kind: "navigate", direction: 1 });
  });

  it("navigates forward (direction 1) when the drag is leftward", () => {
    const [, outcome] = reduceGesture(dragging, up(-50, 0), ctx());
    expect(outcome).toEqual({ kind: "navigate", direction: 1 });
  });

  it("navigates backward (direction -1) when the drag is rightward", () => {
    const [, outcome] = reduceGesture(dragging, up(50, 0), ctx());
    expect(outcome).toEqual({ kind: "navigate", direction: -1 });
  });

  it("never navigates past an end, even past threshold — snaps back instead (LIB-5.4)", () => {
    const [, outcome] = reduceGesture(dragging, up(-50, 0), ctx({ hasNext: false }));
    expect(outcome).toEqual({ kind: "snapBack" });
  });

  it("treats an unmeasured (zero-width) card as never crossing the threshold", () => {
    const [, outcome] = reduceGesture(dragging, up(-1000, 0), ctx({ cardWidth: 0 }));
    expect(outcome).toEqual({ kind: "snapBack" });
  });
});

describe("reduceGesture: vertical commit threshold (LIB-5.8, LIB-5.11)", () => {
  const dragging: GestureState = { phase: "dragging", axis: "y", startX: 0, startY: 0, startT: 0 };

  it("snaps back with no event just under 15% of card height (44.9px of 300)", () => {
    const [state, outcome] = reduceGesture(dragging, up(0, -44.9), ctx());
    expect(outcome).toEqual({ kind: "snapBack" });
    expect(state).toEqual(IDLE_GESTURE_STATE);
  });

  it("grades at exactly 15% of card height (45px of 300) — the boundary is inclusive", () => {
    const [, outcome] = reduceGesture(dragging, up(0, -45), ctx());
    expect(outcome).toEqual({ kind: "grade", grade: "easy" });
  });

  it("grades easy on an upward commit (dy < 0)", () => {
    const [, outcome] = reduceGesture(dragging, up(0, -60), ctx());
    expect(outcome).toEqual({ kind: "grade", grade: "easy" });
  });

  it("grades hard on a downward commit (dy > 0)", () => {
    const [, outcome] = reduceGesture(dragging, up(0, 60), ctx());
    expect(outcome).toEqual({ kind: "grade", grade: "hard" });
  });

  it("treats an unmeasured (zero-height) card as never crossing the threshold", () => {
    const [, outcome] = reduceGesture(dragging, up(0, -1000), ctx({ cardHeight: 0 }));
    expect(outcome).toEqual({ kind: "snapBack" });
  });
});

describe("reduceGesture: tap (LIB-5.12, out of this module's remit to commit)", () => {
  it("reports tap when up arrives with no axis ever locked", () => {
    const pressed: GestureState = { phase: "pressed", startX: 5, startY: 5, startT: 0 };
    const [state, outcome] = reduceGesture(pressed, up(5, 5, 10), ctx());
    expect(outcome).toEqual({ kind: "tap" });
    expect(state).toEqual(IDLE_GESTURE_STATE);
  });

  it("reports tap for a down immediately followed by up with zero movement", () => {
    const [pressed] = reduceGesture(IDLE_GESTURE_STATE, down(0, 0, 0), ctx());
    const [state, outcome] = reduceGesture(pressed, up(0, 0, 5), ctx());
    expect(outcome).toEqual({ kind: "tap" });
    expect(state).toEqual(IDLE_GESTURE_STATE);
  });

  it("does not report tap once a real drag has committed — that is navigate/grade/snapBack instead", () => {
    const dragging: GestureState = { phase: "dragging", axis: "x", startX: 0, startY: 0, startT: 0 };
    const [, outcome] = reduceGesture(dragging, up(1, 0), ctx());
    expect(outcome).not.toEqual({ kind: "tap" });
  });
});

describe("reduceGesture: defensive idle handling", () => {
  it("ignores an up with no prior down", () => {
    const [state, outcome] = reduceGesture(IDLE_GESTURE_STATE, up(0, 0), ctx());
    expect(outcome).toEqual({ kind: "idle" });
    expect(state).toEqual(IDLE_GESTURE_STATE);
  });

  it("resets to idle after every commit outcome, ready for the next gesture", () => {
    const dragging: GestureState = { phase: "dragging", axis: "x", startX: 0, startY: 0, startT: 0 };
    const [state] = reduceGesture(dragging, up(-100, 0), ctx());
    expect(state).toEqual(IDLE_GESTURE_STATE);
  });
});
