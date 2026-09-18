import type { ActiveRound, Course, HoleScore, Lie, ShotLog } from "@/lib/types";
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

/** Running mid-hole tap count (0+). Does not mark the hole complete. */
export function getLiveStrokes(
  round: ActiveRound,
  playerId: string,
  holeNumber: number
): number {
  return round.liveStrokes?.[playerId]?.[holeNumber] ?? 0;
}

/** Clamp live tap count to 0–15 (0 means not started; hole-out requires ≥1). */
export function clampLiveStrokes(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(15, Math.floor(count)));
}

/** Set / clear a player's live stroke count for one hole without writing HoleScore. */
export function withLiveStrokes(
  round: ActiveRound,
  playerId: string,
  holeNumber: number,
  count: number
): ActiveRound {
  const nextCount = clampLiveStrokes(count);
  const playerMap = { ...(round.liveStrokes?.[playerId] || {}) };

  if (nextCount <= 0) {
    delete playerMap[holeNumber];
  } else {
    playerMap[holeNumber] = nextCount;
  }

  const liveStrokes = { ...(round.liveStrokes || {}) };
  if (Object.keys(playerMap).length === 0) {
    delete liveStrokes[playerId];
  } else {
    liveStrokes[playerId] = playerMap;
  }

  const next: ActiveRound = { ...round };
  if (Object.keys(liveStrokes).length === 0) {
    delete next.liveStrokes;
  } else {
    next.liveStrokes = liveStrokes;
  }
  return next;
}

export function withIncrementLiveStroke(
  round: ActiveRound,
  playerId: string,
  holeNumber: number,
  delta = 1
): ActiveRound {
  const current = getLiveStrokes(round, playerId, holeNumber);
  return withLiveStrokes(round, playerId, holeNumber, current + delta);
}

/**
 * Commit live taps as the hole score, clear live count for that hole.
 * No-op if live count is 0 (never write a premature 1 on tee-off).
 */
export function withHoleOut(
  round: ActiveRound,
  playerId: string,
  holeNumber: number
): ActiveRound {
  const live = getLiveStrokes(round, playerId, holeNumber);
  if (live <= 0) return round;
  const scored = withUpdatedHoleScore(round, playerId, holeNumber, live);
  return withLiveStrokes(scored, playerId, holeNumber, 0);
}

/** After manual score entry, drop any leftover live taps for that hole. */
export function withClearedLiveStrokesForHole(
  round: ActiveRound,
  playerId: string,
  holeNumber: number
): ActiveRound {
  return withLiveStrokes(round, playerId, holeNumber, 0);
}


function withPlayerShotLog(
  round: ActiveRound,
  playerId: string,
  nextLogs: ShotLog[]
): ActiveRound {
  const shotLog = { ...(round.shotLog || {}) };
  if (nextLogs.length === 0) {
    delete shotLog[playerId];
  } else {
    shotLog[playerId] = nextLogs;
  }
  const next: ActiveRound = { ...round };
  if (Object.keys(shotLog).length === 0) {
    delete next.shotLog;
  } else {
    next.shotLog = shotLog;
  }
  return next;
}

export function getShotLogForHole(
  round: ActiveRound,
  playerId: string,
  holeNumber: number
): ShotLog[] {
  return (round.shotLog?.[playerId] || []).filter((s) => s.holeNumber === holeNumber);
}

/**
 * +1 stroke (or penalty). Appends optional lie / penalty to shotLog.
 * Does not write HoleScore.
 */
export function withRecordedLiveStroke(
  round: ActiveRound,
  playerId: string,
  holeNumber: number,
  opts?: { lie?: Lie; penalty?: boolean }
): ActiveRound {
  const current = getLiveStrokes(round, playerId, holeNumber);
  const nextStroke = clampLiveStrokes(current + 1);
  if (nextStroke <= current) {
    // Already at max (15)
    return round;
  }

  const bumped = withLiveStrokes(round, playerId, holeNumber, nextStroke);
  const entry: ShotLog = {
    holeNumber,
    stroke: nextStroke,
  };
  if (opts?.lie) entry.lie = opts.lie;
  if (opts?.penalty) entry.penalty = true;

  const logs = [...(bumped.shotLog?.[playerId] || []), entry];
  return withPlayerShotLog(bumped, playerId, logs);
}

/**
 * Undo last live stroke for this hole: decrement liveStrokes and pop the
 * last shotLog entry for that player+hole.
 */
export function withUndoLastLiveStroke(
  round: ActiveRound,
  playerId: string,
  holeNumber: number
): ActiveRound {
  const current = getLiveStrokes(round, playerId, holeNumber);
  if (current <= 0) return round;

  const decremented = withLiveStrokes(round, playerId, holeNumber, current - 1);
  const logs = [...(decremented.shotLog?.[playerId] || [])];
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].holeNumber === holeNumber) {
      logs.splice(i, 1);
      break;
    }
  }
  return withPlayerShotLog(decremented, playerId, logs);
}
