import { describe, expect, it } from "vitest";
import type { ActiveRound } from "@/lib/types";
import {
  LIE_OPTIONS,
  canAddStroke,
  initialLieFor,
  lieAfterPenalty,
  lieAfterStroke,
  lieAfterUndo,
} from "./lies";
import { getLiveStrokes, getShotLogForHole, withRecordedLiveStroke, withUndoLastLiveStroke } from "./activeRound";

const round = (): ActiveRound => ({
  id: "a1",
  courseId: "c1",
  playerIds: ["p1"],
  scores: {},
  startTime: "2026-02-01T00:00:00.000Z",
  roundLength: 18,
  nineSide: "front",
  startingHole: 1,
});

describe("lie gating for +1 Stroke", () => {
  it("offers the six chips in order", () => {
    expect(LIE_OPTIONS.map((o) => o.label)).toEqual(["Tee", "Fairway", "Rough", "Bunker", "Green", "Other"]);
  });

  it("blocks +1 without a lie and allows it with one", () => {
    expect(canAddStroke(null)).toBe(false);
    expect(canAddStroke(undefined)).toBe(false);
    expect(canAddStroke("rough")).toBe(true);
  });

  it("defaults stroke 1 to Tee so +1 is enabled at hole start", () => {
    expect(initialLieFor(0)).toBe("tee");
    expect(canAddStroke(initialLieFor(0))).toBe(true);
  });

  it("needs a new chip mid-hole unless the last shot was from the Green", () => {
    expect(initialLieFor(2, { holeNumber: 1, stroke: 2, lie: "fairway" })).toBeNull();
    expect(initialLieFor(3, { holeNumber: 1, stroke: 3, lie: "green" })).toBe("green");
    expect(initialLieFor(3, { holeNumber: 1, stroke: 3, lie: "green", penalty: true })).toBeNull();
    expect(initialLieFor(1, null)).toBeNull();
  });

  it("clears after every +1 except Green (putting)", () => {
    expect(lieAfterStroke("tee")).toBeNull();
    expect(lieAfterStroke("fairway")).toBeNull();
    expect(lieAfterStroke("rough")).toBeNull();
    expect(lieAfterStroke("bunker")).toBeNull();
    expect(lieAfterStroke("other")).toBeNull();
    expect(lieAfterStroke("green")).toBe("green");
  });

  it("clears after a penalty", () => {
    expect(lieAfterPenalty()).toBeNull();
  });

  it("undo returns to the undone shot's lie, or Tee at 0 strokes", () => {
    expect(lieAfterUndo({ holeNumber: 1, stroke: 2, lie: "rough" }, 1)).toBe("rough");
    expect(lieAfterUndo({ holeNumber: 1, stroke: 1, lie: "tee" }, 0)).toBe("tee");
    expect(lieAfterUndo({ holeNumber: 1, stroke: 2, penalty: true }, 1)).toBeNull();
    expect(lieAfterUndo(null, 2)).toBeNull();
  });

  it("records the chosen lie on the shot and Undo pops it without needing a lie", () => {
    let r = withRecordedLiveStroke(round(), "p1", 1, { lie: "tee" });
    r = withRecordedLiveStroke(r, "p1", 1, { lie: "rough" });
    expect(getShotLogForHole(r, "p1", 1).at(-1)?.lie).toBe("rough");
    r = withRecordedLiveStroke(r, "p1", 1, { penalty: true });
    expect(getLiveStrokes(r, "p1", 1)).toBe(3);
    r = withUndoLastLiveStroke(r, "p1", 1);
    expect(getLiveStrokes(r, "p1", 1)).toBe(2);
    expect(getShotLogForHole(r, "p1", 1).map((s) => s.lie)).toEqual(["tee", "rough"]);
  });
});
