import type { Course, Hole, RoundTee, Tee, TeeGender, TeeRating } from "./types";

// ==================== Seed data (official scorecards) ====================

export interface CourseSeed {
  /** Canonical course name (matches the built-in template). */
  name: string;
  /** Normalised name fragments that identify this course in stored data. */
  matchKeys: string[];
  /** Pars, for reference/tests only. Migration NEVER writes pars. */
  pars: number[];
  strokeIndex: number[];
  tees: Tee[];
}

const tee = (
  courseKey: string,
  name: string,
  color: string,
  par: number,
  men?: [number, number],
  women?: [number, number]
): Tee => ({
  id: `seed-${courseKey}-${normalizeName(name)}`,
  name,
  color,
  par,
  ...(men ? { men: { rating: men[0], slope: men[1] } } : {}),
  ...(women ? { women: { rating: women[0], slope: women[1] } } : {}),
});

export const ARRAYANES_SEED: CourseSeed = {
  name: "Arrayanes Country Club",
  matchKeys: ["arrayanes"],
  pars: [4, 4, 5, 3, 4, 5, 3, 4, 4, 4, 3, 5, 4, 3, 5, 4, 3, 4],
  strokeIndex: [18, 14, 10, 8, 12, 4, 16, 2, 6, 9, 13, 11, 5, 7, 1, 3, 17, 15],
  tees: [
    tee("arrayanes", "Azul", "#1e4fd8", 71, [71.5, 136], [77.9, 152]),
    tee("arrayanes", "Blanco", "#f5f5f0", 71, [69.2, 131], [75.1, 147]),
    tee("arrayanes", "Dorado", "#d4af37", 71, [66.7, 122], [71.8, 139]),
    tee("arrayanes", "Rojo", "#d32f2f", 71, [65.0, 118], [70.2, 134]),
  ],
};

export const QUITO_SEED: CourseSeed = {
  name: "Quito Tenis y Golf Club",
  matchKeys: ["quito tenis"],
  pars: [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 5, 4, 3, 4, 4, 3, 5, 4],
  strokeIndex: [10, 16, 14, 6, 4, 8, 12, 18, 2, 1, 5, 13, 17, 3, 7, 15, 11, 9],
  tees: [
    tee("quito", "Negra", "#151515", 72, [74.2, 140]),
    tee("quito", "Azul", "#1e4fd8", 72, [72.6, 136]),
    tee("quito", "Blanca", "#f5f5f0", 72, [70.3, 132]),
    tee("quito", "Dorada", "#d4af37", 72, [67.8, 128], [72.8, 136]),
    tee("quito", "Roja", "#d32f2f", 72, [66.1, 124], [71.0, 130]),
    tee("quito", "Naranja", "#f57c00", 72, [63.1, 118], [67.7, 122]),
    tee("quito", "Celeste", "#4fc3f7", 72, [60.4, 114], [62.2, 114]),
    tee("quito", "Rosada", "#f48fb1", 72, [54.7, 102], [55.6, 101]),
  ],
};

export const COURSE_SEEDS: CourseSeed[] = [QUITO_SEED, ARRAYANES_SEED];

/** Lowercase, accents stripped, punctuation collapsed. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findSeedForCourseName(name: string): CourseSeed | null {
  const n = normalizeName(name);
  return COURSE_SEEDS.find((s) => s.matchKeys.some((k) => n.includes(k))) ?? null;
}

// ==================== Validation ====================

export const RATING_MIN = 40;
export const RATING_MAX = 90;
export const SLOPE_MIN = 55;
export const SLOPE_MAX = 155;

/**
 * Stroke indexes are optional as a set: all blank is fine (legacy). Otherwise
 * every hole needs one, each 1–18, all unique; an 18-hole course must use
 * exactly 1–18.
 */
export function validateStrokeIndexes(values: Array<number | null | undefined>): string[] {
  const filled = values.filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(v));
  if (filled.length === 0) return [];
  const errors: string[] = [];
  const missing = values
    .map((v, i) => (v === null || v === undefined || Number.isNaN(v) ? i + 1 : null))
    .filter((h): h is number => h !== null);
  if (missing.length > 0) errors.push(`Stroke index missing on hole${missing.length === 1 ? "" : "s"} ${missing.join(", ")}.`);
  const bad = filled.filter((v) => !Number.isInteger(v) || v < 1 || v > 18);
  if (bad.length > 0) errors.push(`Stroke index must be a whole number from 1 to 18 (got ${[...new Set(bad)].join(", ")}).`);
  const seen = new Map<number, number>();
  filled.forEach((v) => seen.set(v, (seen.get(v) ?? 0) + 1));
  const dupes = [...seen.entries()].filter(([, c]) => c > 1).map(([v]) => v).sort((a, b) => a - b);
  if (dupes.length > 0) errors.push(`Stroke index used more than once: ${dupes.join(", ")}.`);
  return errors;
}

function validateRating(label: string, r: TeeRating | undefined): string[] {
  if (!r) return [];
  const errors: string[] = [];
  if (!Number.isFinite(r.rating) || r.rating < RATING_MIN || r.rating > RATING_MAX)
    errors.push(`${label} rating must be ${RATING_MIN}–${RATING_MAX}.`);
  if (!Number.isInteger(r.slope) || r.slope < SLOPE_MIN || r.slope > SLOPE_MAX)
    errors.push(`${label} slope must be a whole number ${SLOPE_MIN}–${SLOPE_MAX}.`);
  return errors;
}

export function validateTee(t: Tee): string[] {
  const label = t.name.trim() || "Tee";
  const errors: string[] = [];
  if (!t.name.trim()) errors.push("Every tee needs a name.");
  if (!Number.isInteger(t.par) || t.par < 27 || t.par > 80) errors.push(`${label}: par must be 27–80.`);
  if (!t.men && !t.women) errors.push(`${label}: enter a men's or women's rating and slope.`);
  errors.push(...validateRating(`${label} men's`, t.men).map((e) => e));
  errors.push(...validateRating(`${label} women's`, t.women).map((e) => e));
  return errors;
}

export function validateTees(tees: Tee[]): string[] {
  const errors = tees.flatMap(validateTee);
  const names = tees.map((t) => normalizeName(t.name)).filter(Boolean);
  const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  if (dupes.length > 0) errors.push("Tee names must be unique.");
  return errors;
}

// ==================== Migration ====================

/**
 * Seeds tees + stroke indexes onto a stored course whose name matches a seed.
 * Runs once per course: tees are only seeded while `course.tees` is absent
 * (never migrated), and stroke indexes only when the course has none at all
 * and the hole count matches. After that the user owns the data, so removed
 * or edited tees are never re-added. Pars are never changed. Returns the same
 * object when nothing changes (idempotent).
 */
export function migrateCourse(course: Course): Course {
  const seed = findSeedForCourseName(course.name);
  if (!seed) return course;
  let next = course;

  const hasAnySi = course.holes.some((h) => h.strokeIndex !== undefined && h.strokeIndex !== null);
  if (!hasAnySi && course.holes.length === seed.strokeIndex.length) {
    next = {
      ...next,
      holes: course.holes.map((h, i) => ({ ...h, strokeIndex: seed.strokeIndex[i] })),
    };
  }

  if (course.tees === undefined) {
    const coursePar = course.holes.reduce((sum, h) => sum + h.par, 0);
    next = {
      ...next,
      // Tee par mirrors the stored 18-hole course par (pars are never rewritten).
      tees: seed.tees.map((t) => ({ ...t, par: course.holes.length === 18 ? coursePar : t.par })),
    };
  }
  return next;
}

export function migrateCourses(courses: Course[]): { courses: Course[]; changed: boolean } {
  let changed = false;
  const out = courses.map((c) => {
    const m = migrateCourse(c);
    if (m !== c) changed = true;
    return m;
  });
  return { courses: changed ? out : courses, changed };
}

/** Holes with seed stroke indexes, for building a course from a template. */
export function seedHoles(seed: CourseSeed, pars: number[]): Hole[] {
  return pars.map((par, i) => ({ number: i + 1, par, strokeIndex: seed.strokeIndex[i] }));
}

// ==================== Round snapshot / picker ====================

export function teeRatingFor(t: Tee, gender: TeeGender): TeeRating | undefined {
  return gender === "women" ? t.women : t.men;
}

/** Snapshot the tee at round start, or null if that tee has no rating for the gender. */
export function snapshotTee(course: Course, teeId: string, gender: TeeGender): RoundTee | null {
  const t = course.tees?.find((x) => x.id === teeId);
  if (!t) return null;
  const r = teeRatingFor(t, gender);
  if (!r) return null;
  return { teeId: t.id, name: t.name, color: t.color, gender, rating: r.rating, slope: r.slope, par: t.par };
}

export const LAST_TEE_STORAGE_KEY = "og-golf-last-tee";
export type LastTeeMap = Record<string, { teeId: string; gender: TeeGender }>;

/**
 * Tee preselected at round start: the last one used on this course (if it
 * still exists and is rated for the gender), else the first rated tee.
 */
export function pickInitialTee(
  course: Course,
  gender: TeeGender,
  last: LastTeeMap | null | undefined
): string | null {
  const tees = course.tees ?? [];
  const rated = tees.filter((t) => teeRatingFor(t, gender));
  const remembered = last?.[course.id];
  if (remembered && rated.some((t) => t.id === remembered.teeId)) return remembered.teeId;
  return rated[0]?.id ?? null;
}

export function readLastTees(): LastTeeMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAST_TEE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as LastTeeMap) : {};
  } catch {
    return {};
  }
}

export function writeLastTee(courseId: string, teeId: string, gender: TeeGender): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readLastTees(), [courseId]: { teeId, gender } };
    window.localStorage.setItem(LAST_TEE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function formatTeeLabel(t: RoundTee): string {
  return `${t.name} · ${t.gender === "women" ? "Women's" : "Men's"} ${t.rating.toFixed(1)}/${t.slope}`;
}
