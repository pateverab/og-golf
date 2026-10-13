"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import { CART_LOCK_HOLD_MS, holdProgress, isHoldComplete } from "@/lib/cartLock";

export interface CartLockOverlayProps {
  onUnlock: () => void;
}

const RING_R = 16;
const RING_C = 2 * Math.PI * RING_R;

/** Swallow an event so nothing underneath ever sees it. */
function swallow(e: React.SyntheticEvent) {
  e.stopPropagation();
  if (e.cancelable) e.preventDefault();
}

/**
 * Full-screen transparent shield over the hole screen while the cart lock is
 * on. Every tap, touch and click is swallowed; the only live control is the
 * unlock pill, which needs a CART_LOCK_HOLD_MS press-and-hold (a progress ring
 * fills while held; releasing early cancels).
 */
export function CartLockOverlay({ onUnlock }: CartLockOverlayProps) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);
  const unlockRef = useRef(onUnlock);
  unlockRef.current = onUnlock;

  useEffect(() => {
    if (startedAt === null) {
      setProgress(0);
      return;
    }
    const tick = () => {
      const now = performance.now();
      setProgress(holdProgress(startedAt, now));
      if (isHoldComplete(startedAt, now)) {
        setStartedAt(null);
        unlockRef.current();
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [startedAt]);

  const cancelHold = () => setStartedAt(null);

  // Native, non-passive touch listeners so iOS can't start a scroll, zoom or
  // callout from inside the overlay (React's touch handlers are passive).
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const block = (e: Event) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    };
    const opts: AddEventListenerOptions = { passive: false };
    el.addEventListener("touchstart", block, opts);
    el.addEventListener("touchmove", block, opts);
    el.addEventListener("touchend", block, opts);
    el.addEventListener("gesturestart", block, opts);
    return () => {
      el.removeEventListener("touchstart", block);
      el.removeEventListener("touchmove", block);
      el.removeEventListener("touchend", block);
      el.removeEventListener("gesturestart", block);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-control="cart-lock-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Screen locked"
      className="fixed inset-0 z-[80] bg-transparent touch-none select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
      onPointerDown={swallow}
      onPointerUp={swallow}
      onClick={swallow}
      onDoubleClick={swallow}
      onContextMenu={swallow}
      onMouseDown={swallow}
      onMouseUp={swallow}
    >
      <div className="pointer-events-none absolute inset-x-0 top-[max(env(safe-area-inset-top),8px)] flex justify-center px-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-og-accent-line bg-og-raised/95 pl-3 pr-1 py-1 shadow-lg">
          <span className="text-[13px] font-semibold text-og-text whitespace-nowrap" data-control="cart-lock-banner">
            Locked · press and hold to unlock
          </span>
          <button
            type="button"
            data-control="cart-unlock"
            aria-label={`Unlock: press and hold for ${CART_LOCK_HOLD_MS / 1000} second`}
            className="relative h-10 w-10 shrink-0 rounded-full bg-og-accent text-og-on-accent flex items-center justify-center touch-none"
            onPointerDown={(e) => {
              swallow(e);
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
              setStartedAt(performance.now());
            }}
            onPointerUp={(e) => {
              swallow(e);
              cancelHold();
            }}
            onPointerCancel={cancelHold}
            onLostPointerCapture={cancelHold}
            onClick={swallow}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && startedAt === null) {
                e.preventDefault();
                setStartedAt(performance.now());
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") cancelHold();
            }}
          >
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
              <circle cx="20" cy="20" r={RING_R} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <circle
                data-control="cart-unlock-ring"
                data-progress={progress.toFixed(2)}
                cx="20"
                cy="20"
                r={RING_R}
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - progress)}
              />
            </svg>
            <LockGlyph open={progress > 0} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function LockGlyph({ open = false, size = 16 }: { open?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="relative">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d={open ? "M8 11V7a4 4 0 0 1 7.5-2" : "M8 11V7a4 4 0 0 1 8 0v4"} />
    </svg>
  );
}
