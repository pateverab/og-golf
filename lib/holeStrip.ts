/** How many earlier holes the strip shows to the left of "now" by default. */
export const STRIP_PREVIOUS = 3;

export interface HoleStripModel {
  /** Empty placeholder slots before the first hole (never a fake hole 0). */
  padCount: number;
  /** Every hole in play, in play order (getHolesInPlay). */
  holes: number[];
  /** Index of the current hole inside `holes` (-1 if it is not in play). */
  currentIndex: number;
}

/**
 * Model for the top hole-summary strip: all holes in play order, padded on
 * the left so the default window is [current-3, current-2, current-1, now]
 * with "now" at the right edge even on the first holes of the round.
 */
export function buildHoleStrip(
  holesInPlay: number[],
  currentHole: number,
  previous: number = STRIP_PREVIOUS
): HoleStripModel {
  const currentIndex = holesInPlay.indexOf(currentHole);
  const padCount = currentIndex < 0 ? 0 : Math.max(0, previous - currentIndex);
  return { padCount, holes: [...holesInPlay], currentIndex };
}

/** Holes visible in the default window: up to `previous` earlier holes, then the current one. */
export function defaultStripWindow(
  holesInPlay: number[],
  currentHole: number,
  previous: number = STRIP_PREVIOUS
): (number | null)[] {
  const { padCount, currentIndex } = buildHoleStrip(holesInPlay, currentHole, previous);
  if (currentIndex < 0) return [];
  const earlier = holesInPlay.slice(Math.max(0, currentIndex - previous), currentIndex);
  return [...Array<null>(padCount).fill(null), ...earlier, currentHole];
}
