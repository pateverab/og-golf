"use client";

import type { ActiveRound, Course, Player } from "@/lib/types";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import {
  getActiveTotalForPlayer,
  getActiveVsParForPlayer,
  getPlayerScoreOnHole,
} from "@/lib/activeRound";
import { MarkedScore } from "@/components/MarkedScore";

interface PlayCardOverlayProps {
  activeRound: ActiveRound;
  course: Course;
  players: Player[];
  holesInPlay: number[];
  currentHole: number;
  onClose: () => void;
  onJumpToHole: (hole: number) => void;
}

function formatVsPar(vsPar: number): string {
  if (vsPar === 0) return "E";
  return vsPar > 0 ? `+${vsPar}` : String(vsPar);
}

/**
 * Contained "Card" overlay for the frozen hole screen: live leaderboard plus a
 * per-hole score grid. It is the only scroller on the play view
 * (`data-og-scroll="1"`, overscroll contained) and never chains into the page.
 */
export function PlayCardOverlay({
  activeRound,
  course,
  players,
  holesInPlay,
  currentHole,
  onClose,
  onJumpToHole,
}: PlayCardOverlayProps) {
  const roster = activeRound.playerIds
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p));
  const parFor = (hole: number) => course.holes.find((h) => h.number === hole)?.par ?? 4;
  const totalPar = holesInPlay.reduce((sum, h) => sum + parFor(h), 0);

  return (
    <div
      className="og-card-overlay bg-golf-cream text-golf-green-900 dark:bg-[#0a2e1f] dark:text-golf-cream"
      role="dialog"
      aria-modal="true"
      aria-label="Scorecard"
      data-control="card-overlay"
    >
      <div className="flex-none flex items-center justify-between gap-3 px-4 py-3 border-b border-golf-green-100 dark:border-[#1a4a2f]">
        <div className="min-w-0">
          <div className="text-[11px] tracking-wider text-[#c5a36f] truncate">{course.name}</div>
          <div className="text-xl font-semibold">Scorecard</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-control="card-close"
          className="shrink-0 h-14 min-w-[112px] px-5 rounded-2xl bg-[#c5a36f] text-[#051b14] text-lg font-bold active:opacity-90"
        >
          Close
        </button>
      </div>

      <div data-og-scroll="1" className="og-card-scroll px-4 pt-4 pb-6">
        <LiveLeaderboard
          playerIds={activeRound.playerIds}
          players={players}
          course={course}
          scores={activeRound.scores}
          roundConfig={activeRound}
        />

        <div className="uppercase tracking-[1.5px] text-xs font-semibold text-[#c5a36f] mb-2 px-1">
          Hole by hole · tap a hole to jump
        </div>
        <div className="golf-card rounded-3xl overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="text-xs text-[#c5a36f] border-b border-golf-green-200 dark:border-[#0f3d24]">
                <th className="py-2.5 pl-3 text-left font-medium w-14">Hole</th>
                <th className="py-2.5 text-center font-medium w-11">Par</th>
                {roster.map((p) => (
                  <th key={p.id} className="py-2.5 px-1 text-center font-medium truncate">
                    {p.name.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-golf-green-100 dark:divide-[#0f3d24]/60">
              {holesInPlay.map((hole) => {
                const par = parFor(hole);
                const isCurrent = hole === currentHole;
                return (
                  <tr
                    key={hole}
                    onClick={() => onJumpToHole(hole)}
                    data-control={`card-hole-${hole}`}
                    className={`cursor-pointer active:bg-[#c5a36f]/15 ${
                      isCurrent ? "bg-[#c5a36f]/15" : ""
                    }`}
                  >
                    <td className="py-2 pl-3 font-semibold tabular-nums">
                      {hole}
                      {isCurrent && <span className="ml-1 text-[10px] text-[#c5a36f]">●</span>}
                    </td>
                    <td className="py-2 text-center tabular-nums text-[#c5a36f]">{par}</td>
                    {roster.map((p) => (
                      <td key={p.id} className="py-2 px-1 text-center tabular-nums">
                        <MarkedScore score={getPlayerScoreOnHole(activeRound, p.id, hole)} par={par} />
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="font-semibold border-t-2 border-[#c5a36f]/40">
                <td className="py-2.5 pl-3">Tot</td>
                <td className="py-2.5 text-center tabular-nums text-[#c5a36f]">{totalPar}</td>
                {roster.map((p) => {
                  const total = getActiveTotalForPlayer(activeRound, course, p.id);
                  const vs = getActiveVsParForPlayer(activeRound, course, p.id);
                  return (
                    <td key={p.id} className="py-2.5 px-1 text-center tabular-nums">
                      <div>{total || "—"}</div>
                      {total > 0 && (
                        <div
                          className={`text-[11px] ${
                            vs < 0 ? "text-emerald-400" : vs > 0 ? "text-red-400" : "text-[#c5a36f]"
                          }`}
                        >
                          {formatVsPar(vs)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
