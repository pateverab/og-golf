import { Course, Hole, Player, Round, PlayerRoundScore, HoleScore } from "./types";
// Re-export types and everything else needed by other files
export type { Course, Hole, Player, Round, PlayerRoundScore, HoleScore } from "./types";
// Simple, transparent handicap calculation
// Formula used: average of (total score - total par) over all completed rounds for that player
// Rounded to 1 decimal place. Can be negative for good players.
// This is intentionally a simplified version (no course rating/slope) as requested for v1.

export function calculateHandicapForPlayer(
  playerId: string,
  completedRounds: Round[],
  courses: Course[]
): number {
  const playerRounds = completedRounds.filter((round) =>
    round.playerScores.some((ps) => ps.playerId === playerId) && round.completed
  );

  if (playerRounds.length === 0) {
    return 0; // New players start at 0
  }

  const differentials: number[] = [];

  for (const round of playerRounds) {
    const course = courses.find((c) => c.id === round.courseId);
    if (!course) continue;

    const playerScoreData = round.playerScores.find((ps) => ps.playerId === playerId);
    if (!playerScoreData || playerScoreData.scores.length === 0) continue;

    const totalScore = playerScoreData.scores.reduce((sum, s) => sum + s.score, 0);
    const totalPar = playerScoreData.scores.reduce((sum, s) => {
      const hole = course.holes.find((h) => h.number === s.holeNumber);
      return sum + (hole?.par ?? 4);
    }, 0);

    differentials.push(totalScore - totalPar);
  }

  if (differentials.length === 0) return 0;

  const average = differentials.reduce((a, b) => a + b, 0) / differentials.length;
  return Math.round(average * 10) / 10;
}

// Update all players' handicaps based on completed rounds
export function recalculateAllHandicaps(
  players: Player[],
  completedRounds: Round[],
  courses: Course[]
): Player[] {
  return players.map((player) => ({
    ...player,
    handicap: calculateHandicapForPlayer(player.id, completedRounds, courses),
    updatedAt: new Date().toISOString(),
  }));
}

// Score helpers for a single round / player

export function getTotalScoreForPlayerInRound(
  playerScore: PlayerRoundScore,
  course: Course
): number {
  return playerScore.scores.reduce((sum, holeScore) => sum + holeScore.score, 0);
}

export function getScoreVsParForPlayerInRound(
  playerScore: PlayerRoundScore,
  course: Course
): number {
  let totalPar = 0;
  let totalScore = 0;

  for (const hs of playerScore.scores) {
    const hole = course.holes.find((h) => h.number === hs.holeNumber);
    totalPar += hole?.par ?? 4;
    totalScore += hs.score;
  }

  return totalScore - totalPar;
}

export function getHolesPlayed(playerScore: PlayerRoundScore): number {
  return playerScore.scores.length;
}

// Generate default 18-hole pars (all 4s) or 9-hole
export function generateDefaultHoles(holeCount: number = 18): Hole[] {
  const count = holeCount === 9 ? 9 : 18;
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    par: 4,
  }));
}

// Create a suggested course template (manual only for now — real API can be added later)
export interface CourseTemplate {
  name: string;
  location: string;
  holeCount: number;
  suggestedPars?: number[];
}

export const SUGGESTED_COURSE_TEMPLATES: CourseTemplate[] = [
  { 
    name: "Quito Tenis y Golf Club", 
    location: "Quito, Ecuador", 
    holeCount: 18 
  },
  { 
    name: "Arrayanes Golf Course", 
    location: "Quito, Ecuador", 
    holeCount: 18 
  },
  { name: "Pinehurst No. 2", location: "Pinehurst, NC", holeCount: 18 },
  { name: "Pebble Beach", location: "Pebble Beach, CA", holeCount: 18 },
  { name: "Local 9-Hole Municipal", location: "Your Town", holeCount: 9 },
];

// Quick par total helper
export function getCourseTotalPar(course: Course): number {
  return course.holes.reduce((sum, h) => sum + h.par, 0);
}

// Per-hole breakdown for a player's round (for the new detail modal)
export interface HoleBreakdown {
  holeNumber: number;
  score: number | null;
  par: number;
  vsPar: number | null;
}

export function getPlayerHoleBreakdown(
  playerScore: PlayerRoundScore,
  course: Course
): HoleBreakdown[] {
  return course.holes.map((hole) => {
    const scoreEntry = playerScore.scores.find((s) => s.holeNumber === hole.number);
    const score = scoreEntry ? scoreEntry.score : null;
    const vsPar = score !== null ? score - hole.par : null;
    return {
      holeNumber: hole.number,
      score,
      par: hole.par,
      vsPar,
    };
  });
}
