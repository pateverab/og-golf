"use client";

import { useEffect, useState } from "react";
import type { Lie } from "@/lib/types";

const LIE_OPTIONS: { id: Lie; label: string }[] = [
  { id: "tee", label: "Tee" },
  { id: "fairway", label: "Fairway" },
  { id: "rough", label: "Rough" },
  { id: "bunker", label: "Bunker" },
  { id: "green", label: "Green" },
  { id: "other", label: "Other" },
];

type LiveStrokeClickerProps = {
  playerName: string;
  holeNumber: number;
  par: number;
  liveCount: number;
  committedScore: number | null;
  onIncrement: (lie?: Lie) => void;
  onDecrement: () => void;
  onPenalty: (lie?: Lie) => void;
  onHoleOut: () => void;
  onEditManual?: () => void;
};

/**
 * Mid-hole live stroke counter. Optional lie chips tag where the next swing
 * starts — never required for +1 / Hole Out, never written onto HoleScore.
 */
export function LiveStrokeClicker({
  playerName,
  holeNumber,
  par,
  liveCount,
  committedScore,
  onIncrement,
  onDecrement,
  onPenalty,
  onHoleOut,
  onEditManual,
}: LiveStrokeClickerProps) {
  const isCommitted = committedScore !== null;
  const lying = isCommitted ? committedScore! : liveCount;
  const nextShot = lying + 1;
  const canHoleOut = !isCommitted && liveCount >= 1;
  const vsPar =
    isCommitted && committedScore !== null
      ? committedScore - par
      : liveCount > 0
        ? liveCount - par
        : null;

  // MVP: Tee default only for stroke 1; clear after each +1 / penalty.
  const [selectedLie, setSelectedLie] = useState<Lie | null>("tee");

  useEffect(() => {
    if (isCommitted) return;
    if (liveCount === 0) {
      setSelectedLie("tee");
    }
  }, [liveCount, holeNumber, isCommitted]);

  const toggleLie = (lie: Lie) => {
    setSelectedLie((prev) => (prev === lie ? null : lie));
  };

  const handleIncrement = () => {
    onIncrement(selectedLie ?? undefined);
    setSelectedLie(null);
  };

  const handlePenalty = () => {
    onPenalty(selectedLie ?? undefined);
    setSelectedLie(null);
  };

  return (
    <div className="rounded-2xl border border-[#c5a36f]/25 bg-white dark:bg-[#0c3326] p-4">
      <div className="flex items-baseline justify-between mb-3 px-0.5">
        <div className="font-semibold text-base">{playerName}</div>
        <div className="text-xs text-[#c5a36f]/80">Hole {holeNumber}</div>
      </div>

      {isCommitted ? (
        <div className="space-y-3">
          <div className="text-center py-2">
            <div className="text-sm tracking-wide text-[#c5a36f]/70">HOLED OUT</div>
            <div className="text-4xl font-bold tabular-nums mt-1">{committedScore}</div>
            {vsPar !== null && (
              <div
                className={`text-sm font-semibold mt-1 ${
                  vsPar > 0 ? "text-red-400" : vsPar < 0 ? "text-emerald-400" : "text-[#c5a36f]"
                }`}
              >
                {vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : vsPar} vs par
              </div>
            )}
          </div>
          {onEditManual && (
            <button
              type="button"
              onClick={onEditManual}
              className="w-full py-3 rounded-xl text-sm font-semibold border border-[#c5a36f]/40 text-[#c5a36f] active:bg-[#c5a36f]/10"
            >
              Edit score
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-golf-green-50 dark:bg-[#153a2a] py-3 px-2">
              <div className="text-[11px] tracking-wider text-[#c5a36f]/70">LYING</div>
              <div className="text-3xl font-bold tabular-nums mt-0.5">{lying}</div>
            </div>
            <div className="rounded-xl bg-golf-green-50 dark:bg-[#153a2a] py-3 px-2">
              <div className="text-[11px] tracking-wider text-[#c5a36f]/70">NEXT SHOT</div>
              <div className="text-3xl font-bold tabular-nums mt-0.5 text-[#c5a36f]">{nextShot}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDecrement}
              disabled={liveCount <= 0}
              aria-label="Undo last stroke"
              className="score-btn disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleIncrement}
              aria-label="Add stroke"
              className="flex-1 h-[68px] rounded-2xl bg-[#c5a36f] text-[#051b14] text-xl font-bold active:opacity-90 active:scale-[0.985] transition"
            >
              +1 Stroke
            </button>
            <button
              type="button"
              onClick={handlePenalty}
              aria-label="Add penalty stroke"
              className="h-[68px] px-3 rounded-2xl border-2 border-[#c5a36f]/60 text-[#c5a36f] text-sm font-bold active:bg-[#c5a36f]/15 active:scale-[0.985] transition"
            >
              +1
              <br />
              Penalty
            </button>
          </div>

          <div>
            <div className="text-[10px] tracking-wider text-[#c5a36f]/70 mb-1.5 px-0.5">
              LIE (OPTIONAL)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LIE_OPTIONS.map((opt) => {
                const active = selectedLie === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleLie(opt.id)}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition active:scale-[0.97] ${
                      active
                        ? "bg-[#c5a36f] text-[#051b14] border-[#c5a36f]"
                        : "bg-white dark:bg-[#0a2e1f] text-[#c5a36f] border-[#c5a36f]/35"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onHoleOut}
            disabled={!canHoleOut}
            className="w-full h-[64px] rounded-2xl border-2 border-[#c5a36f] bg-[#0a2e1f] text-[#c5a36f] text-lg font-bold tracking-wide active:bg-[#c5a36f] active:text-[#051b14] disabled:opacity-40 disabled:active:bg-[#0a2e1f] disabled:active:text-[#c5a36f] transition"
          >
            HOLE OUT{liveCount > 0 ? ` · ${liveCount}` : ""}
          </button>

          {vsPar !== null && liveCount > 0 && (
            <div className="text-center text-xs text-[#c5a36f]/70 tabular-nums">
              Live vs par: {vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : vsPar}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
