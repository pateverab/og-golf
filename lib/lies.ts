import type { Lie, ShotLog } from "@/lib/types";

/** Lie chips, in on-course order. */
export const LIE_OPTIONS: { id: Lie; label: string }[] = [
  { id: "tee", label: "Tee" },
  { id: "fairway", label: "Fairway" },
  { id: "rough", label: "Rough" },
  { id: "bunker", label: "Bunker" },
  { id: "green", label: "Green" },
  { id: "other", label: "Other" },
];

export const LIE_REQUIRED_HINT = "Select Tee, Fairway, Rough, Bunker, Green or Other first.";

/** +1 Stroke is only allowed once a lie is chosen (Penalty / Undo / Hole Out never need one). */
export function canAddStroke(selectedLie: Lie | null | undefined): selectedLie is Lie {
  return selectedLie !== null && selectedLie !== undefined;
}

/**
 * Lie pre-selected when the clicker opens for a player on a hole:
 * stroke 1 is always from the Tee; every later shot (Green included) needs
 * a fresh chip.
 */
export function initialLieFor(liveCount: number, _lastShot?: ShotLog | null): Lie | null {
  return liveCount <= 0 ? "tee" : null;
}

/** Selection after a successful +1 Stroke: always cleared (Green included). */
export function lieAfterStroke(_lie: Lie): Lie | null {
  return null;
}

/** Selection after +1 Penalty: always cleared (the next swing needs a new chip). */
export function lieAfterPenalty(): Lie | null {
  return null;
}

/**
 * Selection after Undo: back to where the undone shot was played from (its
 * lie), Tee when the hole is back to 0 strokes, otherwise nothing selected.
 */
export function lieAfterUndo(undoneShot: ShotLog | null | undefined, remainingLive: number): Lie | null {
  if (remainingLive <= 0) return "tee";
  return undoneShot?.lie ?? null;
}
