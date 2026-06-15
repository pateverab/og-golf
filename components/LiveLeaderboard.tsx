"use client";

import { useMemo } from "react";
import type { ActiveRound, Course, HoleScore, Player } from "@/lib/types";
import { getHolesInPlay } from "@/lib/calculations";

interface LiveLeaderboardProps {
  playerIds: string[];
  players: Player[];
  course: Course;
  scores: Record<string, HoleScore[]>;
  roundConfig: Pick<ActiveRound, "roundLength" | "nineSide" | "startingHole">;
}

interface LeaderboardEntry {
  player: Player;
  total: number;
  vsPar: number;
  holesPlayed: number;
  rank: number;
}

function formatVsPar(vsPar: number): string {
  if (vsPar === 0) return "E";
  return vsPar > 0 ? `+${vsPar}` : String(vsPar);
}

export function LiveLeaderboard({
  playerIds,
  players,
  course,
  scores,
  roundConfig,
}: LiveLeaderboardProps) {
  const entries = useMemo(() => {
    const holesInPlay = new Set(getHolesInPlay(course, roundConfig));

    const raw = playerIds.map((playerId) => {
      const player = players.find((p) => p.id === playerId);
      if (!player) return null;

      const playerScores = (scores[playerId] || []).filter((s) => holesInPlay.has(s.holeNumber));
      const total = playerScores.reduce((sum, s) => sum + s.score, 0);
      const vsPar = playerScores.reduce((sum, s) => {
        const hole = course.holes.find((h) => h.number === s.holeNumber);
        return sum + (s.score - (hole?.par ?? 4));
      }, 0);

      return { player, total, vsPar, holesPlayed: playerScores.length };
    }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    raw.sort((a, b) => {
      if (a.holesPlayed === 0 && b.holesPlayed === 0) return 0;
      if (a.holesPlayed === 0) return 1;
      if (b.holesPlayed === 0) return -1;
      if (a.total !== b.total) return a.total - b.total;
      return a.vsPar - b.vsPar;
    });

    const ranked: LeaderboardEntry[] = [];
    for (let i = 0; i < raw.length; i++) {
      const entry = raw[i];
      if (entry.holesPlayed === 0) {
        ranked.push({ ...entry, rank: 0 });
        continue;
      }

      let rank = i + 1;
      if (i > 0 && raw[i - 1].holesPlayed > 0) {
        const prev = raw[i - 1];
        if (entry.total === prev.total && entry.vsPar === prev.vsPar) {
          rank = ranked[i - 1].rank;
        }
      }

      ranked.push({ ...entry, rank });
    }

    return ranked;
  }, [playerIds, players, course, scores, roundConfig]);

  const leaderId = entries.find((entry) => entry.holesPlayed > 0)?.player.id;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true" />
        <div className="uppercase tracking-[1.5px] text-xs font-semibold text-[#c5a36f]">
          Live Leaderboard
        </div>
      </div>

      <div className="golf-card rounded-3xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-[#c5a36f] border-b border-golf-green-200 dark:border-[#0f3d24]">
              <th className="py-3 px-4 font-medium w-12 text-center">#</th>
              <th className="py-3 px-2 font-medium">Player</th>
              <th className="py-3 px-2 font-medium text-center">Total</th>
              <th className="py-3 px-4 font-medium text-right">vs Par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-golf-green-100 dark:divide-[#0f3d24]/60 text-sm">
            {entries.map((entry) => {
              const isLeader = entry.player.id === leaderId;
              const hasScores = entry.holesPlayed > 0;

              return (
                <tr
                  key={entry.player.id}
                  className={`leaderboard-row transition-colors ${
                    isLeader
                      ? "bg-golf-gold/15 dark:bg-golf-gold/10 border-l-4 border-golf-gold"
                      : ""
                  }`}
                >
                  <td className="py-3.5 px-4 text-center font-bold tabular-nums text-[#c5a36f]">
                    {hasScores ? entry.rank : "—"}
                  </td>
                  <td className="py-3.5 px-2 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{entry.player.name}</span>
                      {isLeader && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-golf-gold text-golf-green-900">
                          Leader
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-center font-semibold tabular-nums">
                    {hasScores ? entry.total : "—"}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-semibold tabular-nums ${
                      !hasScores
                        ? "text-[#c5a36f]/50"
                        : entry.vsPar < 0
                          ? "text-emerald-400"
                          : entry.vsPar > 0
                            ? "text-red-400"
                            : ""
                    }`}
                  >
                    {hasScores ? formatVsPar(entry.vsPar) : "—"}
                    {hasScores && (
                      <span className="text-[10px] text-[#c5a36f]/50 ml-1.5 font-normal">
                        ({entry.holesPlayed} {entry.holesPlayed === 1 ? "hole" : "holes"})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}