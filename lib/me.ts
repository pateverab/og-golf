import type { ActiveRound, Course, HoleScore, Player, Round, RoundConfig } from "@/lib/types";
import { getHolesInPlay, normalizeRoundConfig } from "@/lib/calculations";

/** localStorage key holding the id of the player who is "Me". */
export const ME_STORAGE_KEY = "og-golf-me-player-id";

/** Name used to recognise the owner's existing player on first run. */
export const OWNER_FIRST_NAME = "Patricio";

const firstName = (name: string) => name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

/** Rounds (any state) in which this player has at least one hole score. */
export function countRoundsForPlayer(playerId: string, rounds: Round[]): number {
  return rounds.filter((r) => r.playerScores.some((ps) => ps.playerId === playerId && ps.scores.length > 0)).length;
}

/**
 * Who is "Me"? Resolved once and then remembered:
 *  1. the stored id, if that player still exists;
 *  2. otherwise a player whose first name (or nickname) is "Patricio"
 *     (the owner); if several match, the one with the most rounds;
 *  3. otherwise the player with the most rounds;
 *  4. otherwise the first player;
 *  5. no players → null (first-run Me setup).
 * Ties keep the existing players[] order, so the result is deterministic.
 */
export function resolveMePlayerId(
  players: Player[],
  rounds: Round[],
  storedId: string | null | undefined,
  ownerFirstName: string = OWNER_FIRST_NAME
): string | null {
  if (players.length === 0) return null;
  if (storedId && players.some((p) => p.id === storedId)) return storedId;

  const byMostRounds = (list: Player[]) =>
    list.reduce((best, p) =>
      countRoundsForPlayer(p.id, rounds) > countRoundsForPlayer(best.id, rounds) ? p : best
    );

  const owner = ownerFirstName.toLowerCase();
  const named = players.filter(
    (p) => firstName(p.name) === owner || (p.nickname ? firstName(p.nickname) === owner : false)
  );
  if (named.length > 0) return byMostRounds(named).id;

  return byMostRounds(players).id;
}

/**
 * Whose clicker / Total / Card column the hole screen shows for a round:
 * Me when Me played in it, otherwise the round's first player (an old
 * multiplayer round saved before single-player mode, without Me in it).
 */
export function focusPlayerIdForRound(
  round: Pick<ActiveRound, "playerIds">,
  meId: string | null | undefined
): string | null {
  if (meId && round.playerIds.includes(meId)) return meId;
  return round.playerIds[0] ?? null;
}

/** Same as focusPlayerIdForRound, for a saved Round (history). Null when Me didn't play. */
export function mePlayerScoreInRound(round: Round, meId: string | null | undefined) {
  if (!meId) return null;
  return round.playerScores.find((ps) => ps.playerId === meId) ?? null;
}

/** A display/export copy of a saved round holding only Me's scores. Data is not modified. */
export function roundFocusedOnPlayer(round: Round, playerId: string | null | undefined): Round {
  if (!playerId) return round;
  const mine = round.playerScores.filter((ps) => ps.playerId === playerId);
  return mine.length > 0 ? { ...round, playerScores: mine } : round;
}

/** Players whose hole-out must happen before the hole auto-advances / the round can finish. */
export function requiredPlayerIds(
  round: Pick<ActiveRound, "playerIds">,
  meId: string | null | undefined,
  multiplayer: boolean
): string[] {
  if (multiplayer) return round.playerIds;
  const focus = focusPlayerIdForRound(round, meId);
  return focus ? [focus] : [];
}

/** True when every required player has a score on every hole in play. */
export function isRoundFullyScoredFor(round: ActiveRound, course: Course, playerIds: string[]): boolean {
  const holes = getHolesInPlay(course, round);
  return (
    playerIds.length > 0 &&
    playerIds.every((pid) => holes.every((h) => (round.scores[pid] || []).some((s) => s.holeNumber === h)))
  );
}

/** A new single-player ActiveRound for Me (no player picker). */
export function createSinglePlayerRound(
  course: Course,
  meId: string,
  config: Partial<RoundConfig>,
  opts: { id: string; now?: Date }
): { round: ActiveRound; firstHole: number } {
  const roundConfig = normalizeRoundConfig(course, config);
  const scores: Record<string, HoleScore[]> = { [meId]: [] };
  const round: ActiveRound = {
    id: opts.id,
    courseId: course.id,
    playerIds: [meId],
    scores,
    startTime: (opts.now ?? new Date()).toISOString(),
    roundLength: roundConfig.roundLength,
    nineSide: roundConfig.nineSide,
    startingHole: roundConfig.startingHole,
  };
  const holes = getHolesInPlay(course, round);
  return { round, firstHole: holes[0] ?? 1 };
}

// ---- storage (no-ops on the server / blocked storage) ----
export function readStoredMeId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredMeId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ME_STORAGE_KEY, id);
    else window.localStorage.removeItem(ME_STORAGE_KEY);
  } catch {
    // ignore
  }
}
