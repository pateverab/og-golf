// Core domain types for OG Golf

export interface Hole {
  number: number;
  par: number;
  /** WHS stroke index (handicap allocation order), 1 = hardest. Unique per course. Optional on legacy courses. */
  strokeIndex?: number;
}

/** Whose rating/slope applies on a tee. */
export type TeeGender = "men" | "women";

/** Course rating + slope for one gender on one tee (18 holes). */
export interface TeeRating {
  rating: number;
  slope: number;
}

/** A set of tees on a course. Each gender's rating is optional. */
export interface Tee {
  id: string;
  name: string;
  /** CSS color for the tee marker, e.g. "#1e4fd8". */
  color: string;
  par: number;
  men?: TeeRating;
  women?: TeeRating;
}

/**
 * The tee a round was played from, snapshotted at round start so later
 * course/tee edits never rewrite history.
 */
export interface RoundTee {
  teeId: string;
  name: string;
  color: string;
  gender: TeeGender;
  rating: number;
  slope: number;
  par: number;
}

export interface Course {
  id: string;
  name: string;
  location: string;
  holes: Hole[]; // Array of pars per hole. Length determines total holes.
  createdAt: string;
  /** Tees with rating/slope (WHS). Absent on legacy courses. */
  tees?: Tee[];
}

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  /** Current OG index shown in UI (starting until ≥1 qualifying round, then calculated). */
  handicap: number;
  /** Stored starting/fallback HCP; used when player has no qualifying completed rounds. */
  startingHandicap?: number;
  /** OG index from the legacy formula (avg vs-par, starting value until 1 round). Kept for comparison. */
  legacyOgIndex?: number;
  /** WHS Handicap Index from tee'd rounds; absent with fewer than 3 differentials. */
  whsIndex?: number;
  /** Which value `handicap` currently shows. */
  indexSource?: "whs" | "legacy";
  /** Which tee ratings apply by default (men's when absent). */
  gender?: TeeGender;
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
  /** Tee played (snapshot). Absent = legacy round. */
  tee?: RoundTee;
}

// Helper type for the live round in progress (not yet saved)
/** Optional starting zone for a live swing (not stored on HoleScore). */
export type Lie = "tee" | "fairway" | "rough" | "bunker" | "green" | "other";

/** One mid-hole swing / penalty recorded while the live clicker is active. */
export interface ShotLog {
  holeNumber: number;
  stroke: number;
  lie?: Lie;
  penalty?: boolean;
}

export interface ActiveRound {
  id: string; // Stable Round id for upserting incomplete drafts in golf_rounds
  courseId: string;
  playerIds: string[];
  scores: Record<string, HoleScore[]>; // playerId -> scores
  /** In-progress mid-hole tap counts. Not a committed HoleScore until hole-out. */
  liveStrokes?: Record<string, Record<number, number>>; // playerId -> holeNumber -> count (0+)
  /** Optional per-shot lie / penalty log. Never required for Hole Out. */
  shotLog?: Record<string, ShotLog[]>; // playerId -> shots
  startTime: string;
  roundLength: RoundLength;
  nineSide: NineSide;
  startingHole: 1 | 10;
  /** Tee played (snapshot taken at round start). Absent = legacy round. */
  tee?: RoundTee;
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
