"use client";

import { useEffect, useState } from "react";
import type { ActiveRound, Course, Lie, Player } from "@/lib/types";
import {
  getActiveTotalForPlayer,
  getActiveVsParForPlayer,
  getLiveStrokes,
  getPlayerScoreOnHole,
  getStartingHoleForRound,
  pickNextUnscoredPlayer,
} from "@/lib/activeRound";
import { LiveStrokeClicker } from "@/components/LiveStrokeClicker";
import { PlayCardOverlay } from "@/components/PlayCardOverlay";
import { QuitRoundModal } from "@/components/QuitRoundModal";
import { usePlaySurfaceLock } from "@/hooks/usePlaySurfaceLock";

export interface PlayHoleShellProps {
  activeRound: ActiveRound;
  course: Course;
  players: Player[];
  currentHole: number;
  holesInPlay: number[];
  formatLabel: string;
  manualScorePlayers: string[];
  onSetManual: (playerId: string, manual: boolean) => void;
  onIncrement: (playerId: string, lie?: Lie) => void;
  onDecrement: (playerId: string) => void;
  onPenalty: (playerId: string, lie?: Lie) => void;
  onHoleOut: (playerId: string) => void;
  onUpdateScore: (playerId: string, score: number) => void;
  onAdjustScore: (playerId: string, delta: number) => void;
  onSetToPar: (playerId: string) => void;
  onGoToHole: (hole: number) => void;
  /** Finish Round (Next on the last hole). */
  onFinish: () => void;
  /** Quit → Save and continue later: keep the round, park it on Home. */
  onPause: () => void;
  /** Quit → Start this round again (already confirmed in the modal). */
  onRestart: () => void;
  /** Quit → Quit and delete (already confirmed in the modal). */
  onDelete: () => void;
}

function formatVsPar(vsPar: number): string {
  if (vsPar === 0) return "E";
  return vsPar > 0 ? `+${vsPar}` : String(vsPar);
}

function vsParColor(vsPar: number): string {
  return vsPar < 0 ? "text-emerald-400" : vsPar > 0 ? "text-red-400" : "text-[#c5a36f]";
}

/**
 * The frozen hole screen. One fixed frame, exactly the screen (100dvh + safe
 * areas), with zero inner scroll: top bar, player chips (multiplayer), ONE
 * player's clicker, and a Prev / Next bottom bar. Leaderboard + per-hole grid
 * live behind the Card overlay. While mounted, html/body carry
 * `og-play-locked` and the document cannot scroll, pan, bounce, or pinch.
 */
export function PlayHoleShell({
  activeRound,
  course,
  players,
  currentHole,
  holesInPlay,
  formatLabel,
  manualScorePlayers,
  onSetManual,
  onIncrement,
  onDecrement,
  onPenalty,
  onHoleOut,
  onUpdateScore,
  onAdjustScore,
  onSetToPar,
  onGoToHole,
  onFinish,
  onPause,
  onRestart,
  onDelete,
}: PlayHoleShellProps) {
  usePlaySurfaceLock(true);

  const playerIds = activeRound.playerIds;
  const isMulti = playerIds.length > 1;
  const par = course.holes.find((h) => h.number === currentHole)?.par ?? 4;
  const holeIndex = holesInPlay.indexOf(currentHole);
  const isLastHole = holeIndex >= 0 && holeIndex === holesInPlay.length - 1;

  const scoreOn = (pid: string) => getPlayerScoreOnHole(activeRound, pid, currentHole);
  const firstUnscored = () => playerIds.find((pid) => scoreOn(pid) === null) ?? playerIds[0];

  const [selectedId, setSelectedId] = useState<string>(() => firstUnscored());
  const [cardOpen, setCardOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);

  // New hole → first player who still needs a score on it.
  useEffect(() => {
    setSelectedId(firstUnscored());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHole]);

  const activeId = playerIds.includes(selectedId) ? selectedId : playerIds[0];
  const activePlayer = players.find((p) => p.id === activeId);
  const activeName = activePlayer?.name ?? "Player";
  const committed = scoreOn(activeId);
  const liveCount = getLiveStrokes(activeRound, activeId, currentHole);
  const showManual = manualScorePlayers.includes(activeId);
  const total = getActiveTotalForPlayer(activeRound, course, activeId);
  const vsPar = getActiveVsParForPlayer(activeRound, course, activeId);

  const handleHoleOut = () => {
    onHoleOut(activeId);
    const next = pickNextUnscoredPlayer(
      playerIds,
      activeId,
      (pid) => pid === activeId || scoreOn(pid) !== null
    );
    if (next) setSelectedId(next);
  };

  const goPrev = () => {
    if (holeIndex > 0) onGoToHole(holesInPlay[holeIndex - 1]);
  };
  const goNext = () => {
    if (holeIndex >= 0 && holeIndex < holesInPlay.length - 1) onGoToHole(holesInPlay[holeIndex + 1]);
  };

  const handleRestart = () => {
    setQuitOpen(false);
    onRestart();
    // Same hole may stay current (restart from hole 1 on hole 1): reset explicitly.
    setSelectedId(playerIds[0]);
    setCardOpen(false);
  };

  return (
    <div
      className="og-play-shell bg-golf-cream text-golf-green-900 dark:bg-[#0f3d24] dark:text-golf-cream"
      data-play-root
    >
      {/* Top bar: course, hole, par, Card, Quit */}
      <header className="flex-none w-full max-w-xl mx-auto px-3 pt-[clamp(4px,1dvh,10px)] pb-[clamp(4px,1dvh,8px)] flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium tracking-wider text-[#c5a36f] truncate">
            {course.name} · {formatLabel}
          </div>
          <div className="flex items-baseline gap-2 leading-tight">
            <span className="text-[clamp(20px,3.6dvh,28px)] font-bold tabular-nums" data-control="hole-title">
              Hole {currentHole}
            </span>
            <span className="text-sm font-semibold px-2.5 py-px rounded-full bg-golf-green-100 dark:bg-[#1a4a2f] text-[#c5a36f]">
              Par {par}
            </span>
            {holeIndex >= 0 && (
              <span className="text-[11px] text-[#c5a36f]/70 tabular-nums">
                {holeIndex + 1}/{holesInPlay.length}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCardOpen(true)}
          data-control="card"
          className="shrink-0 h-[clamp(40px,6.5dvh,48px)] px-4 rounded-xl border-2 border-[#c5a36f] text-[#c5a36f] text-sm font-bold active:bg-[#c5a36f]/15"
        >
          Card
        </button>
        <button
          type="button"
          onClick={() => setQuitOpen(true)}
          data-control="quit"
          className="shrink-0 h-[clamp(40px,6.5dvh,48px)] px-3.5 rounded-xl border-2 border-red-400/60 text-red-400 text-sm font-bold active:bg-red-500/10"
        >
          Quit
        </button>
      </header>

      {/* Player chips (multiplayer): tap to switch whose clicker is shown */}
      {isMulti && (
        <div
          className="flex-none w-full max-w-xl mx-auto px-3 pb-[clamp(4px,1dvh,8px)] flex gap-[clamp(4px,1dvh,8px)]"
          role="tablist"
          aria-label="Players"
        >
          {playerIds.map((pid) => {
            const p = players.find((pl) => pl.id === pid);
            const selected = pid === activeId;
            const score = scoreOn(pid);
            const live = getLiveStrokes(activeRound, pid, currentHole);
            const state =
              score !== null ? `✓ ${score}` : live > 0 ? `Lying ${live}` : "—";
            return (
              <button
                key={pid}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSelectedId(pid)}
                data-control="player-chip"
                className={`flex-1 min-w-0 h-[clamp(40px,7dvh,56px)] rounded-xl border-2 px-1.5 flex flex-col items-center justify-center leading-tight transition ${
                  selected
                    ? "bg-[#c5a36f] text-[#051b14] border-[#c5a36f]"
                    : score !== null
                      ? "bg-white dark:bg-[#1f4a3a] border-[#c5a36f]/40 text-golf-green-900 dark:text-golf-cream"
                      : "bg-golf-green-50 dark:bg-[#153a2a] border-golf-green-100 dark:border-[#2a5a48]"
                }`}
              >
                <span className="max-w-full truncate text-[clamp(12px,1.9dvh,15px)] font-semibold">
                  {p?.name.split(" ")[0] ?? "Player"}
                </span>
                <span
                  className={`text-[11px] tabular-nums font-semibold ${
                    selected ? "text-[#051b14]/80" : score !== null ? vsParColor(score - par) : "text-[#c5a36f]/80"
                  }`}
                >
                  {state}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main: ONE player's clicker (or manual fallback). Never scrolls. */}
      <main className="flex-1 min-h-0 overflow-hidden w-full max-w-xl mx-auto px-3 flex flex-col justify-center">
        {showManual ? (
          <div className="w-full max-w-md mx-auto flex flex-col justify-center gap-[clamp(8px,1.8dvh,16px)]">
            <div className="text-center">
              <div className="text-sm font-semibold truncate">{activeName}</div>
              <div className="text-xs tracking-wider text-[#c5a36f]/80">MANUAL SCORE · HOLE {currentHole}</div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => onAdjustScore(activeId, -1)}
                className="score-btn"
                aria-label="Decrease score"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                value={committed ?? ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) onUpdateScore(activeId, val);
                }}
                onBlur={(e) => {
                  if (!e.target.value) onUpdateScore(activeId, par);
                }}
                placeholder={String(par)}
                aria-label="Hole score"
                className="score-input"
              />
              <button
                type="button"
                onClick={() => onAdjustScore(activeId, 1)}
                className="score-btn"
                aria-label="Increase score"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => onSetToPar(activeId)}
              className="w-full h-[clamp(48px,8dvh,64px)] rounded-2xl border-2 border-[#c5a36f] bg-white dark:bg-[#1f4a3a] active:bg-[#c5a36f] active:text-[#051b14] text-base font-bold text-[#c5a36f] transition"
            >
              Set to Par ({par})
            </button>
            <div className="flex items-center justify-between h-[clamp(28px,4dvh,36px)] px-1">
              <button
                type="button"
                onClick={() => onSetManual(activeId, false)}
                className="h-full text-sm text-[#c5a36f]/90 underline underline-offset-2"
              >
                Use stroke clicker
              </button>
              {committed !== null && (
                <span className={`text-sm font-semibold tabular-nums ${vsParColor(committed - par)}`}>
                  This hole: {formatVsPar(committed - par)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <LiveStrokeClicker
            key={`${activeId}-${currentHole}`}
            playerName={activeName}
            holeNumber={currentHole}
            par={par}
            liveCount={liveCount}
            committedScore={committed}
            onIncrement={(lie) => onIncrement(activeId, lie)}
            onDecrement={() => onDecrement(activeId)}
            onPenalty={(lie) => onPenalty(activeId, lie)}
            onHoleOut={handleHoleOut}
            onEditManual={() => onSetManual(activeId, true)}
            onManual={() => onSetManual(activeId, true)}
          />
        )}
      </main>

      {/* Bottom bar: Prev · selected player's totals · Next / Finish */}
      <footer className="flex-none w-full max-w-xl mx-auto px-3 pt-[clamp(4px,1dvh,8px)] pb-[clamp(6px,1.4dvh,12px)] grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={holeIndex <= 0}
          data-control="prev"
          className="h-[clamp(48px,8dvh,64px)] rounded-2xl border-2 border-golf-green-100 dark:border-[#2a5a48] text-[#c5a36f] text-lg font-bold active:bg-golf-green-50 dark:active:bg-[#1f4a3a] active:border-[#c5a36f] disabled:opacity-40 transition"
        >
          ← Prev
        </button>
        <div className="min-w-[76px] max-w-[110px] text-center leading-tight" data-control="totals">
          <div className="text-[10px] tracking-wider text-[#c5a36f]/80 truncate">
            {(activePlayer?.name.split(" ")[0] ?? "TOTAL").toUpperCase()}
          </div>
          <div className="text-lg font-bold tabular-nums">
            {total || "—"}
            <span className={`ml-1 text-sm ${vsParColor(vsPar)}`}>{total ? formatVsPar(vsPar) : ""}</span>
          </div>
        </div>
        {isLastHole ? (
          <button
            type="button"
            onClick={onFinish}
            data-control="next"
            className="h-[clamp(48px,8dvh,64px)] rounded-2xl border-2 border-[#c5a36f] bg-[#c5a36f] text-[#051b14] text-base font-bold active:opacity-90 transition leading-tight"
          >
            Finish Round
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={holeIndex < 0}
            data-control="next"
            className="h-[clamp(48px,8dvh,64px)] rounded-2xl border-2 border-golf-green-100 dark:border-[#2a5a48] text-[#c5a36f] text-lg font-bold active:bg-golf-green-50 dark:active:bg-[#1f4a3a] active:border-[#c5a36f] disabled:opacity-40 transition"
          >
            Next →
          </button>
        )}
      </footer>

      <QuitRoundModal
        open={quitOpen}
        courseName={course.name}
        currentHole={currentHole}
        startingHole={getStartingHoleForRound(course, activeRound)}
        onClose={() => setQuitOpen(false)}
        onSaveForLater={() => {
          setQuitOpen(false);
          onPause();
        }}
        onRestart={handleRestart}
        onDelete={() => {
          setQuitOpen(false);
          onDelete();
        }}
      />

      {cardOpen && (
        <PlayCardOverlay
          activeRound={activeRound}
          course={course}
          players={players}
          holesInPlay={holesInPlay}
          currentHole={currentHole}
          onClose={() => setCardOpen(false)}
          onJumpToHole={(hole) => {
            onGoToHole(hole);
            setCardOpen(false);
          }}
        />
      )}
    </div>
  );
}
