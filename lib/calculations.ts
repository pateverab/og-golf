import {
  Course,
  Hole,
  Player,
  Round,
  PlayerRoundScore,
  HoleScore,
  RoundConfig,
  NineSide,
  RoundLength,
  ActiveRound,
} from "./types";
// Re-export types and everything else needed by other files
export type {
  Course,
  Hole,
  Player,
  Round,
  PlayerRoundScore,
  HoleScore,
  RoundConfig,
  NineSide,
  RoundLength,
  ActiveRound,
} from "./types";
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

export function is18HoleCourse(course: Course): boolean {
  return course.holes.length >= 18 || course.holes.some((h) => h.number >= 10);
}

export function getDefaultRoundConfig(course: Course): RoundConfig {
  return {
    roundLength: is18HoleCourse(course) ? 18 : 9,
    nineSide: "front",
    startingHole: 1,
  };
}

export function normalizeRoundConfig(
  course: Course,
  config?: Partial<RoundConfig>
): RoundConfig {
  const defaults = getDefaultRoundConfig(course);
  const roundLength = config?.roundLength ?? defaults.roundLength;
  const nineSide = config?.nineSide ?? defaults.nineSide;
  const startingHole = config?.startingHole ?? defaults.startingHole;

  if (!is18HoleCourse(course)) {
    return { roundLength: 9, nineSide: "front", startingHole: 1 };
  }

  if (roundLength === 9) {
    return {
      roundLength: 9,
      nineSide,
      startingHole: nineSide === "back" ? 10 : 1,
    };
  }

  return { roundLength: 18, nineSide, startingHole };
}

export function getHolesInPlay(course: Course, config?: Partial<RoundConfig>): number[] {
  const normalized = normalizeRoundConfig(course, config);
  const holeNumbers = course.holes.map((h) => h.number).sort((a, b) => a - b);

  if (normalized.roundLength === 9) {
    if (!is18HoleCourse(course)) {
      return holeNumbers;
    }
    return normalized.nineSide === "back"
      ? holeNumbers.filter((n) => n >= 10)
      : holeNumbers.filter((n) => n <= 9);
  }

  if (!is18HoleCourse(course)) {
    return holeNumbers;
  }

  if (normalized.startingHole === 10) {
    const back = holeNumbers.filter((n) => n >= 10);
    const front = holeNumbers.filter((n) => n <= 9);
    return [...back, ...front];
  }

  return holeNumbers;
}

export function getRoundFormatLabel(course: Course, config?: Partial<RoundConfig>): string {
  const normalized = normalizeRoundConfig(course, config);

  if (normalized.roundLength === 9) {
    if (!is18HoleCourse(course)) {
      return "9 Holes";
    }
    return normalized.nineSide === "back" ? "Back 9" : "Front 9";
  }

  if (normalized.startingHole === 10) {
    return "18 Holes • Start Hole 10";
  }

  return "18 Holes";
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
  holeCount: 18,
  suggestedPars: [4, 4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5]
},
  { 
    name: "Arrayanes Golf Course", 
    location: "Quito, Ecuador", 
    holeCount: 18,
    suggestedPars: [4, 4, 5, 3, 4, 5, 3, 4, 4, 4, 3, 5, 4, 3, 5, 4, 3, 4] 
  },
  
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

export interface HandicapHistoryPoint {
  date: string;
  handicap: number;
  label: string;
}

export interface PlayerRoundResult {
  roundId: string;
  date: string;
  courseName: string;
  totalScore: number;
  scoreVsPar: number;
}

export interface PlayerStats {
  totalRounds: number;
  averageScore: number;
  bestRound: PlayerRoundResult | null;
  worstRound: PlayerRoundResult | null;
  handicapHistory: HandicapHistoryPoint[];
}

export function getPlayerCompletedRounds(
  playerId: string,
  completedRounds: Round[]
): Round[] {
  return completedRounds
    .filter(
      (round) =>
        round.completed &&
        round.playerScores.some(
          (ps) => ps.playerId === playerId && ps.scores.length > 0
        )
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getHandicapHistoryForPlayer(
  playerId: string,
  completedRounds: Round[],
  courses: Course[],
  currentHandicap?: number
): HandicapHistoryPoint[] {
  const playerRounds = getPlayerCompletedRounds(playerId, completedRounds);

  if (playerRounds.length === 0) {
    if (currentHandicap === undefined) return [];
    return [
      {
        date: new Date().toISOString(),
        handicap: currentHandicap,
        label: "Now",
      },
    ];
  }

  return playerRounds.map((round, index) => {
    const roundsUpToNow = playerRounds.slice(0, index + 1);
    const handicap = calculateHandicapForPlayer(playerId, roundsUpToNow, courses);
    return {
      date: round.date,
      handicap,
      label: new Date(round.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
  });
}

export function getPlayerStats(
  player: Player,
  completedRounds: Round[],
  courses: Course[]
): PlayerStats {
  const playerRounds = getPlayerCompletedRounds(player.id, completedRounds);
  const roundResults: PlayerRoundResult[] = [];

  for (const round of playerRounds) {
    const course = courses.find((c) => c.id === round.courseId);
    if (!course) continue;

    const playerScore = round.playerScores.find((ps) => ps.playerId === player.id);
    if (!playerScore || playerScore.scores.length === 0) continue;

    roundResults.push({
      roundId: round.id,
      date: round.date,
      courseName: course.name,
      totalScore: getTotalScoreForPlayerInRound(playerScore, course),
      scoreVsPar: getScoreVsParForPlayerInRound(playerScore, course),
    });
  }

  const totalRounds = roundResults.length;
  const averageScore =
    totalRounds > 0
      ? Math.round(
          (roundResults.reduce((sum, r) => sum + r.totalScore, 0) / totalRounds) * 10
        ) / 10
      : 0;

  const bestRound =
    roundResults.length > 0
      ? roundResults.reduce((best, r) => (r.totalScore < best.totalScore ? r : best))
      : null;

  const worstRound =
    roundResults.length > 0
      ? roundResults.reduce((worst, r) => (r.totalScore > worst.totalScore ? r : worst))
      : null;

  return {
    totalRounds,
    averageScore,
    bestRound,
    worstRound,
    handicapHistory: getHandicapHistoryForPlayer(
      player.id,
      completedRounds,
      courses,
      player.handicap
    ),
  };
}

export function getPlayerHoleBreakdown(
  playerScore: PlayerRoundScore,
  course: Course,
  config?: Partial<RoundConfig>
): HoleBreakdown[] {
  const holesInPlay = new Set(getHolesInPlay(course, config));

  return course.holes
    .filter((hole) => holesInPlay.has(hole.number))
    .map((hole) => {
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
