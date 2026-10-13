import { describe, expect, it } from "vitest";
import type { ActiveRound, Course, Player, Round } from "@/lib/types";
import { MULTIPLAYER_ENABLED } from "./features";
import {
  createSinglePlayerRound,
  focusPlayerIdForRound,
  isRoundFullyScoredFor,
  mePlayerScoreInRound,
  requiredPlayerIds,
  resolveMePlayerId,
  roundFocusedOnPlayer,
} from "./me";

const now = "2026-10-13T00:00:00.000Z";
const P = (id: string, name: string, nickname?: string): Player => ({ id, name, nickname, handicap: 10, startingHandicap: 10, updatedAt: now });
const course = (n = 18): Course => ({ id: "c1", name: "Quito", location: "Quito", createdAt: now, holes: Array.from({ length: n }, (_, i) => ({ number: i + 1, par: 4 })) });
const R = (id: string, ids: string[], holes = 18): Round => ({
  id, courseId: "c1", date: now, createdAt: now, completed: true, roundLength: 18, nineSide: "front", startingHole: 1,
  playerScores: ids.map((pid) => ({ playerId: pid, scores: Array.from({ length: holes }, (_, i) => ({ holeNumber: i + 1, score: 5 })) })),
});

describe("single-player flag", () => {
  it("ships with the multiplayer UI turned off", () => {
    expect(MULTIPLAYER_ENABLED).toBe(false);
  });
});

describe("resolveMePlayerId", () => {
  const andres = P("a", "Andrés Villacís");
  const pato = P("p", "Patricio Aguilar");
  const juan = P("j", "Juan Pérez");

  it("returns null with no players (first-run Me setup)", () => {
    expect(resolveMePlayerId([], [], null)).toBeNull();
    expect(resolveMePlayerId([], [], "p")).toBeNull();
  });

  it("keeps a stored Me that still exists", () => {
    expect(resolveMePlayerId([andres, pato], [], "a")).toBe("a");
  });

  it("ignores a stored id that no longer exists (e.g. after an import)", () => {
    expect(resolveMePlayerId([andres, pato], [], "gone")).toBe("p");
  });

  it("prefers the owner by first name, case-insensitive, even with fewer rounds", () => {
    const rounds = [R("r1", ["a"]), R("r2", ["a"]), R("r3", ["a", "p"])];
    expect(resolveMePlayerId([andres, P("p", "patricio")], rounds, null)).toBe("p");
  });

  it("matches the owner's nickname too, but not a substring", () => {
    expect(resolveMePlayerId([andres, P("x", "P. Aguilar", "Patricio")], [], null)).toBe("x");
    expect(resolveMePlayerId([P("y", "Patricios Bar"), andres], [R("r", ["a"])], null)).toBe("a");
  });

  it("picks the owner with the most rounds when several match", () => {
    const p2 = P("p2", "Patricio Junior");
    expect(resolveMePlayerId([pato, p2], [R("r1", ["p2"]), R("r2", ["p2", "p"]), R("r3", ["p2"])], null)).toBe("p2");
  });

  it("falls back to the player with the most rounds, then the first player", () => {
    expect(resolveMePlayerId([andres, juan], [R("r1", ["j"]), R("r2", ["j", "a"])], null)).toBe("j");
    expect(resolveMePlayerId([andres, juan], [], null)).toBe("a");
    // rounds with no scores for a player don't count
    expect(resolveMePlayerId([andres, juan], [R("r1", ["j"], 0)], null)).toBe("a");
  });
});

describe("createSinglePlayerRound", () => {
  it("creates a round for Me only, with the chosen nine / start hole", () => {
    const { round, firstHole } = createSinglePlayerRound(course(), "p", { roundLength: 9, nineSide: "back", startingHole: 10 }, { id: "r1", now: new Date(now) });
    expect(round.playerIds).toEqual(["p"]);
    expect(round.scores).toEqual({ p: [] });
    expect(round).toMatchObject({ id: "r1", courseId: "c1", roundLength: 9, nineSide: "back", startingHole: 10, startTime: now });
    expect(firstHole).toBe(10);
  });

  it("starts 18 from hole 10 and normalises a 9-hole course", () => {
    expect(createSinglePlayerRound(course(), "p", { roundLength: 18, startingHole: 10 }, { id: "r" }).firstHole).toBe(10);
    const nine = createSinglePlayerRound(course(9), "p", { roundLength: 18, startingHole: 10 }, { id: "r" });
    expect(nine.round.roundLength).toBe(9);
    expect(nine.firstHole).toBe(1);
  });
});

describe("focus on Me in old multiplayer rounds", () => {
  const active: ActiveRound = { id: "r", courseId: "c1", playerIds: ["a", "p"], scores: { a: [], p: [] }, startTime: now, roundLength: 9, nineSide: "front", startingHole: 1 };

  it("focuses Me when Me played, else the first player", () => {
    expect(focusPlayerIdForRound(active, "p")).toBe("p");
    expect(focusPlayerIdForRound(active, "zz")).toBe("a");
    expect(focusPlayerIdForRound({ playerIds: [] }, "p")).toBeNull();
  });

  it("only Me must hole out / finish in single-player mode", () => {
    expect(requiredPlayerIds(active, "p", false)).toEqual(["p"]);
    expect(requiredPlayerIds(active, "p", true)).toEqual(["a", "p"]);
    const c = course();
    const mineDone = { ...active, scores: { a: [], p: Array.from({ length: 9 }, (_, i) => ({ holeNumber: i + 1, score: 4 })) } };
    expect(isRoundFullyScoredFor(mineDone, c, ["p"])).toBe(true);
    expect(isRoundFullyScoredFor(mineDone, c, ["a", "p"])).toBe(false);
    expect(isRoundFullyScoredFor(mineDone, c, [])).toBe(false);
  });

  it("history/export copies keep only Me without touching the stored round", () => {
    const round = R("r1", ["a", "p"]);
    const mine = roundFocusedOnPlayer(round, "p");
    expect(mine.playerScores.map((ps) => ps.playerId)).toEqual(["p"]);
    expect(round.playerScores).toHaveLength(2);
    expect(roundFocusedOnPlayer(round, "zz")).toBe(round);
    expect(mePlayerScoreInRound(round, "p")?.playerId).toBe("p");
    expect(mePlayerScoreInRound(round, "zz")).toBeNull();
  });
});
