import { describe, expect, it } from "vitest";
import {
  SCROLL_ALLOW_SELECTOR,
  SCROLL_AXIS_ATTR,
  isScrollAllowed,
  parseScrollAxis,
  shouldAllowTouchScroll,
  shouldBlockTouchMove,
  shouldResetDocumentScroll,
  type ScrollMetrics,
} from "./scrollLock";

const list = (scrollTop: number): ScrollMetrics => ({
  scrollTop,
  scrollHeight: 1000,
  clientHeight: 400,
  scrollLeft: 0,
  scrollWidth: 300,
  clientWidth: 300,
});

describe("isScrollAllowed", () => {
  it("only accepts the exact opt-in value", () => {
    expect(SCROLL_ALLOW_SELECTOR).toBe('[data-og-scroll="1"]');
    expect(isScrollAllowed("1")).toBe(true);
    expect(isScrollAllowed("")).toBe(false);
    expect(isScrollAllowed("y")).toBe(false);
    expect(isScrollAllowed(null)).toBe(false);
    expect(isScrollAllowed(undefined)).toBe(false);
  });
});

describe("shouldAllowTouchScroll", () => {
  it("blocks pulling down at the top of an inner list (no rubber band / pull-to-refresh)", () => {
    expect(shouldAllowTouchScroll(list(0), "y", 0, 12)).toBe(false);
  });

  it("allows scrolling the list when it has room", () => {
    expect(shouldAllowTouchScroll(list(0), "y", 0, -12)).toBe(true);
    expect(shouldAllowTouchScroll(list(300), "y", 0, 12)).toBe(true);
    expect(shouldAllowTouchScroll(list(300), "y", 0, -12)).toBe(true);
  });

  it("blocks pushing past the bottom of an inner list", () => {
    expect(shouldAllowTouchScroll(list(600), "y", 0, -12)).toBe(false);
  });

  it("blocks horizontal drags on a vertical-only list", () => {
    expect(shouldAllowTouchScroll(list(300), "y", 20, 2)).toBe(false);
  });

  it("blocks vertical drags on content that does not overflow", () => {
    const short: ScrollMetrics = { ...list(0), scrollHeight: 400 };
    expect(shouldAllowTouchScroll(short, "y", 0, -12)).toBe(false);
  });

  it("treats a zero-length move as allowed", () => {
    expect(shouldAllowTouchScroll(list(0), "y", 0, 0)).toBe(true);
  });
});

describe("shouldBlockTouchMove", () => {
  it("always blocks multi-touch (pinch / two-finger pan)", () => {
    expect(shouldBlockTouchMove({ touchCount: 2, scroller: list(300), dx: 0, dy: -10 })).toBe(true);
    expect(shouldBlockTouchMove({ touchCount: 3, scroller: null, dx: 0, dy: 0 })).toBe(true);
  });

  it("blocks every single-finger drag outside an opted-in scroller", () => {
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: null, dx: 0, dy: 40 })).toBe(true);
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: null, dx: -40, dy: 0 })).toBe(true);
  });

  it("lets the overlay scroller move only while it has room", () => {
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: list(0), dx: 0, dy: -10 })).toBe(false);
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: list(0), dx: 0, dy: 10 })).toBe(true);
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: list(600), dx: 0, dy: -10 })).toBe(true);
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: list(300), dx: 25, dy: 1 })).toBe(true);
  });
});

// Hole strip: 20 cells wide, one window visible, scrolled somewhere in the middle.
const strip = (scrollLeft: number): ScrollMetrics => ({
  scrollTop: 0,
  scrollHeight: 70,
  clientHeight: 70,
  scrollLeft,
  scrollWidth: 1800,
  clientWidth: 360,
});

describe("parseScrollAxis", () => {
  it("defaults to vertical and accepts x / both", () => {
    expect(SCROLL_AXIS_ATTR).toBe("data-og-scroll-axis");
    expect(parseScrollAxis("x")).toBe("x");
    expect(parseScrollAxis("both")).toBe("both");
    expect(parseScrollAxis("y")).toBe("y");
    expect(parseScrollAxis(null)).toBe("y");
    expect(parseScrollAxis("sideways")).toBe("y");
  });
});

describe("shouldBlockTouchMove on the horizontal hole strip", () => {
  it("lets a sideways drag move the strip while it has room", () => {
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: strip(600), dx: -20, dy: 2, axis: "x" })).toBe(false);
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: strip(600), dx: 20, dy: -3, axis: "x" })).toBe(false);
  });

  it("blocks vertical drags on the strip (no page scroll / rubber-band)", () => {
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: strip(600), dx: 2, dy: 30, axis: "x" })).toBe(true);
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: strip(600), dx: 0, dy: -30, axis: "x" })).toBe(true);
  });

  it("blocks a sideways drag past either end so it never chains into the page", () => {
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: strip(0), dx: 20, dy: 0, axis: "x" })).toBe(true);
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: strip(1440), dx: -20, dy: 0, axis: "x" })).toBe(true);
  });

  it("still blocks pinch on the strip, and vertical scrollers ignore sideways drags", () => {
    expect(shouldBlockTouchMove({ touchCount: 2, scroller: strip(600), dx: -20, dy: 0, axis: "x" })).toBe(true);
    expect(shouldBlockTouchMove({ touchCount: 1, scroller: strip(600), dx: -20, dy: 0 })).toBe(true);
  });
});

describe("shouldResetDocumentScroll", () => {
  it("snaps any document offset back to the origin", () => {
    expect(shouldResetDocumentScroll(0, 120, false)).toBe(true);
    expect(shouldResetDocumentScroll(8, 0, false)).toBe(true);
    expect(shouldResetDocumentScroll(0, 0, false)).toBe(false);
  });

  it("leaves the document alone while a text field is focused", () => {
    expect(shouldResetDocumentScroll(0, 200, true)).toBe(false);
  });
});
