"use client";

import React, { useEffect, useState } from "react";
import { useGolfStore } from "@/hooks/useGolfStore";
import {
  withUpdatedHoleScore,
  isActiveRoundFullyScored as readIsActiveRoundFullyScored,
  withRecordedLiveStroke,
  withUndoLastLiveStroke,
  withHoleOut,
  withClearedLiveStrokesForHole,
  withRestartedRound,
  withoutIncompleteDraft,
  getStartingHoleForRound,
} from "@/lib/activeRound";
import {
  Course,
  Player,
  Round,
  ActiveRound,
  PlayerRoundScore,
  HoleScore,
  NineSide,
  RoundLength,
  Lie,
  TeeGender,
} from "@/lib/types";
import { clearActiveRound as clearStoredActiveRound } from "@/lib/storage";
import { clearCartLock } from "@/lib/cartLock";
import { optionPillClass, optionSubtextClass, optionTileClass } from "@/lib/selectable";
import {
  withRecalculatedIndexes,
  recalculateAllHandicaps,
  getTotalScoreForPlayerInRound,
  getScoreVsParForPlayerInRound,
  getCourseTotalPar,
  getDefaultRoundConfig,
  getHolesInPlay,
  getRoundFormatLabel,
  is18HoleCourse,
  normalizeRoundConfig,
  playerUsesStartingHandicap,
} from "@/lib/calculations";
import { Modal } from "@/components/Modal";
import { CourseForm } from "@/components/CourseForm";
import { PlayerForm } from "@/components/PlayerForm";
import { PlayerDetailModal } from "@/components/PlayerDetailModal";
import { generateId } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PlayerStatsView } from "@/components/PlayerStatsView";
import { PlayHoleShell } from "@/components/PlayHoleShell";
import { QuitRoundModal } from "@/components/QuitRoundModal";
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import { canAddStroke } from "@/lib/lies";
import { RoundExportPanel } from "@/components/RoundExportPanel";
import { MULTIPLAYER_ENABLED } from "@/lib/features";
import {
  formatTeeLabel,
  migrateCourses,
  pickInitialTee,
  readLastTees,
  snapshotTee,
  teeRatingFor,
  writeLastTee,
} from "@/lib/tees";
import {
  createSinglePlayerRound,
  focusPlayerIdForRound,
  isRoundFullyScoredFor,
  readStoredMeId,
  requiredPlayerIds,
  resolveMePlayerId,
  roundFocusedOnPlayer,
  writeStoredMeId,
} from "@/lib/me";
import {
  getTestDataSuccessMessage,
  hasTestDataLoaded,
  mergeTestData,
} from "@/lib/testData";
export default function GolfScoreTracker() {
  const {
    courses,
    setCourses,
    players,
    setPlayers,
    rounds,
    setRounds,
    activeRound,
    setActiveRound,
    currentHole,
    setCurrentHole,
    storageHydrated,
    restoredActiveRound,
    roundPaused,
    setRoundPaused,
  } = useGolfStore();

  // UI state
  const [activeTab, setActiveTab] = useState<"home" | "rounds" | "stats">("home");
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [isStartRoundModalOpen, setIsStartRoundModalOpen] = useState(false);
  /** playerIds showing manual +/- instead of live clicker for current hole */
  const [manualScorePlayers, setManualScorePlayers] = useState<string[]>([]);
  /** Quit modal opened from the Home resume banner (the hole screen has its own). */
  const [homeQuitOpen, setHomeQuitOpen] = useState(false);

  useEffect(() => {
    setManualScorePlayers([]);
  }, [currentHole]);

  const [selectedCourseForStart, setSelectedCourseForStart] = useState<string>("");
  const [teeIdForStart, setTeeIdForStart] = useState<string | null>(null);
  const [teeGenderForStart, setTeeGenderForStart] = useState<TeeGender>("men");
  const [selectedPlayersForStart, setSelectedPlayersForStart] = useState<string[]>([]);
  const [roundLengthForStart, setRoundLengthForStart] = useState<RoundLength>(18);
  const [nineSideForStart, setNineSideForStart] = useState<NineSide>("front");
  const [startingHoleForStart, setStartingHoleForStart] = useState<1 | 10>(1);
  // ==================== ME (single-player mode) ====================
  // One "Me" profile plays every new round. Resolved once after storage
  // hydrates (stored id → player named Patricio → most rounds → first player)
  // and re-resolved if Me disappears (e.g. a backup import replaced players).
  const [meId, setMeId] = useState<string | null>(null);
  useEffect(() => {
    if (!storageHydrated) return;
    const resolved = resolveMePlayerId(players, rounds, meId ?? readStoredMeId());
    if (resolved !== meId) setMeId(resolved);
    writeStoredMeId(resolved);
  }, [storageHydrated, players, rounds, meId]);
  const me = players.find((p) => p.id === meId) ?? null;
  const singlePlayer = !MULTIPLAYER_ENABLED;

  // Keep every player's index in step with rounds/courses: covers finishing,
  // editing and deleting rounds, course edits and backup imports. A no-op
  // (same array) when nothing changed, so it can't loop.
  useEffect(() => {
    if (!storageHydrated) return;
    setPlayers((prev) => recalculateAllHandicaps(prev, rounds, courses));
  }, [storageHydrated, rounds, courses, setPlayers]);

  // Past round detail
  const [viewingRoundId, setViewingRoundId] = useState<string | null>(null);

  // Player detail modal in round view
  const [playerDetailModal, setPlayerDetailModal] = useState<{ playerId: string; roundId: string } | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // If hydrate restored an in-progress round, land on the rounds tab once.
  useEffect(() => {
    // After an explicit "Save and continue later" the app opens on Home with the
    // resume banner; a plain mid-round relaunch goes straight back to the hole.
    if (restoredActiveRound) {
      setActiveTab(roundPaused ? "home" : "rounds");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoredActiveRound]);

  // Keep the resume banner in view: after "Save and continue later" (or a
  // relaunch into a saved round) Home starts at the top, and the browser's
  // reload scroll restoration can't push the banner off-screen.
  useEffect(() => {
    if (!roundPaused || typeof window === "undefined") return;
    const hasRestoration = "scrollRestoration" in window.history;
    if (hasRestoration) window.history.scrollRestoration = "manual";
    const toTop = () => window.scrollTo(0, 0);
    toTop();
    const timers = [window.setTimeout(toTop, 100), window.setTimeout(toTop, 350)];
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      if (hasRestoration) window.history.scrollRestoration = "auto";
    };
  }, [roundPaused]);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    const isIOS =
      /iPad|iPhone|iPod/.test(nav.userAgent) ||
      (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
    setShowInstallButton(isIOS && !isStandalone);
  }, []);

  // ==================== COURSES ====================
  const openAddCourseModal = () => {
    setEditingCourseId(null);
    setIsCourseModalOpen(true);
  };

  const openEditCourseModal = (courseId: string) => {
    setEditingCourseId(courseId);
    setIsCourseModalOpen(true);
  };

  const closeCourseModal = () => {
    setIsCourseModalOpen(false);
    setEditingCourseId(null);
  };

  const handleSaveCourse = (courseData: Omit<Course, "id" | "createdAt">) => {
    if (editingCourseId) {
      setCourses((prev) =>
        prev.map((c) => (c.id === editingCourseId ? { ...c, ...courseData } : c))
      );
    } else {
      const newCourse: Course = {
        ...courseData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setCourses((prev) => [...prev, newCourse]);
    }
    closeCourseModal();
  };

  const handleDeleteCourse = (courseId: string) => {
    if (!confirm("Delete this course? Existing rounds will keep a reference.")) return;
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  // ==================== PLAYERS ====================
  const openAddPlayerModal = () => {
    setEditingPlayerId(null);
    setIsPlayerModalOpen(true);
  };

  const openEditPlayerModal = (playerId: string) => {
    setEditingPlayerId(playerId);
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsPlayerModalOpen(false);
    setEditingPlayerId(null);
  };

  const handleSavePlayer = (
    name: string,
    nickname: string,
    startingHandicap: number,
    gender: TeeGender = "men"
  ) => {
    if (editingPlayerId) {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== editingPlayerId) return p;
          const edited: Player = {
            ...p,
            name,
            nickname: nickname || undefined,
            startingHandicap,
            gender,
            updatedAt: new Date().toISOString(),
          };
          // WHS Index if 3+ tee'd rounds, else the legacy OG value (both stored).
          return withRecalculatedIndexes(edited, rounds, courses);
        })
      );
    } else {
      const newPlayer: Player = {
        id: generateId(),
        name,
        nickname: nickname || undefined,
        handicap: startingHandicap,
        startingHandicap,
        gender,
        updatedAt: new Date().toISOString(),
      };
      setPlayers((prev) => [...prev, newPlayer]);
    }
    closePlayerModal();
  };

  const handleDeletePlayer = (playerId: string) => {
    if (!confirm("Delete this player? Their past rounds will remain.")) return;
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  // ==================== START NEW ROUND ====================
  const openStartRoundModal = () => {
    setSelectedCourseForStart("");
    setTeeIdForStart(null);
    setSelectedPlayersForStart([]);
    setRoundLengthForStart(18);
    setNineSideForStart("front");
    setStartingHoleForStart(1);
    setIsStartRoundModalOpen(true);
  };

  const selectCourseForStart = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const defaults = getDefaultRoundConfig(course);
    setSelectedCourseForStart(courseId);
    // Tee: last one used on this course, else the first rated for my gender.
    const last = readLastTees();
    const gender = last[courseId]?.gender ?? me?.gender ?? "men";
    setTeeGenderForStart(gender);
    setTeeIdForStart(pickInitialTee(course, gender, last));
    setRoundLengthForStart(defaults.roundLength);
    setNineSideForStart(defaults.nineSide);
    setStartingHoleForStart(defaults.startingHole);
  };

  const setTeeGenderForStartRound = (gender: TeeGender) => {
    setTeeGenderForStart(gender);
    const course = courses.find((c) => c.id === selectedCourseForStart);
    if (!course) return;
    const current = course.tees?.find((t) => t.id === teeIdForStart);
    if (!current || !teeRatingFor(current, gender)) {
      setTeeIdForStart(pickInitialTee(course, gender, readLastTees()));
    }
  };

  /** Tee snapshot for the round being started (undefined = legacy, no tee). */
  const teeSnapshotForStart = (course: Course) => {
    if (!teeIdForStart) return undefined;
    const snap = snapshotTee(course, teeIdForStart, teeGenderForStart);
    if (!snap) return undefined;
    writeLastTee(course.id, snap.teeId, snap.gender);
    return snap;
  };
  const startCourseNeedsTee = (() => {
    const c = courses.find((cc) => cc.id === selectedCourseForStart);
    return Boolean(c?.tees?.some((t) => teeRatingFor(t, teeGenderForStart)));
  })();

  const setNineSideForStartRound = (side: NineSide) => {
    setNineSideForStart(side);
    setStartingHoleForStart(side === "back" ? 10 : 1);
  };

  const togglePlayerForRound = (playerId: string) => {
    setSelectedPlayersForStart((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const startRound = () => {
    if (singlePlayer) {
      const course = courses.find((c) => c.id === selectedCourseForStart);
      if (!course || !meId) return;
      const { round, firstHole } = createSinglePlayerRound(
        course,
        meId,
        { roundLength: roundLengthForStart, nineSide: nineSideForStart, startingHole: startingHoleForStart },
        { id: generateId() }
      );
      const tee = teeSnapshotForStart(course);
      setActiveRound(tee ? { ...round, tee } : round);
      setRoundPaused(false);
      setCurrentHole(firstHole);
      setIsStartRoundModalOpen(false);
      setActiveTab("rounds");
      return;
    }
    if (!selectedCourseForStart || selectedPlayersForStart.length === 0) return;

    const course = courses.find((c) => c.id === selectedCourseForStart)!;
    const initialScores: Record<string, HoleScore[]> = {};

    selectedPlayersForStart.forEach((pid) => {
      initialScores[pid] = [];
    });

    const roundConfig = normalizeRoundConfig(course, {
      roundLength: roundLengthForStart,
      nineSide: nineSideForStart,
      startingHole: startingHoleForStart,
    });
    const holesInPlay = getHolesInPlay(course, roundConfig);

    const newActiveRound: ActiveRound = {
      id: generateId(),
      courseId: selectedCourseForStart,
      playerIds: selectedPlayersForStart,
      scores: initialScores,
      startTime: new Date().toISOString(),
      roundLength: roundConfig.roundLength,
      nineSide: roundConfig.nineSide,
      startingHole: roundConfig.startingHole,
    };
    const tee = teeSnapshotForStart(course);
    if (tee) newActiveRound.tee = tee;

    setActiveRound(newActiveRound);
    setRoundPaused(false);
    setCurrentHole(holesInPlay[0] ?? 1);
    setIsStartRoundModalOpen(false);
    setActiveTab("rounds"); // Switch to rounds view
  };

  // ==================== SCORE ENTRY ====================
  const getCurrentCourse = () => {
    if (!activeRound) return null;
    return courses.find((c) => c.id === activeRound.courseId) || null;
  };

  /** Manual / committed score write — also clears any mid-hole live taps for that hole. */
  const updateScore = (playerId: string, holeNumber: number, newScore: number) => {
    if (!activeRound) return;
    setActiveRound((prev) => {
      if (!prev) return prev;
      const scored = withUpdatedHoleScore(prev, playerId, holeNumber, newScore);
      return withClearedLiveStrokesForHole(scored, playerId, holeNumber);
    });
  };


  const adjustScore = (playerId: string, holeNumber: number, delta: number) => {
    if (!activeRound) return;

    // Use the actual par for this hole as the starting point when no score exists yet.
    // This fixes the bug where Par 3 holes would start at 4 and +1 would jump to 5.
    const course = courses.find((c) => c.id === activeRound.courseId);
    const holePar = course?.holes.find((h) => h.number === holeNumber)?.par ?? 4;

    const current = activeRound.scores[playerId]?.find((s) => s.holeNumber === holeNumber)?.score ?? holePar;
    updateScore(playerId, holeNumber, current + delta);
  };

  const incrementLiveStroke = (playerId: string, holeNumber: number, lie?: Lie) => {
    // +1 Stroke always carries a lie (Penalty / Undo / Hole Out never need one).
    if (!canAddStroke(lie)) return;
    setActiveRound((prev) =>
      prev ? withRecordedLiveStroke(prev, playerId, holeNumber, { lie }) : prev
    );
  };

  const decrementLiveStroke = (playerId: string, holeNumber: number) => {
    setActiveRound((prev) =>
      prev ? withUndoLastLiveStroke(prev, playerId, holeNumber) : prev
    );
  };

  const penaltyLiveStroke = (playerId: string, holeNumber: number, lie?: Lie) => {
    setActiveRound((prev) =>
      prev
        ? withRecordedLiveStroke(prev, playerId, holeNumber, {
            lie,
            penalty: true,
          })
        : prev
    );
  };

  /** Commit live taps → HoleScore; advance when every required player (just Me
   *  in single-player mode) has this hole scored. */
  const holeOutLiveStroke = (playerId: string, holeNumber: number) => {
    setActiveRound((prev) => {
      if (!prev) return prev;
      const next = withHoleOut(prev, playerId, holeNumber);
      const course = courses.find((c) => c.id === next.courseId);
      if (course) {
        const holes = getHolesInPlay(course, next);
        const allScored = requiredPlayerIds(next, meId, MULTIPLAYER_ENABLED).every((pid) =>
          (next.scores[pid] || []).some((s) => s.holeNumber === holeNumber)
        );
        if (allScored) {
          const idx = holes.indexOf(holeNumber);
          if (idx >= 0 && idx < holes.length - 1) {
            // Schedule hole advance outside this updater to avoid nested setState quirks.
            queueMicrotask(() => setCurrentHole(holes[idx + 1]));
          }
        }
      }
      return next;
    });
  };

  const setScoreToPar = (playerId: string, holeNumber: number, par: number) => {
    updateScore(playerId, holeNumber, par);
  };

  const isActiveRoundFullyScored = (): boolean => {
    if (!activeRound) return false;
    const course = getCurrentCourse();
    if (!course) return false;
    if (singlePlayer) {
      return isRoundFullyScoredFor(activeRound, course, requiredPlayerIds(activeRound, meId, false));
    }
    return readIsActiveRoundFullyScored(activeRound, course);
  };


  // Save current active round (can be partial). Upserts by ActiveRound.id so
  // "Save & Continue Later" updates one draft instead of spawning duplicates.
  const saveActiveRound = (markComplete: boolean) => {
    if (!activeRound) return;

    const course = getCurrentCourse();
    if (!course) return;

    // Gate Finish: do not mark completed (or count toward OG index) unless all holes are scored
    if (markComplete && !isActiveRoundFullyScored()) {
      const holesInPlay = getHolesInPlay(course, activeRound);
      const missing: string[] = [];
      for (const pid of requiredPlayerIds(activeRound, meId, MULTIPLAYER_ENABLED)) {
        const player = players.find((p) => p.id === pid);
        const name = player?.name ?? "Player";
        const scored = new Set((activeRound.scores[pid] || []).map((s) => s.holeNumber));
        const missingHoles = holesInPlay.filter((h) => !scored.has(h));
        if (missingHoles.length > 0) {
          missing.push(`${name}: hole${missingHoles.length === 1 ? "" : "s"} ${missingHoles.join(", ")}`);
        }
      }
      alert(
        (singlePlayer
          ? "Finish Round requires your score on every hole in play.\n\n"
          : "Finish Round requires a score for every hole in play for every player.\n\n") +
          "Missing scores:\n" +
          missing.join("\n") +
          "\n\nEnter the remaining scores, or use Save & Continue Later."
      );
      return;
    }

    // Convert active round to saved round format
    const playerScores: PlayerRoundScore[] = activeRound.playerIds.map((pid) => ({
      playerId: pid,
      scores: [...(activeRound.scores[pid] || [])],
    }));

    const existing = rounds.find((r) => r.id === activeRound.id);
    const savedRound: Round = {
      id: activeRound.id,
      courseId: activeRound.courseId,
      date: activeRound.startTime,
      playerScores,
      completed: markComplete,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      roundLength: activeRound.roundLength,
      nineSide: activeRound.nineSide,
      startingHole: activeRound.startingHole,
      ...(activeRound.tee ? { tee: activeRound.tee } : {}),
    };

    const updatedRounds = existing
      ? rounds.map((r) => (r.id === savedRound.id ? savedRound : r))
      : [...rounds, savedRound];
    setRounds(updatedRounds);

    // If completing the round, recalculate OG index (preserves starting HCP for players with 0 qualifying rounds)
    if (markComplete) {
      const updatedPlayers = recalculateAllHandicaps(players, updatedRounds, courses);
      setPlayers(updatedPlayers);
    }

    // Clear active round (also clears golf_active_round via persist effect)
    setActiveRound(null);
    setCurrentHole(1);
    clearStoredActiveRound();
    clearCartLock();
    setActiveTab("home");
  };

  // ==================== QUIT (hole screen / resume banner) ====================
  /** Save and continue later: keep the ActiveRound (not completed, nothing added
   *  to history or stats) and park it on Home behind the resume banner. */
  const pauseActiveRound = () => {
    if (!activeRound) return;
    setRoundPaused(true);
    setManualScorePlayers([]);
    setActiveTab("home");
  };

  const resumePausedRound = () => {
    setHomeQuitOpen(false);
    setRoundPaused(false);
  };

  /** Start this round again (confirmed in the Quit modal). Same id — see withRestartedRound. */
  const restartActiveRound = () => {
    if (!activeRound) return;
    const course = getCurrentCourse();
    if (!course) return;
    const restarted = withRestartedRound(activeRound, course);
    clearCartLock();
    // An older incomplete draft of this round (same id) would still hold the
    // wiped scores; drop it so history can't resurrect them.
    const roundId = activeRound.id;
    setRounds((prev) => withoutIncompleteDraft(prev, roundId));
    setActiveRound(restarted.round);
    setCurrentHole(restarted.currentHole);
    setManualScorePlayers([]);
    setHomeQuitOpen(false);
    setRoundPaused(false);
  };

  /** Quit and delete (confirmed in the Quit modal): no active round, no draft, no banner. */
  const deleteActiveRound = () => {
    if (!activeRound) return;
    const roundId = activeRound.id;
    setRounds((prev) => withoutIncompleteDraft(prev, roundId));
    setActiveRound(null);
    setCurrentHole(1);
    setRoundPaused(false);
    setManualScorePlayers([]);
    setHomeQuitOpen(false);
    clearStoredActiveRound();
    clearCartLock();
    setActiveTab("home");
  };

  // Resume an incomplete history round into the live scorer (same Round id)
  const resumeIncompleteRound = (roundId: string) => {
    if (activeRound) {
      if (activeRound.id === roundId) {
        resumePausedRound();
        setViewingRoundId(null);
        return;
      }
      alert("Resume or quit the round in progress before resuming another.");
      return;
    }

    const round = rounds.find((r) => r.id === roundId);
    if (!round || round.completed) return;

    const course = courses.find((c) => c.id === round.courseId);
    if (!course) {
      alert("Course for this round is missing.");
      return;
    }

    const defaults = getDefaultRoundConfig(course);
    const roundConfig = {
      roundLength: round.roundLength ?? defaults.roundLength,
      nineSide: round.nineSide ?? defaults.nineSide,
      startingHole: round.startingHole ?? defaults.startingHole,
    };

    const playerIds = round.playerScores.map((ps) => ps.playerId);
    const scores: Record<string, HoleScore[]> = {};
    round.playerScores.forEach((ps) => {
      scores[ps.playerId] = [...ps.scores];
    });

    const resumed: ActiveRound = {
      id: round.id,
      courseId: round.courseId,
      playerIds,
      scores,
      startTime: round.date,
      roundLength: roundConfig.roundLength,
      nineSide: roundConfig.nineSide,
      startingHole: roundConfig.startingHole,
      ...(round.tee ? { tee: round.tee } : {}),
    };

    const holesInPlay = getHolesInPlay(course, resumed);
    const mustScore = requiredPlayerIds(resumed, meId, MULTIPLAYER_ENABLED);
    const firstUnscored =
      holesInPlay.find((h) => !mustScore.every((pid) => (scores[pid] || []).some((s) => s.holeNumber === h))) ??
      holesInPlay[holesInPlay.length - 1] ??
      roundConfig.startingHole;

    setActiveRound(resumed);
    setCurrentHole(firstUnscored);
    setViewingRoundId(null);
    setActiveTab("rounds");
  };

  // ==================== VIEW PAST ROUND ====================
  const viewingRound = rounds.find((r) => r.id === viewingRoundId);
  const viewingCourse = viewingRound ? courses.find((c) => c.id === viewingRound.courseId) : null;

  // ==================== BACKUP & RESTORE ====================
  const exportBackup = () => {
    const backup = {
      courses,
      players,
      rounds,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `og-golf-backup-${new Date().toISOString().slice(0,10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleLoadTestData = () => {
    if (activeRound) return;

    if (hasTestDataLoaded(players)) {
      alert("Test data is already loaded.");
      return;
    }

    const result = mergeTestData(courses, players, rounds);
    if (!result.added) return;

    setCourses(result.courses);
    setPlayers(result.players);
    setRounds(result.rounds);
    alert(`✅ ${getTestDataSuccessMessage()}`);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);

        const confirmed = window.confirm(
          "Importing this backup will replace your current courses, players, and rounds. Continue?"
        );
        if (!confirmed) {
          e.target.value = "";
          return;
        }

        // Old backups have no tees / stroke indexes: seed known courses the same way as on load.
        if (backup.courses) setCourses(migrateCourses(backup.courses).courses);
        if (backup.players) setPlayers(backup.players);
        if (backup.rounds) setRounds(backup.rounds);

        alert("✅ Backup imported successfully!");
        e.target.value = "";
      } catch (err) {
        alert("❌ Invalid backup file");
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // ==================== DERIVED DATA ====================
  const completedRounds = rounds.filter((r) => r.completed);

  // Sorted courses (newest first)
  const sortedCourses = [...courses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Sorted players by current OG index (best first)
  const sortedPlayers = [...players].sort((a, b) => a.handicap - b.handicap);

  // Recent completed rounds for homepage
  const recentRounds = [...completedRounds]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  /** Right-hand side of a round row: Me's score in single-player mode. */
  const roundSummaryRight = (round: Round) => {
    if (!singlePlayer) return <>{round.playerScores.length} players</>;
    const c = courses.find((cc) => cc.id === round.courseId);
    const mine = meId ? round.playerScores.find((ps) => ps.playerId === meId) : undefined;
    const others = round.playerScores.length - (mine ? 1 : 0);
    const othersLine =
      others > 0 ? (
        <span className="block text-[11px] text-og-muted" data-control="round-others">
          {mine ? `with ${others} other${others === 1 ? "" : "s"} · read-only` : `${others} player${others === 1 ? "" : "s"} · read-only`}
        </span>
      ) : null;
    if (!mine || !c) {
      return (
        <span data-control="round-my-score">
          <span className="block text-og-muted">{mine ? "—" : "You didn't play"}</span>
          {othersLine}
        </span>
      );
    }
    const total = getTotalScoreForPlayerInRound(mine, c);
    const vs = getScoreVsParForPlayerInRound(mine, c);
    return (
      <span data-control="round-my-score">
        <span className="font-semibold tabular-nums text-og-text">{total || "—"}</span>
        {total > 0 && (
          <span className={`ml-1.5 font-medium ${vs < 0 ? "text-og-success" : vs > 0 ? "text-og-danger" : ""}`}>
            {vs === 0 ? "E" : vs > 0 ? `+${vs}` : vs}
          </span>
        )}
        {othersLine}
      </span>
    );
  };

  // ==================== RENDER ====================
  const currentCourseForActiveRound = getCurrentCourse();
  const activeHolesInPlay =
    activeRound && currentCourseForActiveRound
      ? getHolesInPlay(currentCourseForActiveRound, activeRound)
      : [];
  const activeRoundFormatLabel =
    activeRound && currentCourseForActiveRound
      ? getRoundFormatLabel(currentCourseForActiveRound, activeRound)
      : "";

  const isPlaySurfaceActive = Boolean(activeRound && currentCourseForActiveRound && !roundPaused);
  useScreenWakeLock(isPlaySurfaceActive);

  // ========== ACTIVE ROUND: the frozen hole screen is the ONLY thing rendered ==========
  // No header tabs, install CTA, leaderboard, scorecard, export, or footer sits
  // under / behind it. PlayHoleShell locks html/body while mounted.
  if (activeRound && currentCourseForActiveRound && !roundPaused) {
    const holeParFor = (hole: number) =>
      currentCourseForActiveRound.holes.find((h) => h.number === hole)?.par ?? 4;
    return (
      <PlayHoleShell
        activeRound={activeRound}
        course={currentCourseForActiveRound}
        players={players}
        currentHole={currentHole}
        holesInPlay={activeHolesInPlay}
        formatLabel={activeRoundFormatLabel}
        manualScorePlayers={manualScorePlayers}
        onSetManual={(playerId, manual) =>
          setManualScorePlayers((prev) =>
            manual
              ? prev.includes(playerId)
                ? prev
                : [...prev, playerId]
              : prev.filter((id) => id !== playerId)
          )
        }
        onIncrement={(playerId, lie) => incrementLiveStroke(playerId, currentHole, lie)}
        onDecrement={(playerId) => decrementLiveStroke(playerId, currentHole)}
        onPenalty={(playerId, lie) => penaltyLiveStroke(playerId, currentHole, lie)}
        onHoleOut={(playerId) => holeOutLiveStroke(playerId, currentHole)}
        onUpdateScore={(playerId, score) => updateScore(playerId, currentHole, score)}
        onAdjustScore={(playerId, delta) => adjustScore(playerId, currentHole, delta)}
        onSetToPar={(playerId) => setScoreToPar(playerId, currentHole, holeParFor(currentHole))}
        onGoToHole={(hole) => setCurrentHole(hole)}
        onFinish={() => saveActiveRound(true)}
        onPause={pauseActiveRound}
        onRestart={restartActiveRound}
        onDelete={deleteActiveRound}
        focusPlayerId={focusPlayerIdForRound(activeRound, meId)}
      />
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Top Navigation / Header */}
      <header className="sticky top-0 z-40 bg-og-surface/95 backdrop-blur border-b border-og-divider">
        <div className="max-w-4xl mx-auto px-5 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
          <div className="order-1 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-og-accent flex items-center justify-center">
              <span className="text-og-on-accent text-xl font-bold">⛳</span>
            </div>
            <div>
              <div className="font-semibold text-2xl tracking-tight whitespace-nowrap">OG Golf</div>
              <div className="text-[10px] text-og-muted -mt-1 whitespace-nowrap">PRIVATE • FAST • SIMPLE</div>
            </div>
          </div>

          <div className="hidden sm:block sm:order-2">
            <div className="saved-indicator">
              <span className="inline-block w-1.5 h-1.5 bg-og-success rounded-full animate-pulse" />
              Saved locally
            </div>
          </div>

          {/* Clubhouse / Sunlight: next to the logo on phones, at the end of the row on wider screens. */}
          <div className="order-2 sm:order-4">
            <ThemeToggle />
          </div>

          <div className="order-3 w-full sm:w-auto flex gap-1 text-sm">
              <button
                onClick={() => setActiveTab("home")}
                className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-full transition ${optionPillClass(activeTab === "home")} ${activeTab === "home" ? "font-semibold" : ""}`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab("rounds")}
                className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-full transition ${optionPillClass(activeTab === "rounds")} ${activeTab === "rounds" ? "font-semibold" : ""}`}
              >
                Rounds
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-full transition ${optionPillClass(activeTab === "stats")} ${activeTab === "stats" ? "font-semibold" : ""}`}
              >
                Stats
              </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 pt-6">
                {/* Install on iPhone — only when iOS Safari and not already standalone */}
        {showInstallButton && (
          <button
            onClick={() => {
              alert("📱 How to install OG Golf on your iPhone:\n\n" +
                    "1. Tap the Share button (📤) at the bottom\n" +
                    "2. Scroll down and tap 'Add to Home Screen'\n" +
                    "3. Tap 'Add'");
            }}
            className="w-full mb-6 py-4 bg-og-accent hover:bg-og-accent-hover text-og-on-accent font-semibold rounded-3xl text-lg flex items-center justify-center gap-2 transition shadow-lg"
          >
            📱 Install OG Golf on iPhone
          </button>
        )}
        {/* ========== RESUME BANNER (round saved for later) ========== */}
        {activeRound && roundPaused && (
          <div
            data-control="resume-banner"
            className="golf-card rounded-3xl p-5 mb-6 border-2 border-og-accent-line"
          >
            <div className="flex items-center gap-2 text-[11px] tracking-[2px] font-semibold text-og-accent-text">
              <span className="inline-block w-2 h-2 bg-og-live rounded-full" aria-hidden="true" />
              SAVED FOR LATER
            </div>
            <div className="mt-1 text-lg font-semibold leading-snug" data-control="resume-banner-text">
              Round in progress at {currentCourseForActiveRound?.name ?? "Unknown course"} · Hole {currentHole}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={resumePausedRound}
                disabled={!currentCourseForActiveRound}
                data-control="resume"
                className="flex-1 golf-btn text-xl py-5 rounded-2xl font-bold shadow-lg active:scale-[0.985] disabled:opacity-40"
              >
                ▶ Resume
              </button>
              <button
                type="button"
                onClick={() => setHomeQuitOpen(true)}
                data-control="banner-quit"
                className="px-6 rounded-2xl border-2 border-og-danger text-og-danger text-lg font-bold active:bg-og-danger/10"
              >
                Quit
              </button>
            </div>
          </div>
        )}
        {activeRound && (
          <QuitRoundModal
            open={homeQuitOpen}
            courseName={currentCourseForActiveRound?.name ?? "Unknown course"}
            currentHole={currentHole}
            startingHole={
              currentCourseForActiveRound
                ? getStartingHoleForRound(currentCourseForActiveRound, activeRound)
                : activeRound.startingHole
            }
            onClose={() => setHomeQuitOpen(false)}
            onSaveForLater={() => setHomeQuitOpen(false)}
            onRestart={restartActiveRound}
            onDelete={deleteActiveRound}
          />
        )}

        {/* ========== HOME VIEW ========== */}
        {activeTab === "home" && (
          <>
            {/* Hero / Big CTA */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-og-surface text-og-accent-text text-xs tracking-[2px] px-4 py-1 rounded-full mb-3">
                ON THE COURSE • NO ACCOUNTS • PRIVATE
              </div>
              <h1 className="text-4xl font-semibold tracking-tighter mb-2">Ready to play?</h1>
              <p className="text-og-muted max-w-xs mx-auto">Track scores fast. Watch your OG index improve.</p>
            </div>

            {!activeRound && (
            <button
              onClick={openStartRoundModal}
              disabled={courses.length === 0 || (singlePlayer ? !me : players.length === 0)}
              data-control="start-round"
              className="w-full mb-8 golf-btn text-2xl py-7 rounded-3xl font-semibold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.985]"
            >
              {singlePlayer
                ? !me
                  ? "Set up your profile first"
                  : courses.length === 0
                    ? "Add a course first"
                    : "▶  Start New Round"
                : courses.length === 0 || players.length === 0
                  ? "Add a course and players first"
                  : "▶  Start New Round"}
            </button>
            )}

            {/* MY COURSES */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xl font-semibold">My Courses</h2>
                <button onClick={openAddCourseModal} className="text-sm text-og-accent-text hover:underline">
                  + Add Course
                </button>
              </div>

              {sortedCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedCourses.map((course) => (
                    <div key={course.id} className="golf-card rounded-3xl p-6">
                      <div className="font-semibold text-[17px] leading-tight">{course.name}</div>
                      <div className="text-sm text-og-muted mt-1">{course.location}</div>
                      <div className="mt-4 text-sm font-medium text-og-accent-text">
                        {course.holes.length} holes • Total Par {getCourseTotalPar(course)}
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <button
                          onClick={() => openEditCourseModal(course.id)}
                          className="text-xs text-og-accent-text hover:underline"
                        >
                          Edit course
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-xs text-og-danger hover:text-og-danger"
                        >
                          Remove course
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="golf-card rounded-2xl p-8 text-center text-og-muted">No courses yet. Add your first one above.</div>
              )}
            </section>

            {/* ME (single-player): first-run setup, then a profile card */}
            {singlePlayer && storageHydrated && (
              <section className="mb-8" data-control="me-section">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-xl font-semibold">Me</h2>
                </div>
                {me ? (
                  <div className="golf-card rounded-3xl p-6" data-control="me-card">
                    <div className="font-semibold text-[17px]" data-control="me-name">{me.name}</div>
                    {me.nickname && <div className="text-sm text-og-accent-text mt-0.5">“{me.nickname}”</div>}
                    <div className="mt-3 text-sm">
                      OG Index: <span className="font-semibold text-og-accent-text text-base" data-control="me-index">{me.handicap}</span>
                      <span className="block text-[10px] text-og-muted mt-0.5">Simplified · not USGA</span>
                    </div>
                    <button
                      onClick={() => openEditPlayerModal(me.id)}
                      data-control="me-edit"
                      className="mt-3 text-xs text-og-accent-text hover:underline"
                    >
                      Edit my profile
                    </button>
                  </div>
                ) : (
                  <div className="golf-card rounded-3xl p-6" data-control="me-setup">
                    <div className="font-semibold text-[17px]">Set up your profile</div>
                    <p className="text-sm text-og-muted mt-1 mb-4">
                      Just you. Your name and a starting OG index (your current handicap is a fine start).
                    </p>
                    <PlayerForm
                      key="me-setup"
                      initialPlayer={null}
                      hasCalculatedIndex={false}
                      onSave={handleSavePlayer}
                      submitLabel="Save my profile"
                    />
                  </div>
                )}
              </section>
            )}

            {/* MY PLAYERS (multiplayer only) */}
            {!singlePlayer && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xl font-semibold">My Players</h2>
                <button onClick={openAddPlayerModal} className="text-sm text-og-accent-text hover:underline">
                  + Add Player
                </button>
              </div>

              {sortedPlayers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedPlayers.map((player) => (
                    <div key={player.id} className="golf-card rounded-3xl p-6 flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-[17px]">{player.name}</div>
                        {player.nickname && <div className="text-sm text-og-accent-text mt-0.5">“{player.nickname}”</div>}
                        <div className="mt-3 text-sm">
                          OG Index: <span className="font-semibold text-og-accent-text text-base">{player.handicap}</span>
                          <span className="block text-[10px] text-og-muted mt-0.5">Simplified · not USGA</span>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          <button
                            onClick={() => openEditPlayerModal(player.id)}
                            className="text-xs text-og-accent-text hover:underline"
                          >
                            Edit player
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="text-xs text-og-danger hover:text-og-danger"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="golf-card rounded-2xl p-8 text-center text-og-muted">Add players to start tracking rounds and OG index.</div>
              )}
            </section>
            )}

            {/* PAST ROUNDS PREVIEW */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xl font-semibold">Recent Rounds</h2>
                <button onClick={() => setActiveTab("rounds")} className="text-sm text-og-accent-text hover:underline">
                  View all →
                </button>
              </div>

              {recentRounds.length > 0 ? (
                <div className="space-y-2">
                  {recentRounds.map((round) => {
                    const c = courses.find((cc) => cc.id === round.courseId);
                    return (
                      <button
                        key={round.id}
                        onClick={() => {
                          setViewingRoundId(round.id);
                          setActiveTab("rounds");
                        }}
                        className="golf-card w-full text-left rounded-2xl p-5 flex items-center justify-between hover:border-og-accent-line/30"
                      >
                        <div>
                          <div className="font-medium">{c?.name || "Unknown course"}</div>
                          <div className="text-xs text-og-muted">{new Date(round.date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right text-sm text-og-accent-text">
                          {roundSummaryRight(round)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="golf-card rounded-2xl p-8 text-center text-og-muted">Complete your first round to see history here.</div>
              )}
                        </section>

            {/* ========== BACKUP & RESTORE ========== */}
            <section className="mt-8 pt-6 border-t border-og-border">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xl font-semibold">Backup & Restore</h2>
              </div>
              <div className="golf-card rounded-3xl p-6 space-y-4">
                <div className="text-sm text-og-muted">
                  Save all your courses, players, and rounds as a backup file.
                </div>

                <button
                  type="button"
                  onClick={handleLoadTestData}
                  disabled={!!activeRound || hasTestDataLoaded(players)}
                  className="w-full py-4 rounded-2xl border border-dashed border-og-border text-og-accent-text font-semibold hover:bg-og-raised transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasTestDataLoaded(players) ? "Test Data Loaded" : "Load Test Data"}
                </button>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={exportBackup}
                    className="flex-1 py-4 rounded-2xl border border-og-accent-line text-og-accent-text font-semibold hover:bg-og-raised transition"
                  >
                    📤 Export Backup (JSON)
                  </button>
                  
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept=".json"
                      onChange={importBackup}
                      className="hidden"
                    />
                    <div className="py-4 rounded-2xl bg-og-accent text-og-on-accent font-semibold text-center hover:bg-og-accent-hover transition">
                      📥 Import Backup
                    </div>
                  </label>
                </div>
              </div>
            </section>

          </>
        )}

        {/* ========== STATS VIEW ========== */}
        {activeTab === "stats" && (
          <PlayerStatsView
            players={singlePlayer ? (me ? [me] : []) : players}
            rounds={rounds}
            courses={courses}
            title={singlePlayer ? "My Statistics" : undefined}
            onLoadTestData={handleLoadTestData}
            testDataLoaded={hasTestDataLoaded(players)}
          />
        )}

        {/* ========== ROUNDS / HISTORY VIEW ========== */}
        {activeTab === "rounds" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 px-1">Round History</h2>

            {rounds.length === 0 && (
              <div className="golf-card p-10 text-center rounded-3xl text-og-muted">
                No rounds recorded yet. Start one from the Home tab.
              </div>
            )}

            {/* Past Round Detail View */}
            {viewingRound && viewingCourse && (
              <div className="mb-8">
                <button onClick={() => setViewingRoundId(null)} className="text-sm text-og-accent-text mb-3">← Back to list</button>
                <div className="golf-card rounded-3xl p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-2xl font-semibold">{viewingCourse.name}</div>
                      <div className="text-og-accent-text">{new Date(viewingRound.date).toLocaleDateString()}</div>
                      <div className="text-sm text-og-muted mt-1">
                        {getRoundFormatLabel(viewingCourse, viewingRound)}
                      </div>
                      {viewingRound.tee && (
                        <div className="text-sm text-og-muted flex items-center gap-1.5" data-control="round-tee">
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-og-border"
                            style={{ backgroundColor: viewingRound.tee.color }}
                            aria-hidden="true"
                          />
                          {formatTeeLabel(viewingRound.tee)}
                        </div>
                      )}
                    </div>
                    {!viewingRound.completed && (
                      <button
                        type="button"
                        onClick={() => resumeIncompleteRound(viewingRound.id)}
                        className="golf-btn px-5 py-2.5 rounded-xl text-sm font-semibold"
                      >
                        Resume Round
                      </button>
                    )}
                  </div>

                  <div className="mt-6 space-y-5">
                    {singlePlayer && meId && !viewingRound.playerScores.some((ps) => ps.playerId === meId) && (
                      <div className="text-sm text-og-muted" data-control="round-not-played">You didn&apos;t play this round.</div>
                    )}
                    {singlePlayer &&
                      viewingRound.playerScores.some((ps) => ps.playerId !== meId) && (
                        <div className="text-xs uppercase tracking-[1.5px] font-semibold text-og-muted -mb-2" data-control="round-readonly-note">
                          Played with others · read-only
                        </div>
                      )}
                    {[...viewingRound.playerScores]
                      .sort((a, b) => (singlePlayer ? Number(b.playerId === meId) - Number(a.playerId === meId) : 0))
                      .map((ps) => {
                      const pl = players.find((p) => p.id === ps.playerId);
                      const total = getTotalScoreForPlayerInRound(ps, viewingCourse);
                      const vsPar = getScoreVsParForPlayerInRound(ps, viewingCourse);
                      return (
                        <div
                          key={ps.playerId}
                          data-control={singlePlayer ? (ps.playerId === meId ? "round-me" : "round-other") : undefined}
                          className={`bg-og-surface rounded-2xl p-4 ${singlePlayer && ps.playerId !== meId ? "opacity-70" : ""}`}
                        >
                          <div className="flex justify-between items-baseline">
                            <button
                          onClick={() => setPlayerDetailModal({ playerId: ps.playerId, roundId: viewingRound.id })}
                          className="font-semibold text-left hover:text-og-accent-text active:opacity-80"
                        >
                          {pl?.name ?? "Unknown player"}
                          {singlePlayer && ps.playerId === meId && <span className="ml-2 text-xs text-og-accent-text">You</span>}
                        </button>
                            <div className="text-right">
                              <span className="text-2xl font-semibold tabular-nums">{total}</span>
                              <span className={`ml-2 text-sm font-medium ${vsPar < 0 ? "text-og-success" : vsPar > 0 ? "text-og-danger" : ""}`}>
                                {vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : vsPar}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-og-muted mt-1">{ps.scores.length} holes played</div>
                        </div>
                      );
                    })}
                  </div>

                  {viewingRound.completed && (
                    <RoundExportPanel
                      round={singlePlayer ? roundFocusedOnPlayer(viewingRound, meId) : viewingRound}
                      course={viewingCourse}
                      players={players}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Round List */}
            {!viewingRoundId && rounds.length > 0 && (
              <div className="space-y-3">
                {[...rounds].sort((a, b) => b.date.localeCompare(a.date)).map((round) => {
                  const c = courses.find((cc) => cc.id === round.courseId);
                  return (
                    <div key={round.id} className="golf-card w-full text-left rounded-2xl p-5">
                      <button
                        type="button"
                        onClick={() =>
                          round.completed ? setViewingRoundId(round.id) : resumeIncompleteRound(round.id)
                        }
                        className="w-full text-left"
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="font-semibold">{c?.name}</div>
                            <div className="text-xs text-og-muted mt-0.5">{new Date(round.date).toLocaleDateString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-og-accent-text">{roundSummaryRight(round)}</div>
                            <div className={`text-xs mt-0.5 ${round.completed ? "text-og-success" : "text-og-live"}`}>
                              {round.completed ? "Completed" : "In progress"}
                            </div>
                          </div>
                        </div>
                      </button>
                      {!round.completed && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => resumeIncompleteRound(round.id)}
                            className="golf-btn px-4 py-2 rounded-xl text-sm font-semibold"
                          >
                            Resume
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingRoundId(round.id)}
                            className="golf-btn-secondary px-4 py-2 rounded-xl text-sm font-semibold"
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

         {/* ========== START ROUND MODAL ========== */}
      <Modal
        isOpen={isStartRoundModalOpen}
        onClose={() => setIsStartRoundModalOpen(false)}
        title="Start New Round"
        size="lg"
      >
        <div className="space-y-6">
          {/* Choose Course */}
          <div>
            <div className="text-sm font-medium text-og-accent-text mb-2">Select Course</div>
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => selectCourseForStart(course.id)}
                    className={`text-left p-4 rounded-2xl border transition ${optionTileClass(selectedCourseForStart === course.id)}`}
                  >
                    <div className="font-medium">{course.name}</div>
                    <div className={`text-xs ${optionSubtextClass(selectedCourseForStart === course.id)}`}>{course.location} • {course.holes.length} holes</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-og-muted">No courses available. Add one first from the Home screen.</div>
            )}
          </div>

          {/* Tee (after course). Courses without tees play as before (no rating). */}
          {selectedCourseForStart && (() => {
            const startCourse = courses.find((c) => c.id === selectedCourseForStart);
            const tees = startCourse?.tees ?? [];
            if (!startCourse || tees.length === 0) return null;
            return (
              <div data-control="tee-picker">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-og-accent-text">Tee</div>
                  <div className="flex gap-1 text-xs" role="group" aria-label="Ratings">
                    {(["men", "women"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setTeeGenderForStartRound(g)}
                        aria-pressed={teeGenderForStart === g}
                        data-control={`tee-gender-${g}`}
                        className={`px-3 py-1.5 rounded-full border ${optionPillClass(teeGenderForStart === g)} ${teeGenderForStart === g ? "border-og-chip-selected-border font-semibold" : "border-og-border"}`}
                      >
                        {g === "men" ? "Men's" : "Women's"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {tees.map((t) => {
                    const rating = teeRatingFor(t, teeGenderForStart);
                    const selected = teeIdForStart === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!rating}
                        onClick={() => setTeeIdForStart(t.id)}
                        data-control="tee-option"
                        data-tee-name={t.name}
                        aria-pressed={selected}
                        className={`p-3 rounded-2xl border text-left transition disabled:opacity-40 disabled:cursor-not-allowed ${optionTileClass(selected)}`}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-full border border-og-border shrink-0"
                            style={{ backgroundColor: t.color }}
                            aria-hidden="true"
                          />
                          {t.name}
                        </div>
                        <div className={`text-xs tabular-nums mt-0.5 ${optionSubtextClass(selected)}`}>
                          {rating ? `${rating.rating.toFixed(1)} / ${rating.slope} · Par ${t.par}` : "No rating"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Round Options */}
          {selectedCourseForStart && (() => {
            const startCourse = courses.find((c) => c.id === selectedCourseForStart);
            if (!startCourse) return null;
            const courseIs18 = is18HoleCourse(startCourse);

            if (!courseIs18) {
              return (
                <div className="rounded-2xl border border-og-border p-4 text-sm text-og-accent-text">
                  9-hole course — round plays all holes (1–9). Hole 10 and 18-hole options are not available.
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-og-accent-text mb-2">Round Length</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRoundLengthForStart(18)}
                      className={`p-4 rounded-2xl border text-left transition ${optionTileClass(roundLengthForStart === 18)}`}
                    >
                      <div className="font-medium">18 Holes</div>
                    </button>
                    <button
                      onClick={() => setRoundLengthForStart(9)}
                      className={`p-4 rounded-2xl border text-left transition ${optionTileClass(roundLengthForStart === 9)}`}
                    >
                      <div className="font-medium">9 Holes</div>
                    </button>
                  </div>
                </div>

                {roundLengthForStart === 9 && (
                  <div>
                    <div className="text-sm font-medium text-og-accent-text mb-2">Which Nine?</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setNineSideForStartRound("front")}
                        className={`p-4 rounded-2xl border text-left transition ${optionTileClass(nineSideForStart === "front")}`}
                      >
                        Front 9 (Holes 1-9)
                      </button>
                      <button
                        onClick={() => setNineSideForStartRound("back")}
                        className={`p-4 rounded-2xl border text-left transition ${optionTileClass(nineSideForStart === "back")}`}
                      >
                        Back 9 (Holes 10-18)
                      </button>
                    </div>
                  </div>
                )}

                {roundLengthForStart === 18 && (
                  <div>
                    <div className="text-sm font-medium text-og-accent-text mb-2">Starting Hole</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setStartingHoleForStart(1)}
                        className={`p-4 rounded-2xl border text-left transition ${optionTileClass(startingHoleForStart === 1)}`}
                      >
                        Hole 1
                      </button>
                      <button
                        onClick={() => setStartingHoleForStart(10)}
                        className={`p-4 rounded-2xl border text-left transition ${optionTileClass(startingHoleForStart === 10)}`}
                      >
                        Hole 10
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Choose Players (multiplayer only; single-player rounds are always just Me) */}
          {MULTIPLAYER_ENABLED && selectedCourseForStart && (
            <div>
              <div className="text-sm font-medium text-og-accent-text mb-2">Select Players (at least one)</div>
              <div className="space-y-2">
                {players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerForRound(player.id)}
                    className={`w-full flex justify-between items-center p-4 rounded-2xl border text-left transition ${optionTileClass(selectedPlayersForStart.includes(player.id))}`}
                  >
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className={`text-xs ${optionSubtextClass(selectedPlayersForStart.includes(player.id))}`}>OG Index {player.handicap} · not USGA</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${selectedPlayersForStart.includes(player.id) ? "bg-og-on-accent text-og-accent border-og-on-accent" : "border-og-border group-active:border-og-on-accent"}`}>
                      {selectedPlayersForStart.includes(player.id) && "✓"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button onClick={() => setIsStartRoundModalOpen(false)} className="flex-1 py-3.5 rounded-2xl border border-og-border font-semibold">
              Cancel
            </button>
            <button
              onClick={startRound}
              disabled={
                !selectedCourseForStart ||
                (startCourseNeedsTee && !teeIdForStart) ||
                (singlePlayer ? !meId : selectedPlayersForStart.length === 0)
              }
              data-control="start-round-confirm"
              className="golf-btn flex-1 py-3.5 rounded-2xl font-semibold disabled:opacity-50"
            >
              Start Round
            </button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Course Modal */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={closeCourseModal}
        title={editingCourseId ? "Edit Course" : "Add New Course"}
        size="lg"
      >
        <CourseForm
          key={editingCourseId ?? "new-course"}
          initialCourse={
            editingCourseId ? courses.find((c) => c.id === editingCourseId) ?? null : null
          }
          onSave={handleSaveCourse}
          onCancel={closeCourseModal}
        />
      </Modal>

      {/* Add / Edit Player Modal */}
      <Modal
        isOpen={isPlayerModalOpen}
        onClose={closePlayerModal}
        title={
          singlePlayer && editingPlayerId && editingPlayerId === meId
            ? "Edit My Profile"
            : editingPlayerId
              ? "Edit Player"
              : "Add New Player"
        }
      >
        <PlayerForm
          key={editingPlayerId ?? "new-player"}
          initialPlayer={
            editingPlayerId ? players.find((p) => p.id === editingPlayerId) ?? null : null
          }
          hasCalculatedIndex={
            editingPlayerId
              ? !playerUsesStartingHandicap(editingPlayerId, rounds, courses)
              : false
          }
          onSave={handleSavePlayer}
          onCancel={closePlayerModal}
        />
      </Modal>

                  {/* Improved Player Detail Modal */}
      <PlayerDetailModal
        isOpen={!!playerDetailModal}
        onClose={() => setPlayerDetailModal(null)}
        player={playerDetailModal 
          ? players.find((p) => p.id === playerDetailModal.playerId) || null 
          : null}
        round={playerDetailModal 
          ? rounds.find((r) => r.id === playerDetailModal.roundId) || null 
          : null}
        course={playerDetailModal 
          ? courses.find((c) => c.id === 
              rounds.find((r) => r.id === playerDetailModal.roundId)?.courseId) || null 
          : null}
        playerScore={playerDetailModal 
          ? rounds.find((r) => r.id === playerDetailModal.roundId)
              ?.playerScores.find((ps) => ps.playerId === playerDetailModal.playerId) || null 
          : null}
      />

      {/* Footer note */}
      <div className="text-center text-[10px] text-og-muted mt-12 pb-6">
        All data saved privately in your browser (localStorage). Nothing leaves your device.
      </div>
    </div>
  );
}
