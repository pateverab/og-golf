import { describe, expect, it } from "vitest";
import type { ActiveRound, Course } from "@/lib/types";
import {
  clampStrokeScore,
  getPlayerScoreOnHole,
  isActiveRoundFullyScored,
  withUpdatedHoleScore,
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
