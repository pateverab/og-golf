"use client";

import { useEffect, useState } from "react";
import type { Lie, ShotLog } from "@/lib/types";
import {
  LIE_OPTIONS,
  LIE_REQUIRED_HINT,
  canAddStroke,
  initialLieFor,
  lieAfterPenalty,
  lieAfterStroke,
  lieAfterUndo,
} from "@/lib/lies";

type LiveStrokeClickerProps = {
  playerName: string;
  holeNumber: number;
  par: number;
  liveCount: number;
  committedScore: number | null;
  /** This player's shot log for this hole (oldest first). */
  holeShots: ShotLog[];
  onIncrement: (lie: Lie) => void;
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
 * screen with no scrolling (every height is dvh-clamped).
 *
 * +1 Stroke needs a lie: stroke 1 defaults to Tee, every other +1 needs a
 * fresh chip (Green stays selected while putting). +1 Penalty, Undo, and
 * Hole Out never need a lie. Lies are written to shotLog only, never onto
 * HoleScore.
 */
export function LiveStrokeClicker({
  playerName,
  holeNumber,
  par,
  liveCount,
  committedScore,
  holeShots,
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

  const [selectedLie, setSelectedLie] = useState<Lie | null>(() =>
    initialLieFor(liveCount, holeShots[holeShots.length - 1])
  );

  // Back at 0 strokes on this hole (new hole, undo to zero, restart): Tee.
  useEffect(() => {
    if (isCommitted) return;
    if (liveCount === 0) setSelectedLie("tee");
  }, [liveCount, holeNumber, isCommitted]);

  const strokeEnabled = canAddStroke(selectedLie);

  const toggleLie = (lie: Lie) => {
    setSelectedLie((prev) => (prev === lie ? null : lie));
  };

  const handleIncrement = () => {
    if (!canAddStroke(selectedLie)) return; // no lie → +1 does nothing
    onIncrement(selectedLie);
    setSelectedLie(lieAfterStroke(selectedLie));
  };

  const handlePenalty = () => {
    onPenalty(selectedLie ?? undefined);
    setSelectedLie(lieAfterPenalty());
  };

  const handleUndo = () => {
    if (liveCount <= 0) return;
    const undone = holeShots[holeShots.length - 1];
    onDecrement();
    setSelectedLie(lieAfterUndo(undone, liveCount - 1));
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
    <div className="w-full max-w-md mx-auto flex flex-col justify-center gap-[clamp(4px,1dvh,12px)]">
      {/* Lying / next shot in one compact row */}
      <div className="grid grid-cols-2 gap-[clamp(6px,1.2dvh,12px)] h-[clamp(36px,7dvh,72px)]">
        <div className="rounded-xl bg-golf-green-50 dark:bg-[#153a2a] px-3 flex items-center justify-between">
          <span className="text-[11px] tracking-wider text-[#c5a36f]/80">LYING</span>
          <span
            className="text-[clamp(22px,4.4dvh,40px)] font-bold tabular-nums leading-none"
            data-control="lying"
          >
            {lying}
          </span>
        </div>
        <div className="rounded-xl bg-golf-green-50 dark:bg-[#153a2a] px-3 flex items-center justify-between">
          <span className="text-[11px] tracking-wider text-[#c5a36f]/80">NEXT SHOT</span>
          <span className="text-[clamp(22px,4.4dvh,40px)] font-bold tabular-nums leading-none text-[#c5a36f]">
            {nextShot}
          </span>
        </div>
      </div>

      {/* Lie chips: one is required for +1 Stroke */}
      <div className="grid grid-cols-3 gap-[clamp(4px,0.9dvh,8px)]" role="group" aria-label="Lie (required for +1 Stroke)">
        {LIE_OPTIONS.map((opt) => {
          const active = selectedLie === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleLie(opt.id)}
              aria-pressed={active}
              data-control={`lie-${opt.id}`}
              className={`h-[clamp(32px,5.6dvh,52px)] rounded-xl text-[clamp(13px,2dvh,16px)] font-semibold border-2 transition active:scale-[0.97] ${
                active
                  ? "bg-[#c5a36f] text-[#051b14] border-[#c5a36f]"
                  : strokeEnabled
                    ? "bg-white dark:bg-[#0a2e1f] text-[#c5a36f] border-[#c5a36f]/35"
                    : "bg-white dark:bg-[#0a2e1f] text-[#c5a36f] border-[#c5a36f]/80"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Thumb zone: one huge +1 (needs a lie), then undo / penalty, then Hole Out. */}
      <button
        type="button"
        onClick={handleIncrement}
        aria-label="Add stroke"
        aria-disabled={!strokeEnabled}
        aria-describedby={strokeEnabled ? undefined : "og-lie-hint"}
        tabIndex={strokeEnabled ? 0 : -1}
        data-control="plus1"
        className={`w-full h-[clamp(64px,12dvh,104px)] rounded-3xl font-extrabold tracking-wide transition flex flex-col items-center justify-center leading-none ${
          strokeEnabled
            ? "bg-[#c5a36f] text-[#051b14] shadow-lg active:opacity-90 active:scale-[0.985]"
            : "pointer-events-none bg-[#c5a36f]/25 text-[#051b14]/60 dark:text-golf-cream/50 border-2 border-dashed border-[#c5a36f]/40"
        }`}
      >
        <span className="text-[clamp(24px,4.4dvh,36px)]">+1 Stroke</span>
        {!strokeEnabled && (
          <span id="og-lie-hint" data-control="lie-hint" className="mt-1.5 px-2 text-[11px] font-semibold tracking-normal leading-tight text-[#c5a36f]">
            {LIE_REQUIRED_HINT}
          </span>
        )}
      </button>

      <div className="grid grid-cols-2 gap-[clamp(6px,1.2dvh,12px)]">
        <button
          type="button"
          onClick={handleUndo}
          disabled={liveCount <= 0}
          aria-label="Undo last stroke"
          data-control="undo"
          className="h-[clamp(40px,7dvh,64px)] rounded-2xl border-2 border-golf-green-100 dark:border-[#2a5a48] text-[#c5a36f] text-base font-bold active:bg-[#c5a36f]/15 disabled:opacity-40 transition"
        >
          − Undo
        </button>
        <button
          type="button"
          onClick={handlePenalty}
          aria-label="Add penalty stroke"
          data-control="penalty"
          className="h-[clamp(40px,7dvh,64px)] rounded-2xl border-2 border-[#c5a36f]/60 text-[#c5a36f] text-base font-bold active:bg-[#c5a36f]/15 active:scale-[0.985] transition"
        >
          +1 Penalty
        </button>
      </div>

      <button
        type="button"
        onClick={onHoleOut}
        disabled={!canHoleOut}
        data-control="holeout"
        className="w-full h-[clamp(44px,7.5dvh,68px)] rounded-2xl border-2 border-[#c5a36f] bg-[#0a2e1f] text-[#c5a36f] text-lg font-bold tracking-wide active:bg-[#c5a36f] active:text-[#051b14] disabled:opacity-40 disabled:active:bg-[#0a2e1f] disabled:active:text-[#c5a36f] transition"
      >
        HOLE OUT{liveCount > 0 ? ` · ${liveCount}` : ""}
      </button>

      <div className="flex items-center justify-between gap-2 h-[clamp(20px,3.2dvh,32px)] px-0.5 text-xs">
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
