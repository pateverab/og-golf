import { describe, expect, it } from "vitest";
import type { Course } from "@/lib/types";
import { getHolesInPlay } from "./calculations";
import { buildHoleStrip, defaultStripWindow } from "./holeStrip";

const course = (n: number): Course => ({
  id: "c",
  name: "C",
  location: "Q",
  holes: Array.from({ length: n }, (_, i) => ({ number: i + 1, par: 4 })),
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("hole strip model", () => {
  const eighteen = getHolesInPlay(course(18), { roundLength: 18, nineSide: "front", startingHole: 1 });

  it("shows the three previous holes with now at the right edge", () => {
    expect(defaultStripWindow(eighteen, 7)).toEqual([4, 5, 6, 7]);
  });

  it("pads empty slots on hole 1 and 2 instead of inventing hole 0", () => {
    expect(defaultStripWindow(eighteen, 1)).toEqual([null, null, null, 1]);
    expect(defaultStripWindow(eighteen, 2)).toEqual([null, null, 1, 2]);
    expect(buildHoleStrip(eighteen, 2).padCount).toBe(2);
    expect(buildHoleStrip(eighteen, 9).padCount).toBe(0);
    expect(buildHoleStrip(eighteen, 1).holes).not.toContain(0);
  });

  it("follows play order when starting on hole 10", () => {
    const tenStart = getHolesInPlay(course(18), { roundLength: 18, nineSide: "front", startingHole: 10 });
    expect(tenStart.slice(0, 3)).toEqual([10, 11, 12]);
    expect(defaultStripWindow(tenStart, 10)).toEqual([null, null, null, 10]);
    expect(defaultStripWindow(tenStart, 1)).toEqual([16, 17, 18, 1]);
  });

  it("handles 9-hole rounds and the back nine", () => {
    const nine = getHolesInPlay(course(9));
    expect(buildHoleStrip(nine, 9).holes).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const back = getHolesInPlay(course(18), { roundLength: 9, nineSide: "back", startingHole: 10 });
    expect(defaultStripWindow(back, 11)).toEqual([null, null, 10, 11]);
    expect(buildHoleStrip(back, 11).holes[0]).toBe(10);
  });

  it("returns an empty window when the hole is not in play", () => {
    expect(defaultStripWindow(eighteen, 42)).toEqual([]);
    expect(buildHoleStrip(eighteen, 42).padCount).toBe(0);
  });
});
