"use client";

import { useEffect } from "react";
import {
  PLAY_LOCK_CLASS,
  SCROLL_ALLOW_ATTR,
  parseScrollAxis,
  shouldAllowTouchScroll,
} from "@/lib/scrollLock";

/**
 * Locks the document while the active-round (hole / live clicker) view is
 * mounted: no page scroll, no horizontal pan, no pull-to-refresh, no
 * rubber-banding, no pinch-pan. Only `[data-scroll-allow]` inner scrollers may
 * move. Everything is restored on unmount so courses / history / stats scroll
 * normally again.
 */
export function usePlaySurfaceLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;
    html.classList.add(PLAY_LOCK_CLASS);
    body.classList.add(PLAY_LOCK_CLASS);
    window.scrollTo(0, 0);

    let lastX = 0;
    let lastY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // Two+ fingers: never let the page pinch or pan.
      if (e.touches.length > 1) {
        if (e.cancelable) e.preventDefault();
        return;
      }
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - lastX;
      const dy = touch.clientY - lastY;
      lastX = touch.clientX;
      lastY = touch.clientY;

      const target = e.target instanceof Element ? e.target : null;
      const scroller = target?.closest<HTMLElement>(`[${SCROLL_ALLOW_ATTR}]`) ?? null;
      if (scroller) {
        const axis = parseScrollAxis(scroller.getAttribute(SCROLL_ALLOW_ATTR));
        if (
          axis &&
          shouldAllowTouchScroll(
            {
              scrollTop: scroller.scrollTop,
              scrollHeight: scroller.scrollHeight,
              clientHeight: scroller.clientHeight,
              scrollLeft: scroller.scrollLeft,
              scrollWidth: scroller.scrollWidth,
              clientWidth: scroller.clientWidth,
            },
            axis,
            dx,
            dy
          )
        ) {
          return;
        }
      }
      if (e.cancelable) e.preventDefault();
    };

    // iOS Safari pinch gestures.
    const onGesture = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };

    // Rotation / toolbar changes must never leave the document offset.
    // Skipped while typing so iOS can still lift a focused input above the keyboard.
    const resetScroll = () => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const resetAfterRotate = () => {
      resetScroll();
      window.setTimeout(resetScroll, 350);
    };

    const nonPassive: AddEventListenerOptions = { passive: false };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, nonPassive);
    document.addEventListener("gesturestart", onGesture, nonPassive);
    document.addEventListener("gesturechange", onGesture, nonPassive);
    window.addEventListener("orientationchange", resetAfterRotate);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove, nonPassive);
      document.removeEventListener("gesturestart", onGesture, nonPassive);
      document.removeEventListener("gesturechange", onGesture, nonPassive);
      window.removeEventListener("orientationchange", resetAfterRotate);
      html.classList.remove(PLAY_LOCK_CLASS);
      body.classList.remove(PLAY_LOCK_CLASS);
    };
  }, [active]);
}
