import { describe, expect, it } from "vitest";
import type { Course, Round, RoundTee } from "./types";
import { withWhsHistory } from "./calculations";
import {
  computeWhsForPlayer,
  countingRecords,
  expectedNineHoleDifferential,
  indexPairLabel,
  round1,
  strokesOnHole,
  whsIndexBefore,
} from "./whs";

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("9-hole expected score (USGA 2024)", () => {
  it("reproduces the USGA worked example: Index 14.0, 9-hole differential 7.2 → 15.7", () => {
    // usga.org … 2024-treatment-of-9-hole-scores-FAQ.html
    expect(expectedNineHoleDifferential(14.0)).toBeCloseTo(8.48);
    expect(round1(7.2 + expectedNineHoleDifferential(14.0))).toBe(15.7);
  });
});

const now = "2026-01-01T00:00:00.000Z";
const course: Course = { id: "c", name: "T", location: "", createdAt: now, holes: range(18).map((n) => ({ number: n, par: 4, strokeIndex: n })) };
const tee: RoundTee = { teeId: "t", name: "Azul", color: "#00f", gender: "men", rating: 70, slope: 113, par: 72 };
const day = (d: number) => new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString();
let n = 0;
const rnd = (score: number, d: number, withTee = true): Round => ({
  id: `r${++n}`, courseId: "c", date: day(d), createdAt: day(d), completed: true, roundLength: 18, nineSide: "front", startingHole: 1,
  ...(withTee ? { tee } : {}),
  playerScores: [{ playerId: "p", scores: range(18).map((h) => ({ holeNumber: h, score: score + (h === 1 ? 1 : 0) })) }],
});

describe("strokes received on the hole screen", () => {
  it("CH from the snapshot + stroke index", () => {
    // Index 20 → CH 20 + (70 − 72) = 18 → one per hole
    expect(strokesOnHole(course, { tee, roundLength: 18 }, 20, 7)).toBe(1);
    // Index 10 → CH 8 → SI 1–8 get one
    expect(strokesOnHole(course, { tee, roundLength: 18 }, 10, 8)).toBe(1);
    expect(strokesOnHole(course, { tee, roundLength: 18 }, 10, 9)).toBe(0);
    // Plus: Index −1 → CH −3 → SI 16–18 give one back
    expect(strokesOnHole(course, { tee, roundLength: 18 }, -1, 18)).toBe(-1);
  });
  it("nothing for legacy / no-index rounds", () => {
    expect(strokesOnHole(course, { roundLength: 18 }, 20, 1)).toBeNull();
    expect(strokesOnHole(course, { tee, roundLength: 18 }, null, 1)).toBeNull();
  });
  it("9 holes rank the nine's stroke indexes", () => {
    // Index 20 → CH9 = round(10 + (35 − 36)) = 9 → one per hole on the back nine
    expect(strokesOnHole(course, { tee, roundLength: 9, nineSide: "back", startingHole: 10 }, 20, 10)).toBe(1);
  });
  it("index before the round start", () => {
    const rs = [rnd(5, 1), rnd(5, 2), rnd(5, 3)];
    expect(whsIndexBefore("p", rs, [course], day(3))).toBeNull();
    expect(whsIndexBefore("p", rs, [course], day(4))).not.toBeNull();
  });
});

describe("score record display", () => {
  it("marks which of the last 20 count (table count)", () => {
    const rs = [rnd(5, 1), rnd(4, 2), rnd(6, 3), rnd(5, 4), rnd(5, 5), rnd(4, 6)];
    const { records } = computeWhsForPlayer("p", rs, [course]);
    const c = countingRecords(records);
    expect(c.use).toBe(2);
    expect(c.adjustment).toBe(-1);
    expect([...c.counting].map((r) => r.roundIds[0]).sort()).toEqual([rs[1].id, rs[5].id].sort());
  });
  it("keeps only the most recent 20", () => {
    const rs = Array.from({ length: 23 }, (_, i) => rnd(4, i + 1));
    const c = countingRecords(computeWhsForPlayer("p", rs, [course]).records);
    expect(c.recent).toHaveLength(20);
    expect(c.counting.size).toBe(8);
  });
  it("reports caps and low index", () => {
    const good = Array.from({ length: 20 }, (_, i) => rnd(4, i + 1));
    const bad = Array.from({ length: 20 }, (_, i) => rnd(6, 40 + i));
    const res = computeWhsForPlayer("p", [...good, ...bad], [course]);
    const last = res.records[res.records.length - 1];
    expect(last.capApplied).toBe("hard");
    expect(last.lowIndexAt).toBe(res.lowIndex);
    expect(res.records.some((r) => r.capApplied === "soft")).toBe(true);
    expect(res.records[0].capApplied).toBeNull();
  });
});

describe("history chart follows WHS once active", () => {
  it("legacy points before, WHS after", () => {
    const pts = [1, 2, 3, 4].map((d) => ({ date: day(d), handicap: 30, label: "" }));
    const recs = [{ date: day(2), indexAfter: null }, { date: day(3), indexAfter: 12.5 }, { date: day(4), indexAfter: 11.9 }];
    expect(withWhsHistory(pts, recs).map((p) => [p.handicap, p.source])).toEqual([
      [30, "legacy"], [30, "legacy"], [12.5, "whs"], [11.9, "whs"],
    ]);
  });
});

describe("side-by-side label", () => {
  it("WHS · old, or progress to WHS", () => {
    expect(indexPairLabel({ handicap: 12.5, whsIndex: 12.5, legacyOgIndex: 26.4 })).toBe("WHS 12.5 · old 26.4");
    expect(indexPairLabel({ handicap: 26.4, legacyOgIndex: 26.4 }, 1)).toBe("old 26.4 · WHS after 3 tee'd rounds (1/3)");
  });
});
