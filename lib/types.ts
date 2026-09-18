// Core domain types for OG Golf

export interface Hole {
  number: number;
  par: number;
}

export interface Course {
  id: string;
  name: string;
  location: string;
  holes: Hole[]; // Array of pars per hole. Length determines total holes.
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  /** Current OG index shown in UI (starting until ≥1 qualifying round, then calculated). */
  handicap: number;
  /** Stored starting/fallback HCP; used when player has no qualifying completed rounds. */
  startingHandicap?: number;
  updatedAt: string;
}

export interface HoleScore {
  holeNumber: number;
  score: number; // Actual strokes taken
}

export interface PlayerRoundScore {
  playerId: string;
  scores: HoleScore[]; // One entry per hole played
}

export type NineSide = "front" | "back";
export type RoundLength = 9 | 18;

export interface RoundConfig {
  roundLength: RoundLength;
  nineSide: NineSide;
  startingHole: 1 | 10;
}

export interface Round {
  id: string;
  courseId: string;
  date: string; // ISO string
  playerScores: PlayerRoundScore[];
  completed: boolean; // User can mark round as finished
  createdAt: string;
  roundLength?: RoundLength;
  nineSide?: NineSide;
  startingHole?: 1 | 10;
}

// Helper type for the live round in progress (not yet saved)
export interface ActiveRound {
  id: string; // Stable Round id for upserting incomplete drafts in golf_rounds
  courseId: string;
  playerIds: string[];
  scores: Record<string, HoleScore[]>; // playerId -> scores
  /** In-progress mid-hole tap counts. Not a committed HoleScore until hole-out. */
  liveStrokes?: Record<string, Record<number, number>>; // playerId -> holeNumber -> count (0+)
  startTime: string;
  roundLength: RoundLength;
  nineSide: NineSide;
  startingHole: 1 | 10;
}

// For past round display + calculations
export interface RoundSummary {
  round: Round;
  course: Course;
  playerResults: Array<{
    player: Player;
    totalScore: number;
    scoreVsPar: number;
    holesPlayed: number;
  }>;
}
