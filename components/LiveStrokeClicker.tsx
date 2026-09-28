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
  /** Switch this player to manual score entry for the hole (fallback). */
  onManual?: () => void;
};

function formatVsPar(vsPar: number): string {
  if (vsPar === 0) return "E";
  return vsPar > 0 ? `+${vsPar}` : String(vsPar);
}

/**
 * Mid-hole live stroke counter for ONE player, sized to fit the frozen hole
 * screen with no scrolling (every height is dvh-clamped). Optional lie chips
 * tag where the next swing starts — never required for +1 / Hole Out, never
 * written onto HoleScore.
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
  onManual,
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

  // A stroke added or undone elsewhere clears any pending lie.
  useEffect(() => {
    if (!isCommitted && liveCount > 0) setSelectedLie(null);
  }, [liveCount, isCommitted]);

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

  if (isCommitted) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col justify-center gap-[clamp(8px,2dvh,20px)]">
        <div className="text-center">
          <div className="text-sm font-semibold truncate">{playerName}</div>
          <div className="text-sm tracking-[0.2em] text-[#c5a36f]/80 mt-1">HOLED OUT</div>
          <div
            className="text-[clamp(44px,10dvh,80px)] font-bold tabular-nums leading-none mt-2"
            data-control="committed-score"
          >
            {committedScore}
          </div>
          {vsPar !== null && (
            <div
              className={`text-base font-semibold mt-2 ${
                vsPar > 0 ? "text-red-400" : vsPar < 0 ? "text-emerald-400" : "text-[#c5a36f]"
              }`}
            >
              {formatVsPar(vsPar)} vs par
            </div>
          )}
        </div>
        {onEditManual && (
          <button
            type="button"
            onClick={onEditManual}
            data-control="edit-score"
            className="w-full h-[clamp(44px,7dvh,60px)] rounded-2xl text-base font-semibold border-2 border-[#c5a36f]/50 text-[#c5a36f] active:bg-[#c5a36f]/10"
          >
            Edit score
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col justify-center gap-[clamp(4px,1.2dvh,12px)]">
      {/* Lying / next shot in one compact row */}
      <div className="grid grid-cols-2 gap-[clamp(6px,1.2dvh,12px)] h-[clamp(40px,8dvh,72px)]">
        <div className="rounded-xl bg-golf-green-50 dark:bg-[#153a2a] px-3 flex items-center justify-between">
          <span className="text-[11px] tracking-wider text-[#c5a36f]/80">LYING</span>
          <span
            className="text-[clamp(24px,4.6dvh,40px)] font-bold tabular-nums leading-none"
            data-control="lying"
          >
            {lying}
          </span>
        </div>
        <div className="rounded-xl bg-golf-green-50 dark:bg-[#153a2a] px-3 flex items-center justify-between">
          <span className="text-[11px] tracking-wider text-[#c5a36f]/80">NEXT SHOT</span>
          <span className="text-[clamp(24px,4.6dvh,40px)] font-bold tabular-nums leading-none text-[#c5a36f]">
            {nextShot}
          </span>
        </div>
      </div>

      {/* Optional lie chips */}
      <div className="grid grid-cols-3 gap-[clamp(4px,0.9dvh,8px)]" role="group" aria-label="Lie (optional)">
        {LIE_OPTIONS.map((opt) => {
          const active = selectedLie === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleLie(opt.id)}
              aria-pressed={active}
              data-control={`lie-${opt.id}`}
              className={`h-[clamp(34px,6dvh,52px)] rounded-xl text-[clamp(13px,2dvh,16px)] font-semibold border-2 transition active:scale-[0.97] ${
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

      {/* Thumb zone: one huge +1, then undo / penalty, then Hole Out. */}
      <button
        type="button"
        onClick={handleIncrement}
        aria-label="Add stroke"
        data-control="plus1"
        className="w-full h-[clamp(64px,12dvh,104px)] rounded-3xl bg-[#c5a36f] text-[#051b14] text-[clamp(24px,4.4dvh,36px)] font-extrabold tracking-wide shadow-lg active:opacity-90 active:scale-[0.985] transition"
      >
        +1 Stroke
      </button>

      <div className="grid grid-cols-2 gap-[clamp(6px,1.2dvh,12px)]">
        <button
          type="button"
          onClick={onDecrement}
          disabled={liveCount <= 0}
          aria-label="Undo last stroke"
          data-control="undo"
          className="h-[clamp(44px,7.5dvh,64px)] rounded-2xl border-2 border-golf-green-100 dark:border-[#2a5a48] text-[#c5a36f] text-base font-bold active:bg-[#c5a36f]/15 disabled:opacity-40 transition"
        >
          − Undo
        </button>
        <button
          type="button"
          onClick={handlePenalty}
          aria-label="Add penalty stroke"
          data-control="penalty"
          className="h-[clamp(44px,7.5dvh,64px)] rounded-2xl border-2 border-[#c5a36f]/60 text-[#c5a36f] text-base font-bold active:bg-[#c5a36f]/15 active:scale-[0.985] transition"
        >
          +1 Penalty
        </button>
      </div>

      <button
        type="button"
        onClick={onHoleOut}
        disabled={!canHoleOut}
        data-control="holeout"
        className="w-full h-[clamp(48px,8dvh,68px)] rounded-2xl border-2 border-[#c5a36f] bg-[#0a2e1f] text-[#c5a36f] text-lg font-bold tracking-wide active:bg-[#c5a36f] active:text-[#051b14] disabled:opacity-40 disabled:active:bg-[#0a2e1f] disabled:active:text-[#c5a36f] transition"
      >
        HOLE OUT{liveCount > 0 ? ` · ${liveCount}` : ""}
      </button>

      <div className="flex items-center justify-between gap-2 h-[clamp(22px,3.6dvh,32px)] px-0.5 text-xs">
        <span className="min-w-0 truncate text-[#c5a36f]/80 tabular-nums">
          {playerName}
          {vsPar !== null && liveCount > 0 ? ` · live ${formatVsPar(vsPar)}` : ""}
        </span>
        {onManual && (
          <button
            type="button"
            onClick={onManual}
            data-control="manual"
            className="shrink-0 h-full px-2 text-[#c5a36f]/80 underline underline-offset-2"
          >
            Manual score
          </button>
        )}
      </div>
    </div>
  );
}
