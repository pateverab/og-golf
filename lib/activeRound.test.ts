import { describe, expect, it } from "vitest";
import type { ActiveRound, Course, Round } from "@/lib/types";
import {
  clampStrokeScore,
  getLiveStrokes,
  getPlayerScoreOnHole,
  getShotLogForHole,
  getStartingHoleForRound,
  isActiveRoundFullyScored,
  pickNextUnscoredPlayer,
  withHoleOut,
  withIncrementLiveStroke,
  withLiveStrokes,
  withRecordedLiveStroke,
  withUndoLastLiveStroke,
  withUpdatedHoleScore,
  withClearedLiveStrokesForHole,
  withRestartedRound,
  withoutIncompleteDraft,
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

describe("pickNextUnscoredPlayer", () => {
  const ids = ["a", "b", "c"];
  it("picks the next unscored player after the one who holed out, wrapping", () => {
    expect(pickNextUnscoredPlayer(ids, "a", (id) => id === "a")).toBe("b");
    expect(pickNextUnscoredPlayer(ids, "b", (id) => id === "b" || id === "c")).toBe("a");
    expect(pickNextUnscoredPlayer(ids, "c", (id) => id === "c")).toBe("a");
  });

  it("returns null when everyone has scored the hole", () => {
    expect(pickNextUnscoredPlayer(ids, "b", () => true)).toBeNull();
    expect(pickNextUnscoredPlayer(["solo"], "solo", () => true)).toBeNull();
    expect(pickNextUnscoredPlayer([], "x", () => false)).toBeNull();
  });
});

function course18(): Course {
  return {
    id: "c18",
    name: "Eighteen",
    location: "Quito",
    holes: Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: i % 3 === 0 ? 5 : 4 })),
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("withRestartedRound", () => {
  const played = (): ActiveRound => {
    let round: ActiveRound = { ...baseRound(), courseId: "c18", roundLength: 18 };
    round = withUpdatedHoleScore(round, "p1", 1, 5);
    round = withUpdatedHoleScore(round, "p2", 1, 4);
    round = withRecordedLiveStroke(round, "p1", 2, { lie: "tee" });
    round = withRecordedLiveStroke(round, "p1", 2, { lie: "fairway", penalty: true });
    return round;
  };

  it("wipes scores, live taps and shot log but keeps id, course, players and config", () => {
    const before = played();
    expect(getLiveStrokes(before, "p1", 2)).toBe(2);
    const { round, currentHole } = withRestartedRound(before, course18());
    expect(round.id).toBe(before.id);
    expect(round.courseId).toBe(before.courseId);
    expect(round.playerIds).toEqual(["p1", "p2"]);
    expect(round.startTime).toBe(before.startTime);
    expect([round.roundLength, round.nineSide, round.startingHole]).toEqual([18, "front", 1]);
    expect(round.scores).toEqual({ p1: [], p2: [] });
    expect(round.liveStrokes).toBeUndefined();
    expect(round.shotLog).toBeUndefined();
    expect(getLiveStrokes(round, "p1", 2)).toBe(0);
    expect(currentHole).toBe(1);
  });

  it("does not mutate the original round", () => {
    const before = played();
    withRestartedRound(before, course18());
    expect(getPlayerScoreOnHole(before, "p1", 1)).toBe(5);
    expect(getShotLogForHole(before, "p1", 2)).toHaveLength(2);
  });

  it("restarts on the configured starting hole (hole 10 start, back nine)", () => {
    const tenStart: ActiveRound = { ...played(), roundLength: 18, startingHole: 10 };
    expect(withRestartedRound(tenStart, course18()).currentHole).toBe(10);
    const backNine: ActiveRound = { ...played(), roundLength: 9, nineSide: "back", startingHole: 10 };
    expect(withRestartedRound(backNine, course18()).currentHole).toBe(10);
    expect(getStartingHoleForRound(course9(), baseRound())).toBe(1);
  });
});

describe("withoutIncompleteDraft", () => {
  const r = (id: string, completed: boolean): Round => ({
    id,
    courseId: "c9",
    date: "2026-02-01T00:00:00.000Z",
    playerScores: [],
    completed,
    createdAt: "2026-02-01T00:00:00.000Z",
  });

  it("removes only the incomplete draft with this id", () => {
    const rounds = [r("a1", false), r("b2", false), r("c3", true)];
    expect(withoutIncompleteDraft(rounds, "a1").map((x) => x.id)).toEqual(["b2", "c3"]);
  });

  it("never removes a completed round", () => {
    const rounds = [r("a1", true)];
    expect(withoutIncompleteDraft(rounds, "a1")).toEqual(rounds);
  });
});
