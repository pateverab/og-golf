/**
 * Pure helpers for the locked on-course play surface (iPhone Safari + PWA).
 *
 * While a round is active the document must never scroll, pan, or rubber-band.
 * Only elements marked with `data-scroll-allow="y" | "x" | "both"` may scroll,
 * and only while they still have room to move in the drag direction (so a drag
 * at the edge of an inner list never chains into the document).
 */

export const PLAY_LOCK_CLASS = "og-play-locked";
export const SCROLL_ALLOW_ATTR = "data-scroll-allow";

export type ScrollAxis = "x" | "y" | "both";

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}

export function parseScrollAxis(value: string | null | undefined): ScrollAxis | null {
  if (value === "x" || value === "y" || value === "both") return value;
  if (value === "" || value === "true") return "y";
  return null;
}

const EDGE_EPSILON = 1;

/**
 * Should a single-finger drag of (dx, dy) pixels since the last touch event be
 * allowed to scroll this element natively? dx/dy follow the finger: dy > 0 means
 * the finger moved down (content wants to scroll toward the top).
 */
export function shouldAllowTouchScroll(
  metrics: ScrollMetrics,
  axis: ScrollAxis,
  dx: number,
  dy: number
): boolean {
  if (dx === 0 && dy === 0) return true;

  const vertical = Math.abs(dy) >= Math.abs(dx);

  if (vertical) {
    if (axis === "x") return false;
    const maxTop = metrics.scrollHeight - metrics.clientHeight;
    if (maxTop <= EDGE_EPSILON) return false;
    if (dy > 0) return metrics.scrollTop > EDGE_EPSILON;
    return metrics.scrollTop < maxTop - EDGE_EPSILON;
  }

  if (axis === "y") return false;
  const maxLeft = metrics.scrollWidth - metrics.clientWidth;
  if (maxLeft <= EDGE_EPSILON) return false;
  if (dx > 0) return metrics.scrollLeft > EDGE_EPSILON;
  return metrics.scrollLeft < maxLeft - EDGE_EPSILON;
}
