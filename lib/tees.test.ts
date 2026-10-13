import { describe, expect, it } from "vitest";
import type { Course, Round } from "./types";
import { SUGGESTED_COURSE_TEMPLATES } from "./calculations";
import {
  ARRAYANES_SEED,
  QUITO_SEED,
  findSeedForCourseName,
  migrateCourse,
  migrateCourses,
  pickInitialTee,
  snapshotTee,
  validateStrokeIndexes,
  validateTee,
  validateTees,
} from "./tees";

const now = "2026-10-13T00:00:00.000Z";
const mk = (id: string, name: string, pars: number[]): Course => ({
  id, name, location: "Quito, Ecuador", createdAt: now, holes: pars.map((par, i) => ({ number: i + 1, par })),
});
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("seed data", () => {
  it("stroke indexes are permutations of 1–18", () => {
    for (const s of [QUITO_SEED, ARRAYANES_SEED]) {
      expect([...s.strokeIndex].sort((a, b) => a - b)).toEqual(range(18));
      expect(validateStrokeIndexes(s.strokeIndex)).toEqual([]);
      expect(validateTees(s.tees)).toEqual([]);
    }
  });

  it("matches the official ratings", () => {
    const a = Object.fromEntries(ARRAYANES_SEED.tees.map((t) => [t.name, [t.men, t.women]]));
    expect(a.Azul).toEqual([{ rating: 71.5, slope: 136 }, { rating: 77.9, slope: 152 }]);
    expect(a.Rojo).toEqual([{ rating: 65.0, slope: 118 }, { rating: 70.2, slope: 134 }]);
    const q = Object.fromEntries(QUITO_SEED.tees.map((t) => [t.name, t]));
    expect(QUITO_SEED.tees.map((t) => t.name)).toEqual(["Negra", "Azul", "Blanca", "Dorada", "Roja", "Naranja", "Celeste", "Rosada"]);
    expect(q.Negra.men).toEqual({ rating: 74.2, slope: 140 });
    expect(q.Negra.women).toBeUndefined();
    expect(q.Rosada.women).toEqual({ rating: 55.6, slope: 101 });
    expect(QUITO_SEED.tees.filter((t) => t.women).map((t) => t.name)).toEqual(["Dorada", "Roja", "Naranja", "Celeste", "Rosada"]);
  });

  it("templates carry tees + SI and their pars are unchanged", () => {
    const q = SUGGESTED_COURSE_TEMPLATES.find((t) => t.name === QUITO_SEED.name)!;
    const a = SUGGESTED_COURSE_TEMPLATES.find((t) => t.name === ARRAYANES_SEED.name)!;
    expect(q.suggestedPars).toEqual(QUITO_SEED.pars);
    expect(a.suggestedPars).toEqual(ARRAYANES_SEED.pars);
    expect(sum(a.suggestedPars!)).toBe(71);
    expect(q.tees).toHaveLength(8);
    expect(a.tees).toHaveLength(4);
    expect(a.strokeIndex).toEqual([18, 14, 10, 8, 12, 4, 16, 2, 6, 9, 13, 11, 5, 7, 1, 3, 17, 15]);
    expect(q.strokeIndex).toEqual([10, 16, 14, 6, 4, 8, 12, 18, 2, 1, 5, 13, 17, 3, 7, 15, 11, 9]);
  });
});

describe("validateStrokeIndexes", () => {
  it("allows all blank (legacy)", () => {
    expect(validateStrokeIndexes(Array(18).fill(undefined))).toEqual([]);
  });
  it("flags missing, out of range and duplicates", () => {
    const v: Array<number | undefined> = range(18);
    v[2] = undefined;
    expect(validateStrokeIndexes(v)[0]).toMatch(/missing on hole 3/);
    expect(validateStrokeIndexes([...range(17), 19]).join()).toMatch(/1 to 18 \(got 19\)/);
    expect(validateStrokeIndexes([...range(17), 0]).join()).toMatch(/got 0/);
    expect(validateStrokeIndexes([...range(17), 5]).join()).toMatch(/more than once: 5/);
    expect(validateStrokeIndexes([...range(17), 1.5]).join()).toMatch(/whole number/);
  });
  it("accepts 9-hole courses with unique 1–18 values", () => {
    expect(validateStrokeIndexes([1, 3, 5, 7, 9, 11, 13, 15, 17])).toEqual([]);
    expect(validateStrokeIndexes(range(9))).toEqual([]);
  });
});

describe("validateTee", () => {
  const base = { id: "t", name: "Azul", color: "#00f", par: 72 };
  it("needs a name and at least one gender's rating", () => {
    expect(validateTee({ ...base, name: " " , men: { rating: 70, slope: 120 } }).join()).toMatch(/needs a name/);
    expect(validateTee(base).join()).toMatch(/men's or women's/);
    expect(validateTee({ ...base, women: { rating: 70, slope: 120 } })).toEqual([]);
  });
  it("range-checks rating and slope", () => {
    expect(validateTee({ ...base, men: { rating: 95, slope: 120 } }).join()).toMatch(/rating/);
    expect(validateTee({ ...base, men: { rating: 70, slope: 160 } }).join()).toMatch(/slope/);
    expect(validateTee({ ...base, men: { rating: 70, slope: 120.5 } }).join()).toMatch(/slope/);
  });
  it("rejects duplicate tee names", () => {
    const t = { ...base, men: { rating: 70, slope: 120 } };
    expect(validateTees([t, { ...t, id: "u", name: "azul" }]).join()).toMatch(/unique/);
  });
});

describe("migration", () => {
  const stored = [
    mk("c1", "Quito Tenis y Golf Club", QUITO_SEED.pars),
    mk("c2", "Arrayanes Country Club", ARRAYANES_SEED.pars),
    mk("c3", "Some Other Course", Array(18).fill(4)),
  ];

  it("matches by name (accents/case-insensitive)", () => {
    expect(findSeedForCourseName("ARRAYANES country club")).toBe(ARRAYANES_SEED);
    expect(findSeedForCourseName("Quito Tenis & Golf")).toBe(QUITO_SEED);
    expect(findSeedForCourseName("Los Cerros")).toBeNull();
  });

  it("adds tees + SI, never touches pars, leaves other courses alone", () => {
    const { courses, changed } = migrateCourses(stored);
    expect(changed).toBe(true);
    expect(courses[0].holes.map((h) => h.par)).toEqual(QUITO_SEED.pars);
    expect(courses[1].holes.map((h) => h.par)).toEqual(ARRAYANES_SEED.pars);
    expect(courses[0].holes.map((h) => h.strokeIndex)).toEqual(QUITO_SEED.strokeIndex);
    expect(courses[1].holes.map((h) => h.strokeIndex)).toEqual(ARRAYANES_SEED.strokeIndex);
    expect(courses[0].tees).toHaveLength(8);
    expect(courses[1].tees!.map((t) => t.par)).toEqual([71, 71, 71, 71]);
    expect(courses[2]).toBe(stored[2]);
  });

  it("is idempotent", () => {
    const once = migrateCourses(stored).courses;
    const twice = migrateCourses(once);
    expect(twice.changed).toBe(false);
    expect(twice.courses).toBe(once);
    expect(JSON.parse(JSON.stringify(twice.courses))).toEqual(JSON.parse(JSON.stringify(once)));
  });

  it("keeps user edits: existing SI, edited/removed seed tees aren't overwritten, custom tees kept", () => {
    const [q] = migrateCourses(stored).courses;
    const edited: Course = {
      ...q,
      holes: q.holes.map((h) => ({ ...h, strokeIndex: 19 - h.strokeIndex! })),
      tees: [{ ...q.tees![0], men: { rating: 74.0, slope: 139 } }, { id: "mine", name: "Practice", color: "#000", par: 72, men: { rating: 60, slope: 100 } }],
    };
    const m = migrateCourse(edited);
    expect(m.holes.map((h) => h.strokeIndex)).toEqual(edited.holes.map((h) => h.strokeIndex));
    expect(m.tees!.find((t) => t.name === "Negra")!.men).toEqual({ rating: 74.0, slope: 139 });
    expect(m.tees!.some((t) => t.id === "mine")).toBe(true);
    // removed seed tees stay removed (only 2 tees, as the user left them)
    expect(m.tees).toHaveLength(2);
    expect(m).toBe(edited);
  });

  it("an empty tee list (user removed all) is respected", () => {
    const [q] = migrateCourses(stored).courses;
    const none = { ...q, tees: [] };
    expect(migrateCourse(none)).toBe(none);
  });

  it("does not write SI on a 9-hole course with a seed name", () => {
    const nine = migrateCourse(mk("c9", "Arrayanes 9", ARRAYANES_SEED.pars.slice(0, 9)));
    expect(nine.holes.every((h) => h.strokeIndex === undefined)).toBe(true);
    expect(nine.holes.map((h) => h.par)).toEqual(ARRAYANES_SEED.pars.slice(0, 9));
  });

  it("never touches rounds (migration only takes courses) and old rounds stay legacy", () => {
    const round: Round = { id: "r", courseId: "c1", date: now, createdAt: now, completed: true, playerScores: [{ playerId: "p", scores: [{ holeNumber: 1, score: 5 }] }] };
    const before = JSON.stringify(round);
    migrateCourses(stored);
    expect(JSON.stringify(round)).toBe(before);
    expect(round.tee).toBeUndefined();
  });
});

describe("tee snapshot + picker", () => {
  const [q] = migrateCourses([mk("c1", "Quito Tenis y Golf Club", QUITO_SEED.pars)]).courses;
  const negra = q.tees!.find((t) => t.name === "Negra")!;
  const dorada = q.tees!.find((t) => t.name === "Dorada")!;

  it("snapshots rating/slope/par for the chosen gender", () => {
    expect(snapshotTee(q, dorada.id, "women")).toEqual({ teeId: dorada.id, name: "Dorada", color: dorada.color, gender: "women", rating: 72.8, slope: 136, par: 72 });
    expect(snapshotTee(q, dorada.id, "men")).toMatchObject({ rating: 67.8, slope: 128 });
    expect(snapshotTee(q, negra.id, "women")).toBeNull();
    expect(snapshotTee(q, "nope", "men")).toBeNull();
  });

  it("snapshot is independent of later course edits", () => {
    const snap = snapshotTee(q, negra.id, "men")!;
    negra.men!.rating = 99;
    expect(snap.rating).toBe(74.2);
    negra.men!.rating = 74.2;
  });

  it("picks the last-used tee per course, else the first rated tee", () => {
    expect(pickInitialTee(q, "men", {})).toBe(negra.id);
    expect(pickInitialTee(q, "women", {})).toBe(dorada.id);
    expect(pickInitialTee(q, "men", { c1: { teeId: dorada.id, gender: "men" } })).toBe(dorada.id);
    // remembered tee not rated for this gender → first rated
    expect(pickInitialTee(q, "women", { c1: { teeId: negra.id, gender: "men" } })).toBe(dorada.id);
    expect(pickInitialTee({ ...q, tees: [] }, "men", {})).toBeNull();
  });
});
