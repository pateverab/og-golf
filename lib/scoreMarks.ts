/** Official golf scorecard mark from strokes vs par (score - par). */
export type ScoreMarkKind =
  | "albatross"
  | "eagle"
  | "birdie"
  | "par"
  | "bogey"
  | "double"
  | "none";

/**
 * Map vs-par to TV/scorecard mark kind.
 * Null / unscored → "none". Par (0) is plain — no shape.
 */
export function scoreMark(vsPar: number | null | undefined): ScoreMarkKind {
  if (vsPar === null || vsPar === undefined || Number.isNaN(vsPar)) {
    return "none";
  }
  if (vsPar <= -3) return "albatross";
  if (vsPar === -2) return "eagle";
  if (vsPar === -1) return "birdie";
  if (vsPar === 0) return "par";
  if (vsPar === 1) return "bogey";
  // +2 and +3+ → double square (TV convention)
  return "double";
}

export function isCircleMark(kind: ScoreMarkKind): boolean {
  return kind === "birdie" || kind === "eagle" || kind === "albatross";
}

export function isSquareMark(kind: ScoreMarkKind): boolean {
  return kind === "bogey" || kind === "double";
}

/** Concentric ring count for shapes (0 = plain / none). */
export function markRingCount(kind: ScoreMarkKind): number {
  switch (kind) {
    case "birdie":
    case "bogey":
      return 1;
    case "eagle":
    case "double":
      return 2;
    case "albatross":
      return 3;
    default:
      return 0;
  }
}

export const SCORE_MARK_LEGEND =
  "○ birdie   ○○ eagle   □ bogey   □□ double";
