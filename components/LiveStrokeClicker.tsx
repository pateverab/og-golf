"use client";

type LiveStrokeClickerProps = {
  playerName: string;
  holeNumber: number;
  par: number;
  liveCount: number;
  committedScore: number | null;
  onIncrement: () => void;
  onDecrement: () => void;
  onHoleOut: () => void;
  onEditManual?: () => void;
};

/**
 * Mid-hole live stroke counter. Taps stay in liveStrokes until HOLE OUT
 * commits them as HoleScore — never write score on the first tee tap.
 */
export function LiveStrokeClicker({
  playerName,
  holeNumber,
  par,
  liveCount,
  committedScore,
  onIncrement,
  onDecrement,
  onHoleOut,
  onEditManual,
}: LiveStrokeClickerProps) {
  const isCommitted = committedScore !== null;
  const lying = isCommitted ? committedScore : liveCount;
  const nextShot = lying + 1;
  const canHoleOut = !isCommitted && liveCount >= 1;
  const vsPar =
    isCommitted && committedScore !== null
      ? committedScore - par
      : liveCount > 0
        ? liveCount - par
        : null;

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

          <div className="flex items-center gap-3">
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
              onClick={onIncrement}
              aria-label="Add stroke"
              className="flex-1 h-[68px] rounded-2xl bg-[#c5a36f] text-[#051b14] text-xl font-bold active:opacity-90 active:scale-[0.985] transition"
            >
              +1 Stroke
            </button>
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
