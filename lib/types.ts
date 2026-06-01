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
  handicap: number; // Current calculated handicap (can be negative)
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

export interface Round {
  id: string;
  courseId: string;
  date: string; // ISO string
  playerScores: PlayerRoundScore[];
  completed: boolean; // User can mark round as finished
  createdAt: string;
}

// Helper type for the live round in progress (not yet saved)
export interface ActiveRound {
  courseId: string;
  playerIds: string[];
  scores: Record<string, HoleScore[]>; // playerId -> scores
  startTime: string;
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
