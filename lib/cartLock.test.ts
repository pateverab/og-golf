import { describe, expect, it } from "vitest";
import {
  CART_LOCK_HOLD_MS,
  createCartLock,
  holdProgress,
  isCartLockedForRound,
  isHoldComplete,
  parseCartLock,
  serializeCartLock,
} from "./cartLock";

describe("cart lock state", () => {
  it("round-trips through storage", () => {
    const s = createCartLock("r1", new Date("2026-10-13T14:00:00Z"));
    expect(parseCartLock(serializeCartLock(s))).toEqual({ roundId: "r1", lockedAt: "2026-10-13T14:00:00.000Z" });
  });

  it("treats missing or malformed values as unlocked", () => {
    expect(parseCartLock(null)).toBeNull();
    expect(parseCartLock("")).toBeNull();
    expect(parseCartLock("not json")).toBeNull();
    expect(parseCartLock("null")).toBeNull();
    expect(parseCartLock('{"roundId":""}')).toBeNull();
    expect(parseCartLock('{"roundId":5}')).toBeNull();
    expect(parseCartLock('{"roundId":"r1"}')).toEqual({ roundId: "r1", lockedAt: "" });
  });

  it("only applies to the round it was set on", () => {
    const s = createCartLock("r1");
    expect(isCartLockedForRound(s, "r1")).toBe(true);
    expect(isCartLockedForRound(s, "r2")).toBe(false);
    expect(isCartLockedForRound(s, null)).toBe(false);
    expect(isCartLockedForRound(null, "r1")).toBe(false);
  });
});

describe("press-and-hold", () => {
  it("uses a ~1s hold", () => {
    expect(CART_LOCK_HOLD_MS).toBeGreaterThanOrEqual(800);
    expect(CART_LOCK_HOLD_MS).toBeLessThanOrEqual(1500);
  });

  it("reports progress clamped to 0..1", () => {
    expect(holdProgress(null, 500)).toBe(0);
    expect(holdProgress(1000, 900)).toBe(0);
    expect(holdProgress(1000, 1000 + CART_LOCK_HOLD_MS / 2)).toBeCloseTo(0.5);
    expect(holdProgress(1000, 1000 + CART_LOCK_HOLD_MS * 3)).toBe(1);
  });

  it("does not unlock on a short press, unlocks after the full hold", () => {
    expect(isHoldComplete(null, 99999)).toBe(false);
    expect(isHoldComplete(0, 200)).toBe(false);
    expect(isHoldComplete(0, CART_LOCK_HOLD_MS - 1)).toBe(false);
    expect(isHoldComplete(0, CART_LOCK_HOLD_MS)).toBe(true);
  });
});
