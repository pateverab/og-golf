/**
 * Cart lock: while riding in the cart the phone sits in a holder or pocket and
 * stray touches must not add strokes. The lock is a pure UI shield over the
 * hole screen. It never touches score state. Persisted under its own key,
 * scoped to the ActiveRound id, so a reload mid-round keeps it and a new or
 * ended round never inherits it.
 */

export const CART_LOCK_STORAGE_KEY = "og-golf-cart-lock";

/** How long the unlock pill must be held (ms). */
export const CART_LOCK_HOLD_MS = 1000;

export interface CartLockState {
  roundId: string;
  lockedAt: string;
}

/** Parse the stored value; anything malformed means "not locked". */
export function parseCartLock(raw: string | null | undefined): CartLockState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CartLockState> | null;
    if (!value || typeof value.roundId !== "string" || value.roundId.length === 0) return null;
    return {
      roundId: value.roundId,
      lockedAt: typeof value.lockedAt === "string" ? value.lockedAt : "",
    };
  } catch {
    return null;
  }
}

export function serializeCartLock(state: CartLockState): string {
  return JSON.stringify(state);
}

export function createCartLock(roundId: string, now: Date = new Date()): CartLockState {
  return { roundId, lockedAt: now.toISOString() };
}

/** A stored lock only applies to the round it was set on. */
export function isCartLockedForRound(
  state: CartLockState | null,
  roundId: string | null | undefined
): boolean {
  return Boolean(state && roundId && state.roundId === roundId);
}

/** 0..1 progress of a press-and-hold that started at `startedAt`. */
export function holdProgress(
  startedAt: number | null,
  now: number,
  holdMs: number = CART_LOCK_HOLD_MS
): number {
  if (startedAt === null || holdMs <= 0) return 0;
  const p = (now - startedAt) / holdMs;
  return p <= 0 ? 0 : p >= 1 ? 1 : p;
}

/** The hold unlocks only once it has lasted the full hold time. */
export function isHoldComplete(
  startedAt: number | null,
  now: number,
  holdMs: number = CART_LOCK_HOLD_MS
): boolean {
  return startedAt !== null && now - startedAt >= holdMs;
}

// ---- localStorage wrappers (no-ops on the server / when storage is blocked) ----

export function readCartLock(): CartLockState | null {
  if (typeof window === "undefined") return null;
  try {
    return parseCartLock(window.localStorage.getItem(CART_LOCK_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeCartLock(state: CartLockState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_LOCK_STORAGE_KEY, serializeCartLock(state));
  } catch {
    // ignore
  }
}

export function clearCartLock(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_LOCK_STORAGE_KEY);
  } catch {
    // ignore
  }
}
