/**
 * World Handicap System (WHS) maths for OG Golf. Pure functions, no storage.
 *
 * Implemented (Rules of Handicapping, 2024 edition):
 * - Course Handicap = Index × Slope/113 + (Course Rating − Par), rounded (.5 up).
 * - Net Double Bogey (Rule 3.1) = par + 2 + strokes received, strokes allocated by
 *   stroke index (plus handicaps give strokes back from SI 18 down; >18 wraps).
 *   No Handicap Index yet (fewer than 3 scores) → max hole score par + 5.
 * - Score Differential (Rule 5.1) = 113/Slope × (Adjusted Gross − Rating − PCC), PCC = 0, 1 dp.
 * - Index (Rule 5.2) = most recent 20 differentials, the 3–19 table incl. −2.0 / −1.0 / −1.0 adjustments.
 * - Caps (Rule 5.8): Low Index = lowest Index in the 365 days before the latest score;
 *   soft cap halves the rise above +3.0, hard cap at +5.0. Like WHS, caps start once the
 *   player has 20 scores (a Low Index needs a full record).
 * - Max Index 54.0.
 * - 9 holes (Rule 5.1b, 2024): with an Index, 18-hole differential = 9-hole differential
 *   (unrounded) + expected 9-hole differential, rounded to 0.1 with .5 up. The expected
 *   value (Index × 0.52) + 1.2 is not printed in the Rules; it reproduces the USGA's own
 *   worked example (Index 14.0, 9-hole differential 7.2 → 18-hole 15.7):
 *   https://www.usga.org/content/usga/home-page/handicapping/world-handicap-system/2024-revision/2024-treatment-of-9-hole-scores-FAQ.html
 *   Rule text: https://www.usga.org/handicapping/roh/Content/rules/5%201b%20Calculation%20of%20a%20Score%20Differential9Hole.htm Without an Index,
 *   two 9-hole scores are combined in date order. 9-hole rating = half the 18-hole rating
 *   and the same slope (no 9-hole ratings exist yet).
 *
 * Not implemented (not needed for a personal app): PCC (always 0), exceptional score
 * reduction, committee adjustments, Index at the start of day vs. per round (we update after
 * every round).
 */
import type { Course, Round, RoundTee } from "./types";
import { getHolesInPlay } from "./calculations";

export const WHS_MAX_INDEX = 54.0;
export const WHS_MIN_SCORES = 3;
export const WHS_RECORD_SIZE = 20;
export const SOFT_CAP_THRESHOLD = 3.0;
export const HARD_CAP = 5.0;
export const NO_INDEX_MAX_OVER_PAR = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Round to 1 decimal, .05 away from zero, tolerant of float noise (e.g. 0.15). */
export function round1(x: number): number {
  const s = Math.sign(x);
  return (s * Math.round(Math.abs(x) * 10 + 1e-9)) / 10;
}

/** Whole-number rounding with .5 rounded up (WHS: −2.5 → −2, 12.5 → 13). */
function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

// ==================== Course handicap ====================

export function courseHandicap(index: number, slope: number, rating: number, par: number): number {
  return roundHalfUp((index * slope) / 113 + (rating - par));
}

/** 9-hole course handicap: half the Index, with the 9-hole rating and par. */
export function nineHoleCourseHandicap(index: number, slope: number, rating9: number, par9: number): number {
  return roundHalfUp(((index / 2) * slope) / 113 + (rating9 - par9));
}

// ==================== Stroke allocation / Net Double Bogey ====================

/**
 * Strokes received on each hole for a course handicap, given each hole's
 * allocation rank (1 = hardest … n). n is 18 for an 18-hole round, 9 for a nine.
 * Positive: every hole gets floor(ch/n), the (ch mod n) hardest get one more.
 * Plus (negative): strokes are given back starting from the easiest hole.
 */
export function strokesReceived(ch: number, ranks: number[]): number[] {
  const n = ranks.length;
  if (n === 0) return [];
  const abs = Math.abs(ch);
  const base = Math.floor(abs / n);
  const rem = abs % n;
  if (ch >= 0) return ranks.map((r) => base + (r <= rem ? 1 : 0));
  return ranks.map((r) => 0 - (base + (r > n - rem ? 1 : 0)));
}

/**
 * Allocation rank (1..n) for the holes played: their stroke indexes ranked
 * among themselves (so a nine uses 1–9). Holes without a stroke index fall
 * back to hole order after the ones that have one.
 */
export function allocationRanks(strokeIndexes: Array<number | undefined>): number[] {
  const order = strokeIndexes
    .map((si, i) => ({ i, key: si ?? 100 + i }))
    .sort((a, b) => a.key - b.key);
  const ranks = new Array<number>(strokeIndexes.length);
  order.forEach((o, rank) => (ranks[o.i] = rank + 1));
  return ranks;
}

export function netDoubleBogey(par: number, strokes: number): number {
  return par + 2 + strokes;
}

export interface PlayedHole {
  par: number;
  score: number;
  strokeIndex?: number;
}

/**
 * Adjusted Gross Score: each hole capped at Net Double Bogey (with an Index)
 * or par + 5 (no Index yet).
 */
export function adjustedGrossScore(holes: PlayedHole[], ch: number | null): number {
  if (ch === null) {
    return holes.reduce((s, h) => s + Math.min(h.score, h.par + NO_INDEX_MAX_OVER_PAR), 0);
  }
  const strokes = strokesReceived(ch, allocationRanks(holes.map((h) => h.strokeIndex)));
  return holes.reduce((s, h, i) => s + Math.min(h.score, netDoubleBogey(h.par, strokes[i])), 0);
}

// ==================== Differential ====================

export function scoreDifferential(ags: number, rating: number, slope: number, pcc = 0): number {
  return round1((113 / slope) * (ags - rating - pcc));
}

/** Expected 9-hole Score Differential for an Index (USGA 2024: Index × 0.52 + 1.2). */
export function expectedNineHoleDifferential(index: number): number {
  return index * 0.52 + 1.2;
}

// ==================== Index ====================

/** Rule 5.2a table: [how many lowest to average, adjustment]. */
export function differentialsToUse(count: number): { use: number; adjustment: number } | null {
  if (count < 3) return null;
  if (count === 3) return { use: 1, adjustment: -2.0 };
  if (count === 4) return { use: 1, adjustment: -1.0 };
  if (count === 5) return { use: 1, adjustment: 0 };
  if (count === 6) return { use: 2, adjustment: -1.0 };
  if (count <= 8) return { use: 2, adjustment: 0 };
  if (count <= 11) return { use: 3, adjustment: 0 };
  if (count <= 14) return { use: 4, adjustment: 0 };
  if (count <= 16) return { use: 5, adjustment: 0 };
  if (count <= 18) return { use: 6, adjustment: 0 };
  if (count === 19) return { use: 7, adjustment: 0 };
  return { use: 8, adjustment: 0 };
}

/** Index from differentials in date order (oldest first); uses the most recent 20. Uncapped. */
export function indexFromDifferentials(diffsOldestFirst: number[]): number | null {
  const recent = diffsOldestFirst.slice(-WHS_RECORD_SIZE);
  const rule = differentialsToUse(recent.length);
  if (!rule) return null;
  const lowest = [...recent].sort((a, b) => a - b).slice(0, rule.use);
  const avg = lowest.reduce((a, b) => a + b, 0) / lowest.length;
  return Math.min(WHS_MAX_INDEX, round1(avg + rule.adjustment));
}

/** Soft cap (50% of the rise above +3.0) then hard cap (+5.0) against the Low Index. */
export function applyCaps(index: number, lowIndex: number | null): number {
  if (lowIndex === null) return index;
  const rise = index - lowIndex;
  let capped = index;
  if (rise > SOFT_CAP_THRESHOLD) capped = lowIndex + SOFT_CAP_THRESHOLD + (rise - SOFT_CAP_THRESHOLD) / 2;
  capped = Math.min(capped, lowIndex + HARD_CAP);
  return Math.min(WHS_MAX_INDEX, round1(capped));
}

// ==================== Score record for a player ====================

export interface ScoreRecord {
  /** Round id(s) behind this differential (two for a combined 9+9). */
  roundIds: string[];
  date: string;
  holes: 9 | 18;
  /** How it was made: an 18-hole round, a nine + expected score, or two nines combined. */
  method: "18" | "9+expected" | "9+9";
  adjustedGross: number;
  differential: number;
  /** Course handicap used for Net Double Bogey (null = par + 5, no Index yet). */
  courseHandicap: number | null;
  /** Index after this score. */
  indexAfter: number | null;
  /** Index before caps (equal to indexAfter when no cap applied). */
  uncappedIndexAfter: number | null;
  /** Which cap limited indexAfter, if any. */
  capApplied: "soft" | "hard" | null;
  /** Low Index used for the caps at this score. */
  lowIndexAt: number | null;
  /** Index the player had before this round (null = none yet). */
  indexBefore: number | null;
}

export interface WhsResult {
  /** Current WHS Index, or null with fewer than 3 differentials. */
  index: number | null;
  lowIndex: number | null;
  records: ScoreRecord[];
  /** Tee'd rounds not counted yet (e.g. a single 9 waiting for a partner). */
  pendingRoundIds: string[];
}

interface Eligible {
  round: Round;
  tee: RoundTee;
  holes: PlayedHole[];
  nine: boolean;
}

/** A completed, tee'd round where the player scored every hole in play. Legacy rounds (no tee) return null. */
function eligibleRound(round: Round, course: Course | undefined, playerId: string): Eligible | null {
  if (!round.completed || !round.tee || !course) return null;
  const ps = round.playerScores.find((p) => p.playerId === playerId);
  if (!ps) return null;
  const inPlay = getHolesInPlay(course, round);
  if (inPlay.length === 0) return null;
  const holes: PlayedHole[] = [];
  for (const n of inPlay) {
    const s = ps.scores.find((x) => x.holeNumber === n);
    const h = course.holes.find((x) => x.number === n);
    if (!s || !h) return null;
    holes.push({ par: h.par, score: s.score, strokeIndex: h.strokeIndex });
  }
  return { round, tee: round.tee, holes, nine: inPlay.length <= 9 };
}

const byDate = (a: Round, b: Round) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

/**
 * Builds the player's score record in date order: each round is adjusted with the
 * Index the player had before it, then the Index (with caps) is recomputed.
 */
export function computeWhsForPlayer(playerId: string, rounds: Round[], courses: Course[]): WhsResult {
  const eligible = [...rounds]
    .sort(byDate)
    .map((r) => eligibleRound(r, courses.find((c) => c.id === r.courseId), playerId))
    .filter((e): e is Eligible => e !== null);

  const records: ScoreRecord[] = [];
  const history: Array<{ date: string; index: number }> = [];
  const st: { current: number | null } = { current: null };
  let pendingNine: { e: Eligible; ags: number } | null = null;

  const push = (rec: Omit<ScoreRecord, "indexAfter" | "uncappedIndexAfter" | "capApplied" | "lowIndexAt" | "indexBefore">) => {
    const diffs = [...records.map((r) => r.differential), rec.differential];
    const uncapped = indexFromDifferentials(diffs);
    let idx = uncapped;
    let low: number | null = null;
    let capApplied: ScoreRecord["capApplied"] = null;
    if (idx !== null && diffs.length >= WHS_RECORD_SIZE) {
      const t = new Date(rec.date).getTime();
      const window = history.filter((h) => t - new Date(h.date).getTime() <= 365 * DAY_MS);
      low = window.length > 0 ? Math.min(...window.map((h) => h.index)) : null;
      idx = applyCaps(idx, low);
      if (low !== null && uncapped !== null && idx < uncapped) {
        capApplied = uncapped - low > SOFT_CAP_THRESHOLD + 2 * (HARD_CAP - SOFT_CAP_THRESHOLD) ? "hard" : "soft";
      }
    }
    records.push({ ...rec, indexAfter: idx, uncappedIndexAfter: uncapped, capApplied, lowIndexAt: low, indexBefore: st.current });
    if (idx !== null) history.push({ date: rec.date, index: idx });
    st.current = idx;
  };

  for (const e of eligible) {
    const { tee, holes } = e;
    const par = holes.reduce((s, h) => s + h.par, 0);
    if (!e.nine) {
      const ch = st.current === null ? null : courseHandicap(st.current, tee.slope, tee.rating, tee.par);
      const ags = adjustedGrossScore(holes, ch);
      push({ roundIds: [e.round.id], date: e.round.date, holes: 18, method: "18", adjustedGross: ags, differential: scoreDifferential(ags, tee.rating, tee.slope), courseHandicap: ch });
      continue;
    }
    const rating9 = tee.rating / 2;
    if (st.current !== null) {
      const ch = nineHoleCourseHandicap(st.current, tee.slope, rating9, par);
      const ags = adjustedGrossScore(holes, ch);
      const nineDiff = (113 / tee.slope) * (ags - rating9);
      const diff = round1(nineDiff + expectedNineHoleDifferential(st.current));
      push({ roundIds: [e.round.id], date: e.round.date, holes: 9, method: "9+expected", adjustedGross: ags, differential: diff, courseHandicap: ch });
      continue;
    }
    const ags = adjustedGrossScore(holes, null);
    if (!pendingNine) {
      pendingNine = { e, ags };
      continue;
    }
    // Two nines combined (Rule 5.1b without an Index): ratings added, slopes averaged.
    const a = pendingNine;
    pendingNine = null;
    const rating = a.e.tee.rating / 2 + rating9;
    const slope = roundHalfUp((a.e.tee.slope + tee.slope) / 2);
    const total = a.ags + ags;
    push({ roundIds: [a.e.round.id, e.round.id], date: e.round.date, holes: 18, method: "9+9", adjustedGross: total, differential: scoreDifferential(total, rating, slope), courseHandicap: null });
  }

  let lowIndex: number | null = null;
  if (records.length >= WHS_RECORD_SIZE && records.length > 0) {
    const t = new Date(records[records.length - 1].date).getTime();
    const w = history.filter((h) => t - new Date(h.date).getTime() <= 365 * DAY_MS);
    lowIndex = w.length ? Math.min(...w.map((h) => h.index)) : null;
  }
  return { index: st.current, lowIndex, records, pendingRoundIds: pendingNine ? [pendingNine.e.round.id] : [] };
}

// ==================== Display helpers ====================

/** The most recent 20 records (oldest first) and which of them count toward the Index. */
export function countingRecords(records: ScoreRecord[]): { recent: ScoreRecord[]; counting: Set<ScoreRecord>; use: number; adjustment: number } {
  const recent = records.slice(-WHS_RECORD_SIZE);
  const rule = differentialsToUse(recent.length);
  if (!rule) return { recent, counting: new Set(), use: 0, adjustment: 0 };
  // Lowest first; ties go to the more recent score.
  const sorted = recent
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.differential - b.r.differential || b.i - a.i)
    .slice(0, rule.use);
  return { recent, counting: new Set(sorted.map((x) => x.r)), use: rule.use, adjustment: rule.adjustment };
}

/** The player's WHS Index from rounds strictly before a moment (null = none yet). */
export function whsIndexBefore(playerId: string, rounds: Round[], courses: Course[], beforeIso: string): number | null {
  return computeWhsForPlayer(playerId, rounds.filter((r) => r.date < beforeIso), courses).index;
}

/**
 * Strokes received on one hole of a tee'd round: the playing index (snapshot at
 * round start) → course handicap on the tee snapshot → allocation by stroke
 * index over the holes in play. Null for legacy / no-tee rounds or no index.
 */
export function strokesOnHole(
  course: Course,
  round: { tee?: RoundTee; roundLength?: Round["roundLength"]; nineSide?: Round["nineSide"]; startingHole?: Round["startingHole"] },
  index: number | null | undefined,
  holeNumber: number
): number | null {
  if (!round.tee || index === null || index === undefined) return null;
  const inPlay = getHolesInPlay(course, round);
  const pos = inPlay.indexOf(holeNumber);
  if (pos < 0) return null;
  const holes = inPlay.map((n) => course.holes.find((h) => h.number === n));
  const nine = inPlay.length <= 9;
  const par = holes.reduce((sum, h) => sum + (h?.par ?? 4), 0);
  const ch = nine
    ? nineHoleCourseHandicap(index, round.tee.slope, round.tee.rating / 2, par)
    : courseHandicap(index, round.tee.slope, round.tee.rating, round.tee.par);
  return strokesReceived(ch, allocationRanks(holes.map((h) => h?.strokeIndex)))[pos];
}

export const OG_INDEX_LABEL = "OG Index (WHS-style, unofficial)";

/** "WHS 12.5 · old 26.4" once WHS is active, else "old 26.4 · WHS after 3 tee'd rounds (1/3)". */
export function indexPairLabel(
  player: { handicap: number; whsIndex?: number; legacyOgIndex?: number },
  whsScores = 0
): string {
  const old = player.legacyOgIndex ?? player.handicap;
  if (player.whsIndex !== undefined) return `WHS ${player.whsIndex.toFixed(1)} · old ${old}`;
  return `old ${old} · WHS after 3 tee'd rounds (${Math.min(whsScores, 3)}/3)`;
}
