import { Course, Player, Round } from "./types";

const STORAGE_KEYS = {
  COURSES: "golf_courses",
  PLAYERS: "golf_players",
  ROUNDS: "golf_rounds",
} as const;

// Safe localStorage helpers with proper error handling and typing

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    return parsed as T;
  } catch (error) {
    console.warn(`Failed to read localStorage key "${key}":`, error);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to write localStorage key "${key}":`, error);
    return false;
  }
}

// Courses
export function getCourses(): Course[] {
  return safeGet<Course[]>(STORAGE_KEYS.COURSES, []);
}

export function saveCourses(courses: Course[]): boolean {
  return safeSet(STORAGE_KEYS.COURSES, courses);
}

// Players
export function getPlayers(): Player[] {
  return safeGet<Player[]>(STORAGE_KEYS.PLAYERS, []);
}

export function savePlayers(players: Player[]): boolean {
  return safeSet(STORAGE_KEYS.PLAYERS, players);
}

// Rounds
export function getRounds(): Round[] {
  return safeGet<Round[]>(STORAGE_KEYS.ROUNDS, []);
}

export function saveRounds(rounds: Round[]): boolean {
  return safeSet(STORAGE_KEYS.ROUNDS, rounds);
}

// Clear all data (useful for testing / reset)
export function clearAllData(): void {
  if (typeof window === "undefined") return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  });
}
