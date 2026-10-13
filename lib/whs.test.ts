import { describe, expect, it } from "vitest";
import type { Course, Player, Round, RoundTee } from "./types";
import { computePlayerIndexes, legacyOgIndex, recalculateAllHandicaps, playerUsesStartingHandicap } from "./calculations";
import {
  WHS_MAX_INDEX,
  adjustedGrossScore,
  allocationRanks,
  applyCaps,
  computeWhsForPlayer,
  courseHandicap,
  differentialsToUse,
  expectedNineHoleDifferential,
  indexFromDifferentials,
  netDoubleBogey,
  nineHoleCourseHandicap,
  round1,
  scoreDifferential,
  strokesReceived,
} from "./whs";

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("course handicap", () => {
  it("worked examples (Index × Slope/113 + (CR − Par))", () => {
    expect(courseHandicap(14.3, 127, 70.4, 72)).toBe(14); // 16.07 − 1.6 = 14.47
    expect(courseHandicap(10.4, 132, 71.5, 72)).toBe(12); // 12.15 − 0.5 = 11.65
    expect(courseHandicap(18.0, 136, 71.5, 71)).toBe(22); // Arrayanes Azul: 21.66 + 0.5 = 22.16
    expect(courseHandicap(0, 113, 72.5, 72)).toBe(1); // .5 rounds up
    expect(courseHandicap(-1.2, 125, 72.4, 72)).toBe(-1); // plus: −1.33 + 0.4 = −0.93
    expect(courseHandicap(0, 113, 71.5, 72)).toBe(0); // −0.5 rounds up to 0
    expect(courseHandicap(54, 155, 80, 72)).toBe(82);
  });
  it("9-hole course handicap uses half the index", () => {
    expect(nineHoleCourseHandicap(14.3, 127, 35.2, 36)).toBe(7); // 8.04 − 0.8 = 7.24
  });
});

describe("stroke allocation + net double bogey", () => {
  const si = range(18);
  it("allocates by stroke index, wrapping over 18", () => {
    expect(strokesReceived(10, si)).toEqual(si.map((s) => (s <= 10 ? 1 : 0)));
    expect(strokesReceived(18, si)).toEqual(Array(18).fill(1));
    expect(strokesReceived(20, si)).toEqual(si.map((s) => (s <= 2 ? 2 : 1)));
    expect(strokesReceived(40, si)).toEqual(si.map((s) => (s <= 4 ? 3 : 2)));
  });
  it("plus handicaps give strokes back from the easiest hole", () => {
    expect(strokesReceived(-2, si)).toEqual(si.map((s) => (s >= 17 ? -1 : 0)));
    expect(strokesReceived(0, si)).toEqual(Array(18).fill(0));
  });
  it("ranks a nine's 18-hole stroke indexes 1–9", () => {
    expect(allocationRanks([18, 14, 10, 8, 12, 4, 16, 2, 6])).toEqual([9, 7, 5, 4, 6, 2, 8, 1, 3]);
    expect(allocationRanks([undefined, 3, undefined])).toEqual([2, 1, 3]);
  });
  it("NDB = par + 2 + strokes; AGS caps each hole", () => {
    expect(netDoubleBogey(4, 1)).toBe(7);
    expect(netDoubleBogey(3, -1)).toBe(4);
    // CH 1 on two par-4 holes (SI 1 and 2): hole SI1 cap 7, SI2 cap 6.
    expect(adjustedGrossScore([{ par: 4, score: 9, strokeIndex: 1 }, { par: 4, score: 9, strokeIndex: 2 }], 1)).toBe(13);
    // No index yet: par + 5.
    expect(adjustedGrossScore([{ par: 4, score: 11 }, { par: 3, score: 5 }], null)).toBe(14);
    // Plus 2 on 18 holes: SI 17/18 cap at par + 1.
    const holes = range(18).map((n) => ({ par: 4, score: 8, strokeIndex: n }));
    expect(adjustedGrossScore(holes, -2)).toBe(16 * 6 + 2 * 5);
  });
});

describe("score differential", () => {
  it("worked examples, 1 decimal, PCC 0", () => {
    expect(scoreDifferential(85, 71.2, 124)).toBe(12.6); // 113/124 × 13.8 = 12.58
    expect(scoreDifferential(95, 73.1, 133)).toBe(18.6); // 113/133 × 21.9 = 18.61
    expect(scoreDifferential(70, 72.5, 130)).toBe(-2.2); // 113/130 × −2.5 = −2.17
    expect(scoreDifferential(90, 72, 113, 1)).toBe(17); // PCC subtracted
    expect(round1(0.15)).toBe(0.2);
  });
});

describe("index table 3–19 and best 8 of 20", () => {
  it("rule table", () => {
    expect(differentialsToUse(2)).toBeNull();
    expect(differentialsToUse(3)).toEqual({ use: 1, adjustment: -2 });
    expect(differentialsToUse(4)).toEqual({ use: 1, adjustment: -1 });
    expect(differentialsToUse(5)).toEqual({ use: 1, adjustment: 0 });
    expect(differentialsToUse(6)).toEqual({ use: 2, adjustment: -1 });
    expect([7, 8].map((n) => differentialsToUse(n)!.use)).toEqual([2, 2]);
    expect([9, 10, 11].map((n) => differentialsToUse(n)!.use)).toEqual([3, 3, 3]);
    expect([12, 13, 14].map((n) => differentialsToUse(n)!.use)).toEqual([4, 4, 4]);
    expect([15, 16].map((n) => differentialsToUse(n)!.use)).toEqual([5, 5]);
    expect([17, 18].map((n) => differentialsToUse(n)!.use)).toEqual([6, 6]);
    expect(differentialsToUse(19)!.use).toBe(7);
    expect(differentialsToUse(20)!.use).toBe(8);
  });
  it("worked examples", () => {
    expect(indexFromDifferentials([12.0, 14.0])).toBeNull();
    expect(indexFromDifferentials([14.2, 12.0, 15.1])).toBe(10.0); // 12.0 − 2
    expect(indexFromDifferentials([14.2, 12.0, 15.1, 13.0])).toBe(11.0); // 12.0 − 1
    expect(indexFromDifferentials([14.2, 12.0, 15.1, 13.0, 16.0])).toBe(12.0);
    expect(indexFromDifferentials([14.2, 12.0, 15.1, 13.0, 16.0, 11.5])).toBe(10.8); // (11.5+12)/2 − 1 = 10.75
    expect(indexFromDifferentials([10, 11, 12, 13, 14, 15, 16])).toBe(10.5);
    // 22 scores: only the most recent 20 count; best 8 of those.
    const d = [1, 1, ...range(20).map((n) => n + 10)]; // the two 1s fall out
    expect(indexFromDifferentials(d)).toBe(round1((11 + 12 + 13 + 14 + 15 + 16 + 17 + 18) / 8));
  });
  it("caps the index at 54.0", () => {
    expect(indexFromDifferentials([70, 70, 70, 70, 70])).toBe(WHS_MAX_INDEX);
  });
});

describe("soft / hard caps", () => {
  it("no change within +3.0", () => {
    expect(applyCaps(12.9, 10.0)).toBe(12.9);
    expect(applyCaps(13.0, 10.0)).toBe(13.0);
  });
  it("soft cap halves the rise above +3.0", () => {
    expect(applyCaps(14.0, 10.0)).toBe(13.5);
    expect(applyCaps(14.9, 10.0)).toBe(14.0); // 13 + 0.95 = 13.95 → 14.0
  });
  it("hard cap at +5.0", () => {
    expect(applyCaps(18.0, 10.0)).toBe(15.0); // soft 15.5 → hard 15.0
    expect(applyCaps(9.0, 10.0)).toBe(9.0); // going down is never capped
    expect(applyCaps(20, null)).toBe(20);
  });
});

// ---------- player-level ----------
const now = "2026-01-01T00:00:00.000Z";
const course: Course = {
  id: "c", name: "Test", location: "", createdAt: now,
  holes: range(18).map((n) => ({ number: n, par: 4, strokeIndex: n })),
};
const tee: RoundTee = { teeId: "t", name: "Azul", color: "#00f", gender: "men", rating: 70.0, slope: 113, par: 72 };
let seq = 0;
const day = (d: number) => new Date(Date.UTC(2026, 0, 1) + d * 86400000).toISOString();
function round(scores: number[], opts: Omit<Partial<Round>, "tee"> & { d: number; tee?: RoundTee | null }): Round {
  const { d, tee: t, ...rest } = opts;
  const holes = scores.length === 9 ? (rest.nineSide === "back" ? range(9).map((n) => n + 9) : range(9)) : range(18);
  return {
    id: `r${++seq}`, courseId: "c", date: day(d), createdAt: day(d), completed: true,
    roundLength: scores.length === 9 ? 9 : 18, nineSide: "front", startingHole: 1,
    ...(t === null ? {} : { tee: t ?? tee }),
    ...rest,
    playerScores: [{ playerId: "p", scores: holes.map((h, i) => ({ holeNumber: h, score: scores[i] })) }],
  };
}
const all = (s: number, n = 18) => Array(n).fill(s);

describe("computeWhsForPlayer", () => {
  it("first rounds use par + 5; differentials from AGS; index after 3", () => {
    const r1 = round([...all(5, 17), 12], { d: 1 }); // hole 18: 12 → capped at 9 (par+5)
    const r2 = round(all(5), { d: 2 });
    const r3 = round(all(6), { d: 3 });
    const res = computeWhsForPlayer("p", [r3, r1, r2], [course]);
    expect(res.records.map((r) => r.adjustedGross)).toEqual([94, 90, 108]);
    expect(res.records.map((r) => r.courseHandicap)).toEqual([null, null, null]);
    expect(res.records.map((r) => r.differential)).toEqual([24, 20, 38]);
    expect(res.records.map((r) => r.indexAfter)).toEqual([null, null, 18]); // 20 − 2
    expect(res.index).toBe(18);
  });

  it("with an index, later rounds cap at net double bogey", () => {
    const rs = [round(all(5), { d: 1 }), round(all(5), { d: 2 }), round(all(5), { d: 3 })]; // index 20 − 2 = 18
    const big = round([10, ...all(5, 17)], { d: 4 }); // CH 18+(70−72)=16 → SI1: NDB 4+2+1 = 7
    const res = computeWhsForPlayer("p", [...rs, big], [course]);
    expect(res.records[3].courseHandicap).toBe(16);
    expect(res.records[3].adjustedGross).toBe(7 + 85);
    expect(res.records[3].differential).toBe(22);
  });

  it("ignores legacy (no tee), incomplete and other players' rounds", () => {
    const legacy = round(all(4), { d: 1, tee: null });
    const partial = round(all(4), { d: 2 });
    partial.playerScores[0].scores.pop();
    const notDone = round(all(4), { d: 3, completed: false });
    const res = computeWhsForPlayer("p", [legacy, partial, notDone], [course]);
    expect(res.records).toHaveLength(0);
    expect(res.index).toBeNull();
    expect(computeWhsForPlayer("q", [round(all(4), { d: 4 })], [course]).records).toHaveLength(0);
  });

  it("9 holes without an index: two nines combine in date order", () => {
    const a = round(all(5, 9), { d: 1 });
    const b = round(all(6, 9), { d: 2, nineSide: "back", startingHole: 10 });
    const lone = round(all(5, 9), { d: 3 });
    const res = computeWhsForPlayer("p", [lone, b, a], [course]);
    expect(res.records).toHaveLength(1);
    expect(res.records[0]).toMatchObject({ method: "9+9", roundIds: [a.id, b.id], adjustedGross: 99, differential: 29, date: b.date });
    expect(res.pendingRoundIds).toEqual([lone.id]);
  });

  it("9 holes with an index: 9-hole differential + expected score (half rating, same slope)", () => {
    const rs = [round(all(5), { d: 1 }), round(all(5), { d: 2 }), round(all(5), { d: 3 })]; // index 18.0
    const nine = round(all(5, 9), { d: 4 }); // CH9 = round(9 + (35 − 36)) = 8 → no caps hit; AGS 45
    const res = computeWhsForPlayer("p", [...rs, nine], [course]);
    const rec = res.records[3];
    expect(rec.method).toBe("9+expected");
    expect(rec.courseHandicap).toBe(8);
    expect(expectedNineHoleDifferential(18)).toBeCloseTo(10.56);
    expect(rec.differential).toBe(round1(45 - 35 + 10.56)); // 20.6
  });

  it("soft/hard caps apply once there are 20 scores, using the low index in the last 365 days", () => {
    const good = Array.from({ length: 20 }, (_, i) => round(all(4), { d: i + 1 })); // diff 2.0 each
    const bad = Array.from({ length: 20 }, (_, i) => round(all(6), { d: 30 + i })); // diff 38.0 each
    const res = computeWhsForPlayer("p", [...good, ...bad], [course]);
    // Index history: 3 scores → 2.0 − 2 = 0.0 (the low), …, 20 scores → 2.0.
    expect(res.records[2].indexAfter).toBe(0.0);
    expect(res.records[19].indexAfter).toBe(2.0);
    expect(res.lowIndex).toBe(0.0);
    // Uncapped the last 20 would give 38.0; the hard cap holds it at low + 5.0.
    expect(indexFromDifferentials(res.records.slice(20).map((r) => r.differential))).toBe(38);
    expect(res.index).toBe(5.0);
    // Soft cap seen on the way up (rise between 3 and 5 is halved).
    expect(res.records.slice(20).every((r) => r.indexAfter! <= 5.0)).toBe(true);
  });

  it("low index only looks back 365 days", () => {
    const old = Array.from({ length: 20 }, (_, i) => round(all(4), { d: i + 1 })); // low 0.0, early 2026
    const later = Array.from({ length: 20 }, (_, i) => round(all(6), { d: 400 + i })); // a year+ later
    const res = computeWhsForPlayer("p", [...old, ...later], [course]);
    // The 0.0 from >365 days ago no longer counts; the low is the 2.0 recorded at day 400.
    expect(res.lowIndex).toBe(2.0);
    expect(res.index).toBe(7.0); // hard cap 2.0 + 5.0
  });
});

describe("stored player index (mixed legacy + WHS)", () => {
  const base: Player = { id: "p", name: "Pato", handicap: 18, startingHandicap: 18, updatedAt: now };

  it("fewer than 3 tee'd rounds → legacy value shown, WHS absent", () => {
    const rs = [round(all(5), { d: 1, tee: null }), round(all(5), { d: 2 }), round(all(5), { d: 3 })];
    const r = computePlayerIndexes(base, rs, [course]);
    expect(r).toEqual({ handicap: legacyOgIndex("p", rs, [course], 18), legacyOgIndex: 18, whsIndex: undefined, indexSource: "legacy" });
  });

  it("3+ tee'd rounds → WHS shown, legacy kept beside it", () => {
    const rs = [round(all(5), { d: 1, tee: null }), ...[2, 3, 4].map((d) => round(all(5), { d }))];
    const r = computePlayerIndexes(base, rs, [course]);
    expect(r.indexSource).toBe("whs");
    expect(r.whsIndex).toBe(18); // 20 − 2
    expect(r.handicap).toBe(18);
    expect(r.legacyOgIndex).toBe(18); // avg vs par +18 over the 4 rounds (legacy math unchanged)
    expect(playerUsesStartingHandicap("p", rs, [course])).toBe(false);
  });

  it("recalc returns the same array when nothing changed and pins the old value", () => {
    const rs = [2, 3, 4].map((d) => round(all(5), { d }));
    const legacyOnly: Player = { id: "p", name: "Pato", handicap: 12.3, updatedAt: now };
    const once = recalculateAllHandicaps([legacyOnly], rs, [course]);
    expect(once[0].startingHandicap).toBe(12.3); // old value never lost
    expect(once[0].handicap).toBe(18);
    expect(recalculateAllHandicaps(once, rs, [course])).toBe(once);
  });
});
