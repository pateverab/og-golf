import { describe, expect, it } from "vitest";
import type { ActiveRound, Course } from "@/lib/types";
import {
  clampStrokeScore,
  getLiveStrokes,
  getPlayerScoreOnHole,
  getShotLogForHole,
  isActiveRoundFullyScored,
  withHoleOut,
  withIncrementLiveStroke,
  withLiveStrokes,
  withRecordedLiveStroke,
  withUndoLastLiveStroke,
  withUpdatedHoleScore,
  withClearedLiveStrokesForHole,
} from "@/lib/activeRound";

function course9(): Course {
  return {
    id: "c9",
    name: "Nine",
    location: "Quito",
    holes: Array.from({ length: 9 }, (_, i) => ({ number: i + 1, par: 4 })),
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function baseRound(): ActiveRound {
  return {
    id: "a1",
    courseId: "c9",
    playerIds: ["p1", "p2"],
    scores: {},
    startTime: "2026-02-01T00:00:00.000Z",
    roundLength: 9,
    nineSide: "front",
    startingHole: 1,
  };
}

describe("activeRound helpers", () => {
  it("clamps stroke scores", () => {
    expect(clampStrokeScore(0)).toBe(1);
    expect(clampStrokeScore(99)).toBe(15);
  });

  it("upserts hole scores and reports fully scored", () => {
    let round = baseRound();
    const course = course9();
    expect(isActiveRoundFullyScored(round, course)).toBe(false);

    for (const pid of round.playerIds) {
      for (let h = 1; h <= 9; h++) {
        round = withUpdatedHoleScore(round, pid, h, 4);
      }
    }

    expect(getPlayerScoreOnHole(round, "p1", 3)).toBe(4);
    expect(isActiveRoundFullyScored(round, course)).toBe(true);
  });
});

describe("live stroke clicker helpers", () => {
  it("tracks live taps without writing HoleScore", () => {
    let round = baseRound();
    round = withIncrementLiveStroke(round, "p1", 1, 1);
    round = withIncrementLiveStroke(round, "p1", 1, 1);
    expect(getLiveStrokes(round, "p1", 1)).toBe(2);
    expect(getPlayerScoreOnHole(round, "p1", 1)).toBeNull();
    expect(isActiveRoundFullyScored(round, course9())).toBe(false);
  });

  it("hole-out commits live count and clears taps", () => {
    let round = baseRound();
    round = withLiveStrokes(round, "p1", 1, 5);
    round = withHoleOut(round, "p1", 1);
    expect(getPlayerScoreOnHole(round, "p1", 1)).toBe(5);
    expect(getLiveStrokes(round, "p1", 1)).toBe(0);
  });

  it("hole-out with zero live taps is a no-op", () => {
    const round = withHoleOut(baseRound(), "p1", 1);
    expect(getPlayerScoreOnHole(round, "p1", 1)).toBeNull();
    expect(round.liveStrokes).toBeUndefined();
  });

  it("manual clear drops leftover live taps", () => {
    let round = withLiveStrokes(baseRound(), "p1", 2, 3);
    round = withClearedLiveStrokesForHole(round, "p1", 2);
    expect(getLiveStrokes(round, "p1", 2)).toBe(0);
  });

  it("clamps live taps to 0–15", () => {
    let round = withLiveStrokes(baseRound(), "p1", 1, 99);
    expect(getLiveStrokes(round, "p1", 1)).toBe(15);
    round = withLiveStrokes(round, "p1", 1, -3);
    expect(getLiveStrokes(round, "p1", 1)).toBe(0);
  });
});

describe("shot log + lie recording", () => {
  it("records optional lie on +1 without writing HoleScore", () => {
    let round = withRecordedLiveStroke(baseRound(), "p1", 1, { lie: "tee" });
    expect(getLiveStrokes(round, "p1", 1)).toBe(1);
    expect(getPlayerScoreOnHole(round, "p1", 1)).toBeNull();
    expect(getShotLogForHole(round, "p1", 1)).toEqual([
      { holeNumber: 1, stroke: 1, lie: "tee" },
    ]);
  });

  it("omits lie when none selected", () => {
    const round = withRecordedLiveStroke(baseRound(), "p1", 2);
    expect(getShotLogForHole(round, "p1", 2)[0]).toEqual({
      holeNumber: 2,
      stroke: 1,
    });
  });

  it("records penalty strokes", () => {
    const round = withRecordedLiveStroke(baseRound(), "p1", 1, {
      lie: "other",
      penalty: true,
    });
    expect(getShotLogForHole(round, "p1", 1)[0]).toMatchObject({
      stroke: 1,
      lie: "other",
      penalty: true,
    });
  });

  it("undo pops last shot log for that hole and decrements live", () => {
    let round = withRecordedLiveStroke(baseRound(), "p1", 1, { lie: "tee" });
    round = withRecordedLiveStroke(round, "p1", 1, { lie: "fairway" });
    round = withUndoLastLiveStroke(round, "p1", 1);
    expect(getLiveStrokes(round, "p1", 1)).toBe(1);
    expect(getShotLogForHole(round, "p1", 1)).toEqual([
      { holeNumber: 1, stroke: 1, lie: "tee" },
    ]);
  });

  it("hole out commits score and leaves shot log intact", () => {
    let round = withRecordedLiveStroke(baseRound(), "p1", 1, { lie: "tee" });
    round = withRecordedLiveStroke(round, "p1", 1, { lie: "green" });
    round = withRecordedLiveStroke(round, "p1", 1, { lie: "green" });
    round = withHoleOut(round, "p1", 1);
    expect(getPlayerScoreOnHole(round, "p1", 1)).toBe(3);
    expect(getLiveStrokes(round, "p1", 1)).toBe(0);
    expect(getShotLogForHole(round, "p1", 1)).toHaveLength(3);
  });
});
