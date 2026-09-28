"use client";

import { useEffect, useState } from "react";

type Step = "choose" | "restart" | "delete";

export interface QuitRoundModalProps {
  open: boolean;
  courseName: string;
  currentHole: number;
  /** Configured first hole of the round (1, or 10 for a hole-10 / back-nine start). */
  startingHole: number;
  onClose: () => void;
  onSaveForLater: () => void;
  onRestart: () => void;
  onDelete: () => void;
}

/**
 * "Quit this round?" — Save and continue later / Start this round again /
 * Quit and delete. Destructive choices need a second, in-modal confirm step
 * (with Back); Cancel, ×, Escape, or a tap outside change nothing. Sized to
 * fit a 375x553 viewport with no scroller, and the backdrop never pans the
 * page behind it.
 */
export function QuitRoundModal({
  open,
  courseName,
  currentHole,
  startingHole,
  onClose,
  onSaveForLater,
  onRestart,
  onDelete,
}: QuitRoundModalProps) {
  const [step, setStep] = useState<Step>("choose");

  useEffect(() => {
    if (open) setStep("choose");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bigBtn =
    "w-full min-h-[clamp(52px,9dvh,64px)] rounded-2xl px-4 py-2 text-left flex flex-col justify-center transition active:scale-[0.985]";
  const redConfirm =
    "w-full h-[clamp(52px,9dvh,64px)] rounded-2xl bg-red-600 text-white text-lg font-bold active:bg-red-700 transition";
  const backBtn =
    "w-full h-[clamp(48px,8dvh,56px)] rounded-2xl border-2 border-golf-green-100 dark:border-[#2a5a48] text-[#c5a36f] text-base font-semibold active:bg-[#c5a36f]/10";

  return (
    <div
      className="og-quit-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-3 touch-none overscroll-none"
      onClick={onClose}
      data-control="quit-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="og-quit-title"
        data-control="quit-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[calc(100dvh-16px)] overflow-hidden rounded-3xl border border-[#c5a36f]/40 bg-white dark:bg-[#0c3326] text-golf-green-900 dark:text-golf-cream shadow-2xl p-[clamp(14px,2.6dvh,22px)] flex flex-col gap-[clamp(8px,1.5dvh,12px)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="og-quit-title" className="text-xl font-semibold leading-tight">
              {step === "choose"
                ? "Quit this round?"
                : step === "restart"
                  ? "Start this round again?"
                  : "Quit and delete?"}
            </h2>
            <div className="text-xs text-[#c5a36f]/80 truncate mt-0.5">
              {courseName} · Hole {currentHole}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-control="quit-close"
            className="shrink-0 -mr-1 -mt-1 h-12 w-12 rounded-xl text-4xl leading-none text-[#c5a36f] active:bg-[#c5a36f]/10"
          >
            ×
          </button>
        </div>

        {step === "choose" && (
          <>
            <button
              type="button"
              onClick={onSaveForLater}
              data-control="quit-save"
              className={`${bigBtn} bg-[#c5a36f] text-[#051b14]`}
            >
              <span className="text-lg font-bold leading-tight">Save and continue later</span>
              <span className="text-xs opacity-80">Keeps every score · resume from Home</span>
            </button>
            <button
              type="button"
              onClick={() => setStep("restart")}
              data-control="quit-restart"
              className={`${bigBtn} border-2 border-red-400/70 text-red-400 active:bg-red-500/10`}
            >
              <span className="text-lg font-bold leading-tight">Start this round again</span>
              <span className="text-xs opacity-80">Clears scores · same course and players</span>
            </button>
            <button
              type="button"
              onClick={() => setStep("delete")}
              data-control="quit-delete"
              className={`${bigBtn} border-2 border-red-500 bg-red-500/10 text-red-400 active:bg-red-500/20`}
            >
              <span className="text-lg font-bold leading-tight">Quit and delete</span>
              <span className="text-xs opacity-80">Removes this round · cannot be undone</span>
            </button>
            <button type="button" onClick={onClose} data-control="quit-cancel" className={backBtn}>
              Cancel
            </button>
          </>
        )}

        {step === "restart" && (
          <>
            <p className="text-base leading-snug py-1">
              Clear all scores for this round and restart on hole {startingHole}?
            </p>
            <button type="button" onClick={onRestart} data-control="quit-restart-confirm" className={redConfirm}>
              Clear scores and restart
            </button>
            <button type="button" onClick={() => setStep("choose")} data-control="quit-back" className={backBtn}>
              Back
            </button>
          </>
        )}

        {step === "delete" && (
          <>
            <p className="text-base leading-snug py-1">Delete this in-progress round? This cannot be undone.</p>
            <button type="button" onClick={onDelete} data-control="quit-delete-confirm" className={redConfirm}>
              Delete round
            </button>
            <button type="button" onClick={() => setStep("choose")} data-control="quit-back" className={backBtn}>
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
