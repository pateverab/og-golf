"use client";

import { useLayoutEffect, useRef } from "react";
import type { ActiveRound, Course } from "@/lib/types";
import { getLiveStrokes, getPlayerScoreOnHole } from "@/lib/activeRound";
import { buildHoleStrip } from "@/lib/holeStrip";
import { MarkedScore } from "@/components/MarkedScore";

interface HoleSummaryStripProps {
  activeRound: ActiveRound;
  course: Course;
  holesInPlay: number[];
  currentHole: number;
  playerId: string;
  onJumpToHole: (hole: number) => void;
}

/**
 * Top hole-summary strip for the selected player. Default window is the
 * three previous holes with "now" at the right edge; swipe sideways to see
 * earlier / later holes. It is the only horizontal finger scroller on the
 * hole screen (data-og-scroll="1" + axis x, so the document lock lets it
 * move while still blocking any page pan / rubber-band). Tapping a cell only
 * changes the current hole, like Prev / Next — it never holes out.
 */
export function HoleSummaryStrip({
  activeRound,
  course,
  holesInPlay,
  currentHole,
  playerId,
  onJumpToHole,
}: HoleSummaryStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { padCount, holes } = buildHoleStrip(holesInPlay, currentHole);

  // Park "now" at the right edge whenever the hole changes.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cell = scroller.querySelector<HTMLElement>('[data-strip-now="1"]');
    if (!cell) return;
    scroller.scrollLeft = Math.max(0, cell.offsetLeft + cell.offsetWidth - scroller.clientWidth);
  }, [currentHole, holesInPlay.length]);

  const parFor = (hole: number) => course.holes.find((h) => h.number === hole)?.par ?? 4;

  return (
    <div className="flex-none w-full max-w-xl mx-auto px-3 pb-[clamp(4px,1dvh,8px)]">
      <div
        ref={scrollerRef}
        data-og-scroll="1"
        data-og-scroll-axis="x"
        data-control="hole-strip"
        aria-label="Holes"
        className="og-hole-strip flex gap-1.5 h-[clamp(60px,11dvh,78px)]"
      >
        {Array.from({ length: padCount }, (_, i) => (
          <div
            key={`pad-${i}`}
            aria-hidden="true"
            className="og-strip-cell rounded-xl border border-dashed border-og-border/60"
          />
        ))}
        {holes.map((hole) => {
          const par = parFor(hole);
          const isNow = hole === currentHole;
          const score = getPlayerScoreOnHole(activeRound, playerId, hole);
          const live = score === null ? getLiveStrokes(activeRound, playerId, hole) : 0;
          return (
            <button
              key={hole}
              type="button"
              onClick={() => onJumpToHole(hole)}
              data-control="strip-cell"
              data-hole={hole}
              data-strip-now={isNow ? "1" : undefined}
              aria-current={isNow ? "true" : undefined}
              aria-label={`Hole ${hole}, par ${par}${score !== null ? `, scored ${score}` : live > 0 ? `, ${live} in play` : ""}`}
              className={`og-strip-cell rounded-xl border-2 px-1.5 py-1 flex flex-col justify-between leading-none transition active:scale-[0.97] ${
                isNow
                  ? "border-og-accent-line bg-og-now-bg"
                  : "border-og-border bg-og-surface"
              }`}
            >
              <span className="flex items-center justify-between gap-1 w-full">
                <span className="text-[clamp(13px,2.2dvh,16px)] font-bold tabular-nums">{hole}</span>
                {isNow ? (
                  <span className="text-[9px] font-extrabold tracking-wider px-1 py-0.5 rounded bg-og-accent text-og-on-accent">
                    NOW
                  </span>
                ) : null}
                <span className="text-[10px] font-semibold text-og-muted tabular-nums">P{par}</span>
              </span>
              <span className="flex items-center justify-center w-full text-[clamp(14px,2.4dvh,17px)] tabular-nums min-h-[24px]">
                {score !== null ? (
                  <MarkedScore score={score} par={par} size={24} />
                ) : live > 0 ? (
                  <span className="flex items-center gap-1" data-strip-live="1">
                    <span className="font-bold">{live}</span>
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-og-live tracking-wide">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-og-live animate-pulse" aria-hidden="true" />
                      in play
                    </span>
                  </span>
                ) : (
                  <span className="text-og-muted">—</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
