"use client";

import { useEffect } from "react";
import {
  PLAY_LOCK_CLASS,
  SCROLL_ALLOW_SELECTOR,
  SCROLL_AXIS_ATTR,
  parseScrollAxis,
  shouldBlockTouchMove,
  shouldResetDocumentScroll,
} from "@/lib/scrollLock";

function isTyping(): boolean {
  const el = typeof document !== "undefined" ? document.activeElement : null;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

/**
 * Freezes the document while the hole screen (PlayHoleShell) is mounted:
 * no vertical / horizontal scroll, no rubber-band, no pull-to-refresh, no pan,
 * no pinch. Only `[data-og-scroll="1"]` scrollers (the Card overlay, modals,
 * and the horizontal hole strip) may move, only along their axis
 * (`data-og-scroll-axis`, default vertical), and only while they have room in
 * the drag direction.
 *
 * On unmount every listener and the lock class are removed and the previous
 * scroll position is restored, so Courses / History / Stats scroll again.
 */
export function usePlaySurfaceLock(active: boolean = true) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;
    const prevX = window.scrollX;
    const prevY = window.scrollY;

    html.classList.add(PLAY_LOCK_CLASS);
    body.classList.add(PLAY_LOCK_CLASS);
    window.scrollTo(0, 0);

    let lastX = 0;
    let lastY = 0;

    const onTouchStart = (e: TouchEvent) => {
      // Passive on purpose: never cancel a tap (two thumbs tapping +1 must both count).
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      let dx = 0;
      let dy = 0;
      if (touch && e.touches.length === 1) {
        dx = touch.clientX - lastX;
        dy = touch.clientY - lastY;
        lastX = touch.clientX;
        lastY = touch.clientY;
      }

      const target = e.target instanceof Element ? e.target : null;
      const scrollerEl = target?.closest<HTMLElement>(SCROLL_ALLOW_SELECTOR) ?? null;
      const block = shouldBlockTouchMove({
        touchCount: e.touches.length,
        scroller: scrollerEl
          ? {
              scrollTop: scrollerEl.scrollTop,
              scrollHeight: scrollerEl.scrollHeight,
              clientHeight: scrollerEl.clientHeight,
              scrollLeft: scrollerEl.scrollLeft,
              scrollWidth: scrollerEl.scrollWidth,
              clientWidth: scrollerEl.clientWidth,
            }
          : null,
        dx,
        dy,
        axis: parseScrollAxis(scrollerEl?.getAttribute(SCROLL_AXIS_ATTR)),
      });
      if (block && e.cancelable) e.preventDefault();
    };

    // iOS Safari pinch / rotate gestures.
    const onGesture = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };

    // Any document offset (address-bar bounce, rotation, focus jump) snaps back.
    const onScroll = () => {
      if (shouldResetDocumentScroll(window.scrollX, window.scrollY, isTyping())) {
        window.scrollTo(0, 0);
      }
    };
    const onViewportChange = () => {
      onScroll();
      window.setTimeout(onScroll, 350);
    };

    const nonPassive: AddEventListenerOptions = { passive: false };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, nonPassive);
    document.addEventListener("gesturestart", onGesture, nonPassive);
    document.addEventListener("gesturechange", onGesture, nonPassive);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("orientationchange", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportChange);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove, nonPassive);
      document.removeEventListener("gesturestart", onGesture, nonPassive);
      document.removeEventListener("gesturechange", onGesture, nonPassive);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("orientationchange", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("resize", onViewportChange);
      html.classList.remove(PLAY_LOCK_CLASS);
      body.classList.remove(PLAY_LOCK_CLASS);
      window.scrollTo(prevX, prevY);
    };
  }, [active]);
}
