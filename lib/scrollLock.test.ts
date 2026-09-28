import { describe, expect, it } from "vitest";
import { parseScrollAxis, shouldAllowTouchScroll, type ScrollMetrics } from "./scrollLock";

const list = (scrollTop: number): ScrollMetrics => ({
  scrollTop,
  scrollHeight: 1000,
  clientHeight: 400,
  scrollLeft: 0,
  scrollWidth: 300,
  clientWidth: 300,
});

const strip = (scrollLeft: number): ScrollMetrics => ({
  scrollTop: 0,
  scrollHeight: 80,
  clientHeight: 80,
  scrollLeft,
  scrollWidth: 1200,
  clientWidth: 360,
});

describe("parseScrollAxis", () => {
  it("accepts x, y, both and defaults empty to y", () => {
    expect(parseScrollAxis("x")).toBe("x");
    expect(parseScrollAxis("y")).toBe("y");
    expect(parseScrollAxis("both")).toBe("both");
    expect(parseScrollAxis("")).toBe("y");
    expect(parseScrollAxis(null)).toBeNull();
    expect(parseScrollAxis("nope")).toBeNull();
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

  it("blocks vertical drags on a content that does not overflow", () => {
    const short: ScrollMetrics = { ...list(0), scrollHeight: 400 };
    expect(shouldAllowTouchScroll(short, "y", 0, -12)).toBe(false);
  });

  it("allows the horizontal hole strip to scroll sideways only", () => {
    expect(shouldAllowTouchScroll(strip(100), "x", 15, 1)).toBe(true);
    expect(shouldAllowTouchScroll(strip(100), "x", -15, 1)).toBe(true);
    expect(shouldAllowTouchScroll(strip(100), "x", 1, 15)).toBe(false);
    expect(shouldAllowTouchScroll(strip(0), "x", 15, 1)).toBe(false);
    expect(shouldAllowTouchScroll(strip(840), "x", -15, 1)).toBe(false);
  });

  it("treats a zero-length move as allowed", () => {
    expect(shouldAllowTouchScroll(list(0), "y", 0, 0)).toBe(true);
  });
});
