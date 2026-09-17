import { describe, expect, it } from "vitest";
import type { Course, Player, Round } from "@/lib/types";
import {
  MIN_COMPLETED_ROUNDS_FOR_OG_INDEX,
  calculateHandicapForPlayer,
  getDefaultRoundConfig,
  getHolesInPlay,
  is18HoleCourse,
  normalizeRoundConfig,
  playerUsesStartingHandicap,
  recalculateAllHandicaps,
} from "@/lib/calculations";

function hole(number: number, par = 4) {
  return { number, par };
}

function course18(id = "c18"): Course {
  return {
    id,
    name: "Eighteen",
    location: "Quito",
    holes: Array.from({ length: 18 }, (_, i) => hole(i + 1, i % 3 === 0 ? 3 : 4)),
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function course9(id = "c9"): Course {
  return {
    id,
    name: "Nine",
    location: "Quito",
    holes: Array.from({ length: 9 }, (_, i) => hole(i + 1, 4)),
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function makePlayer(id: string, starting: number): Player {
  return {
    id,
    name: id,
    handicap: starting,
    startingHandicap: starting,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function completedRound(
  id: string,
  course: Course,
  playerId: string,
  strokesPerHole: number,
  opts: Partial<Pick<Round, "roundLength" | "nineSide" | "startingHole">> = {}
): Round {
  const roundLength = opts.roundLength ?? (is18HoleCourse(course) ? 18 : 9);
  const nineSide = opts.nineSide ?? "front";
  const startingHole = opts.startingHole ?? 1;
  const holes = getHolesInPlay(course, { roundLength, nineSide, startingHole });
  return {
    id,
    courseId: course.id,
    date: "2026-02-01T00:00:00.000Z",
    createdAt: "2026-02-01T00:00:00.000Z",
    completed: true,
    roundLength,
    nineSide,
    startingHole,
    playerScores: [
      {
        playerId,
        scores: holes.map((holeNumber) => ({ holeNumber, score: strokesPerHole })),
      },
    ],
  };
}

describe("round config / holes in play", () => {
  it("treats true 9-hole courses as 9 and collapses 18/hole-10 config", () => {
    const c = course9();
    expect(is18HoleCourse(c)).toBe(false);
    expect(getDefaultRoundConfig(c)).toEqual({
      roundLength: 9,
      nineSide: "front",
      startingHole: 1,
    });
    expect(normalizeRoundConfig(c, { roundLength: 18, startingHole: 10 })).toEqual({
      roundLength: 9,
      nineSide: "front",
      startingHole: 1,
    });
    expect(getHolesInPlay(c)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("supports front 9, back 9, and hole-10 start on 18-hole courses", () => {
    const c = course18();
    expect(is18HoleCourse(c)).toBe(true);
    expect(getHolesInPlay(c, { roundLength: 9, nineSide: "front" })).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(getHolesInPlay(c, { roundLength: 9, nineSide: "back" })).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
    expect(getHolesInPlay(c, { roundLength: 18, startingHole: 10 }).slice(0, 9)).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
    expect(getHolesInPlay(c, { roundLength: 18, startingHole: 10 }).slice(9)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });
});

describe("OG index / handicap trust", () => {
  it("keeps starting handicap until enough qualifying rounds", () => {
    expect(MIN_COMPLETED_ROUNDS_FOR_OG_INDEX).toBe(1);
    const c = course18();
    expect(calculateHandicapForPlayer("p1", [], [c], 12)).toBe(12);
    expect(playerUsesStartingHandicap("p1", [], [c])).toBe(true);
  });

  it("calculates OG index after a full completed 18-hole round", () => {
    const c = course18();
    // holes: par 3 when (number-1)%3===0 → 1,4,7,10,13,16 (6 holes); else par 4 (12)
    // all scores 5 → diff = 6*2 + 12*1 = 24
    const round = completedRound("r1", c, "p1", 5);
    expect(playerUsesStartingHandicap("p1", [round], [c])).toBe(false);
    expect(calculateHandicapForPlayer("p1", [round], [c], 12)).toBe(24);
  });

  it("doubles 9-hole differentials before averaging with 18-hole rounds", () => {
    const c = course18();
    const nine = completedRound("r9", c, "p1", 5, {
      roundLength: 9,
      nineSide: "front",
      startingHole: 1,
    });
    // Front 9: holes 1,4,7 par3 (3) + six par4 → diff 3*2+6*1=12; doubled → 24
    const eighteen = completedRound("r18", c, "p1", 4);
    // 18-hole all 4s: par3 holes +1 (6) + par4 E (12) → 6
    // average (24+6)/2 = 15
    expect(calculateHandicapForPlayer("p1", [nine, eighteen], [c], 0)).toBe(15);
  });

  it("recalculateAllHandicaps preserves other players starting values", () => {
    const c = course18();
    const p1 = makePlayer("p1", 8);
    const p2 = makePlayer("p2", 14);
    const round = completedRound("r1", c, "p1", 4);
    const updated = recalculateAllHandicaps([p1, p2], [round], [c]);
    expect(updated.find((p) => p.id === "p2")?.handicap).toBe(14);
    expect(updated.find((p) => p.id === "p1")?.handicap).not.toBe(8);
  });
});
