import type { ActiveRound, Course, HoleScore } from "@/lib/types";
import { getHolesInPlay } from "@/lib/calculations";

/** Clamp stroke entry to a sensible on-course range. */
export function clampStrokeScore(score: number): number {
  return Math.max(1, Math.min(15, score));
}

/** Upsert a hole score for one player inside an ActiveRound. */
export function withUpdatedHoleScore(
  round: ActiveRound,
  playerId: string,
  holeNumber: number,
  newScore: number
): ActiveRound {
  const playerScores = [...(round.scores[playerId] || [])];
  const existingIndex = playerScores.findIndex((s) => s.holeNumber === holeNumber);
  const clampedScore = clampStrokeScore(newScore);

  if (existingIndex >= 0) {
    playerScores[existingIndex] = { holeNumber, score: clampedScore };
  } else {
    playerScores.push({ holeNumber, score: clampedScore });
  }

  playerScores.sort((a, b) => a.holeNumber - b.holeNumber);

  return {
    ...round,
    scores: {
      ...round.scores,
      [playerId]: playerScores,
    },
  };
}

export function getPlayerScoreOnHole(
  round: ActiveRound,
  playerId: string,
  holeNumber: number
): number | null {
  return round.scores[playerId]?.find((s) => s.holeNumber === holeNumber)?.score ?? null;
}

export function getActiveTotalForPlayer(
  round: ActiveRound,
  course: Course,
  playerId: string
): number {
  const holesInPlay = new Set(getHolesInPlay(course, round));
  return (round.scores[playerId] || [])
    .filter((s) => holesInPlay.has(s.holeNumber))
    .reduce((sum, s) => sum + s.score, 0);
}

export function getActiveVsParForPlayer(
  round: ActiveRound,
  course: Course,
  playerId: string
): number {
  const holesInPlay = new Set(getHolesInPlay(course, round));
  return (round.scores[playerId] || [])
    .filter((s) => holesInPlay.has(s.holeNumber))
    .reduce((diff, s) => {
      const hole = course.holes.find((h) => h.number === s.holeNumber);
      return diff + (s.score - (hole?.par ?? 4));
    }, 0);
}

export function isActiveRoundFullyScored(round: ActiveRound, course: Course): boolean {
  const holesInPlay = getHolesInPlay(course, round);
  return round.playerIds.every((pid) => {
    const playerScores = round.scores[pid] || [];
    return holesInPlay.every((holeNumber) =>
      playerScores.some((s) => s.holeNumber === holeNumber)
    );
  });
}
