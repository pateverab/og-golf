/**
 * Pure helpers for the frozen on-course hole screen (iPhone Safari + PWA).
 *
 * While a round is active the document must never scroll, pan, rubber-band,
 * or pinch. The only thing allowed to move is an inner scroller explicitly
 * marked `data-og-scroll="1"` (the Card overlay, modals, and the horizontal
 * hole strip with `data-og-scroll-axis="x"`), and only along its axis while it
 * still has room to move in the drag direction, so a drag at its edge never
 * chains into the document.
 */

export const PLAY_LOCK_CLASS = "og-play-locked";
export const SCROLL_ALLOW_ATTR = "data-og-scroll";
export const SCROLL_ALLOW_VALUE = "1";
export const SCROLL_ALLOW_SELECTOR = `[${SCROLL_ALLOW_ATTR}="${SCROLL_ALLOW_VALUE}"]`;
/** Optional companion attribute: which axis the opted-in scroller moves on (default "y"). */
export const SCROLL_AXIS_ATTR = "data-og-scroll-axis";

export type ScrollAxis = "x" | "y" | "both";

/** Parse `data-og-scroll-axis`; anything unknown or missing means vertical. */
export function parseScrollAxis(value: string | null | undefined): ScrollAxis {
  return value === "x" || value === "both" ? value : "y";
}

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}

/** Is this attribute value an opt-in to inner scrolling? Only the exact "1". */
export function isScrollAllowed(value: string | null | undefined): boolean {
  return value === SCROLL_ALLOW_VALUE;
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

export interface TouchMoveInput {
  /** Fingers currently on the screen. */
  touchCount: number;
  /** Metrics of the nearest `[data-og-scroll="1"]` ancestor, or null if none. */
  scroller: ScrollMetrics | null;
  dx: number;
  dy: number;
  /** Axis the scroller moves on (from `data-og-scroll-axis`); default "y". */
  axis?: ScrollAxis;
}

/**
 * Decide whether a document-level touchmove must be cancelled while the hole
 * screen is mounted. Multi-touch (pinch / two-finger pan) is always blocked;
 * outside an opted-in scroller everything is blocked; inside one, block only
 * when it cannot scroll further in the drag direction.
 */
export function shouldBlockTouchMove({ touchCount, scroller, dx, dy, axis = "y" }: TouchMoveInput): boolean {
  if (touchCount > 1) return true;
  if (!scroller) return true;
  return !shouldAllowTouchScroll(scroller, axis, dx, dy);
}

/**
 * Should a `scroll` event snap the document back to (0, 0)? Skipped while a
 * text field is focused so iOS can still lift the manual score input above
 * the keyboard.
 */
export function shouldResetDocumentScroll(scrollX: number, scrollY: number, typing: boolean): boolean {
  if (typing) return false;
  return scrollX !== 0 || scrollY !== 0;
}
