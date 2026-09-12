"use client";

import React, { useEffect, useState } from "react";
import {
  Course,
  Player,
  Round,
  ActiveRound,
  PlayerRoundScore,
  HoleScore,
  NineSide,
  RoundLength,
} from "@/lib/types";
import {
  getCourses,
  saveCourses,
  getPlayers,
  savePlayers,
  getRounds,
  saveRounds,
  getActiveRound as getStoredActiveRound,
  saveActiveRound as persistActiveRound,
  clearActiveRound as clearStoredActiveRound,
} from "@/lib/storage";
import {
  calculateHandicapForPlayer,
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
import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { RoundExportPanel } from "@/components/RoundExportPanel";
import {
  getTestDataSuccessMessage,
  hasTestDataLoaded,
  mergeTestData,
} from "@/lib/testData";
export default function GolfScoreTracker() {
  // Core data
  const [courses, setCourses] = useState<Course[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<"home" | "rounds" | "stats">("home");
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [isStartRoundModalOpen, setIsStartRoundModalOpen] = useState(false);
  const [selectedCourseForStart, setSelectedCourseForStart] = useState<string>("");
  const [selectedPlayersForStart, setSelectedPlayersForStart] = useState<string[]>([]);
  const [roundLengthForStart, setRoundLengthForStart] = useState<RoundLength>(18);
  const [nineSideForStart, setNineSideForStart] = useState<NineSide>("front");
  const [startingHoleForStart, setStartingHoleForStart] = useState<1 | 10>(1);

  // Active round state
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null);
  const [currentHole, setCurrentHole] = useState(1);

  // Past round detail
  const [viewingRoundId, setViewingRoundId] = useState<string | null>(null);

  // Player detail modal in round view
  const [playerDetailModal, setPlayerDetailModal] = useState<{ playerId: string; roundId: string } | null>(null);

  // Avoid wiping localStorage before the initial restore completes
  const [storageHydrated, setStorageHydrated] = useState(false);

  // Install CTA: iOS Safari only, and only when not already installed (standalone)
  const [showInstallButton, setShowInstallButton] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setCourses(getCourses());
    setPlayers(getPlayers());
    setRounds(getRounds());


    const stored = getStoredActiveRound();
    if (stored?.round) {
      setActiveRound(stored.round);
      setCurrentHole(stored.currentHole || stored.round.startingHole || 1);
      setActiveTab("rounds");
    }

    setStorageHydrated(true);
  }, []);

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

  // Persist whenever data changes — including empty arrays so deletions stick
  useEffect(() => {
    if (!storageHydrated) return;
    saveCourses(courses);
  }, [courses, storageHydrated]);

  useEffect(() => {
    if (!storageHydrated) return;
    savePlayers(players);
  }, [players, storageHydrated]);

  useEffect(() => {
    if (!storageHydrated) return;
    saveRounds(rounds);
  }, [rounds, storageHydrated]);

  // Persist in-progress round (scores, hole nav) so refresh / Safari kill can restore it
  useEffect(() => {
    if (!storageHydrated) return;
    if (activeRound) {
      persistActiveRound({ round: activeRound, currentHole });
    } else {
      clearStoredActiveRound();
    }
  }, [activeRound, currentHole, storageHydrated]);

  // Prefer beforeunload when a round is in progress (desktop; limited on iOS Safari)
  useEffect(() => {
    if (!activeRound) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [activeRound]);

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

  const handleSavePlayer = (name: string, nickname: string, startingHandicap: number) => {
    if (editingPlayerId) {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== editingPlayerId) return p;
          const updated: Player = {
            ...p,
            name,
            nickname: nickname || undefined,
            startingHandicap,
            handicap: calculateHandicapForPlayer(
              p.id,
              rounds,
              courses,
              startingHandicap
            ),
            updatedAt: new Date().toISOString(),
          };
          return updated;
        })
      );
    } else {
      const newPlayer: Player = {
        id: generateId(),
        name,
        nickname: nickname || undefined,
        handicap: startingHandicap,
        startingHandicap,
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
    setRoundLengthForStart(defaults.roundLength);
    setNineSideForStart(defaults.nineSide);
    setStartingHoleForStart(defaults.startingHole);
  };

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

    setActiveRound(newActiveRound);
    setCurrentHole(holesInPlay[0] ?? 1);
    setIsStartRoundModalOpen(false);
    setActiveTab("rounds"); // Switch to rounds view
  };

  // ==================== SCORE ENTRY ====================
  const getCurrentCourse = () => {
    if (!activeRound) return null;
    return courses.find((c) => c.id === activeRound.courseId) || null;
  };

  const updateScore = (playerId: string, holeNumber: number, newScore: number) => {
    if (!activeRound) return;

    setActiveRound((prev) => {
      if (!prev) return prev;

      const playerScores = [...(prev.scores[playerId] || [])];
      const existingIndex = playerScores.findIndex((s) => s.holeNumber === holeNumber);

      const clampedScore = Math.max(1, Math.min(15, newScore)); // Reasonable bounds

      if (existingIndex >= 0) {
        playerScores[existingIndex] = { holeNumber, score: clampedScore };
      } else {
        playerScores.push({ holeNumber, score: clampedScore });
      }

      // Sort by hole number
      playerScores.sort((a, b) => a.holeNumber - b.holeNumber);

      return {
        ...prev,
        scores: {
          ...prev.scores,
          [playerId]: playerScores,
        },
      };
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

  const getPlayerScoreOnHole = (playerId: string, holeNumber: number): number | null => {
    if (!activeRound) return null;
    return activeRound.scores[playerId]?.find((s) => s.holeNumber === holeNumber)?.score ?? null;
  };

  // Helpers for live round totals (used in score entry for context)
  const getActiveScoresForPlayer = (playerId: string) => {
    if (!activeRound || !currentCourseForActiveRound) return [];
    const holesInPlay = new Set(getHolesInPlay(currentCourseForActiveRound, activeRound));
    return (activeRound.scores[playerId] || []).filter((s) => holesInPlay.has(s.holeNumber));
  };

  const getActiveTotalForPlayer = (playerId: string): number => {
    return getActiveScoresForPlayer(playerId).reduce((sum, s) => sum + s.score, 0);
  };

  const getActiveVsParForPlayer = (playerId: string): number => {
    if (!currentCourseForActiveRound) return 0;
    return getActiveScoresForPlayer(playerId).reduce((diff, s) => {
      const hole = currentCourseForActiveRound.holes.find((h) => h.number === s.holeNumber);
      return diff + (s.score - (hole?.par ?? 4));
    }, 0);
  };

  const setScoreToPar = (playerId: string, holeNumber: number, par: number) => {
    updateScore(playerId, holeNumber, par);
  };

  // True when every player has a score for every hole in play
  const isActiveRoundFullyScored = (): boolean => {
    if (!activeRound) return false;
    const course = getCurrentCourse();
    if (!course) return false;

    const holesInPlay = getHolesInPlay(course, activeRound);
    return activeRound.playerIds.every((pid) => {
      const playerScores = activeRound.scores[pid] || [];
      return holesInPlay.every((holeNumber) =>
        playerScores.some((s) => s.holeNumber === holeNumber)
      );
    });
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
      for (const pid of activeRound.playerIds) {
        const player = players.find((p) => p.id === pid);
        const name = player?.name ?? "Player";
        const scored = new Set((activeRound.scores[pid] || []).map((s) => s.holeNumber));
        const missingHoles = holesInPlay.filter((h) => !scored.has(h));
        if (missingHoles.length > 0) {
          missing.push(`${name}: hole${missingHoles.length === 1 ? "" : "s"} ${missingHoles.join(", ")}`);
        }
      }
      alert(
        "Finish Round requires a score for every hole in play for every player.\n\n" +
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
    setActiveTab("home");
  };

  const cancelActiveRound = () => {
    if (confirm("Discard the current round? Unsaved scores will be lost.")) {
      setActiveRound(null);
      setCurrentHole(1);
      clearStoredActiveRound();
      setActiveTab("home");
    }
  };

  // Resume an incomplete history round into the live scorer (same Round id)
  const resumeIncompleteRound = (roundId: string) => {
    if (activeRound) {
      alert("Finish or save the current round before resuming another.");
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
    };

    const holesInPlay = getHolesInPlay(course, resumed);
    const firstUnscored =
      holesInPlay.find((h) => !playerIds.every((pid) => (scores[pid] || []).some((s) => s.holeNumber === h))) ??
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

        if (backup.courses) setCourses(backup.courses);
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

  // ==================== RENDER ====================
  const currentCourseForActiveRound = getCurrentCourse();
  const activeHolesInPlay =
    activeRound && currentCourseForActiveRound
      ? getHolesInPlay(currentCourseForActiveRound, activeRound)
      : [];
  const activeHoleIndex = activeHolesInPlay.indexOf(currentHole);
  const activeRoundFormatLabel =
    activeRound && currentCourseForActiveRound
      ? getRoundFormatLabel(currentCourseForActiveRound, activeRound)
      : "";

  return (
    <div className="min-h-screen pb-20">
      {/* Top Navigation / Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c3326]/95 backdrop-blur border-b border-golf-green-100 dark:border-[#1a4a2f]">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-golf-gold flex items-center justify-center">
              <span className="text-golf-green-900 text-xl font-bold">⛳</span>
            </div>
            <div>
              <div className="font-semibold text-2xl tracking-tight">OG Golf</div>
              <div className="text-[10px] text-golf-gold/70 -mt-1">PRIVATE • FAST • SIMPLE</div>
            </div>
          </div>

          <div className="saved-indicator hidden sm:inline-flex">
            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Saved locally
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 text-sm">
              <button
                onClick={() => setActiveTab("home")}
                className={`px-4 py-1.5 rounded-full transition ${activeTab === "home" ? "bg-golf-gold text-golf-green-900 font-semibold" : "text-golf-gold hover:bg-golf-green-100 dark:hover:bg-[#153a2a]"}`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab("rounds")}
                className={`px-4 py-1.5 rounded-full transition ${activeTab === "rounds" ? "bg-golf-gold text-golf-green-900 font-semibold" : "text-golf-gold hover:bg-golf-green-100 dark:hover:bg-[#153a2a]"}`}
              >
                Rounds
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`px-4 py-1.5 rounded-full transition ${activeTab === "stats" ? "bg-golf-gold text-golf-green-900 font-semibold" : "text-golf-gold hover:bg-golf-green-100 dark:hover:bg-[#153a2a]"}`}
              >
                Stats
              </button>
            </div>
            <ThemeToggle />
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
            className="w-full mb-6 py-4 bg-[#c5a36f] hover:bg-white text-[#051b14] font-semibold rounded-3xl text-lg flex items-center justify-center gap-2 transition shadow-lg"
          >
            📱 Install OG Golf on iPhone
          </button>
        )}
        {/* ========== ACTIVE ROUND SCREEN (Full focus) ========== */}
        {activeRound && currentCourseForActiveRound && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[#c5a36f] text-sm font-medium tracking-wider">IN PROGRESS</div>
                <div className="text-3xl font-semibold">{currentCourseForActiveRound.name}</div>
                <div className="text-sm text-[#c5a36f]/80 mt-1">{activeRoundFormatLabel}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveActiveRound(false)} className="golf-btn-secondary px-5 py-2.5 rounded-xl text-sm font-semibold">
                  Save &amp; Continue Later
                </button>
                <button onClick={() => saveActiveRound(true)} className="golf-btn px-6 py-2.5 rounded-xl text-sm font-semibold">
                  Finish Round
                </button>
                <button onClick={cancelActiveRound} className="px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400">
                  Cancel
                </button>
              </div>
            </div>

            {/* Hole Navigation - larger, clearer, faster to tap */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-3 -mx-1 px-1">
              {activeHolesInPlay.map((holeNumber) => {
                const hole = currentCourseForActiveRound.holes.find((h) => h.number === holeNumber)!;
                const isActive = currentHole === hole.number;
                const allPlayersHaveScore = activeRound.playerIds.every(
                  (pid) => getPlayerScoreOnHole(pid, hole.number) !== null
                );
                return (
                  <button
                    key={hole.number}
                    onClick={() => setCurrentHole(hole.number)}
                    className={`min-w-[72px] px-5 py-3 rounded-2xl text-base font-bold flex-shrink-0 border-2 transition active:scale-[0.96] ${
                      isActive
                        ? "bg-[#c5a36f] text-[#051b14] border-[#c5a36f] shadow-lg"
                        : allPlayersHaveScore
                        ? "bg-white dark:bg-[#1f4a3a] border-[#c5a36f]/40 text-[#c5a36f]"
                        : "bg-golf-green-100 dark:bg-[#153a2a] border-golf-green-100 dark:border-[#2a5a48] text-golf-green-900 dark:text-golf-cream"
                    }`}
                  >
                    <div>Hole {hole.number}</div>
                    <div className="text-[10px] font-medium opacity-75 -mt-0.5">Par {hole.par}</div>
                  </button>
                );
              })}
            </div>

            <LiveLeaderboard
              playerIds={activeRound.playerIds}
              players={players}
              course={currentCourseForActiveRound}
              scores={activeRound.scores}
              roundConfig={activeRound}
            />

            {/* Score Entry - Optimized for speed on the course */}
            <div className="golf-card rounded-3xl p-5">
              {/* Stronger current hole header */}
              <div className="mb-4 flex items-center justify-between px-1">
                <div>
                  <div className="text-sm tracking-[1px] text-[#c5a36f]/70">CURRENT HOLE</div>
                  <div className="text-3xl font-semibold tabular-nums flex items-baseline gap-2 mt-0.5">
                    Hole {currentHole}
                    <span className="inline-block text-base font-medium px-3 py-px rounded-full bg-golf-green-100 dark:bg-[#1a4a2f] text-[#c5a36f]">
                      Par {currentCourseForActiveRound.holes.find(h => h.number === currentHole)?.par}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-[#c5a36f]">
                  Tap <span className="font-semibold">Par</span> for speed<br />then adjust outliers
                </div>
              </div>

              <div className="space-y-4">
                {activeRound.playerIds.map((playerId) => {
                  const player = players.find((p) => p.id === playerId)!;
                  const currentScore = getPlayerScoreOnHole(playerId, currentHole);
                  const par = currentCourseForActiveRound.holes.find((h) => h.number === currentHole)?.par ?? 4;

                  const roundTotal = getActiveTotalForPlayer(playerId);
                  const roundVsPar = getActiveVsParForPlayer(playerId);

                  return (
                    <div key={playerId} className="bg-white dark:bg-[#0c3326] rounded-2xl p-5">
                      {/* Player header + round context */}
                      <div className="flex items-baseline justify-between mb-3 px-1">
                        <div>
                          <div className="font-semibold text-lg">{player.name}</div>
                          {player.nickname && <div className="text-xs text-[#c5a36f]/70 -mt-0.5">“{player.nickname}”</div>}
                        </div>
                        <div className="text-right text-sm tabular-nums">
                          <span className="font-medium">{roundTotal || "—"}</span>
                          <span className={`ml-1.5 text-xs ${roundVsPar < 0 ? "text-emerald-400" : roundVsPar > 0 ? "text-red-400" : "text-[#c5a36f]"}`}>
                            ({roundVsPar === 0 ? "E" : roundVsPar > 0 ? `+${roundVsPar}` : roundVsPar})
                          </span>
                        </div>
                      </div>

                      {/* Fast controls row - even larger targets */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => adjustScore(playerId, currentHole, -1)}
                          className="score-btn"
                          aria-label="Decrease score"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          inputMode="numeric"
                          value={currentScore ?? ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) updateScore(playerId, currentHole, val);
                          }}
                          onBlur={(e) => {
                            if (!e.target.value) updateScore(playerId, currentHole, par);
                          }}
                          placeholder={String(par)}
                          className="score-input flex-1 max-w-[82px]"
                        />

                        <button
                          onClick={() => adjustScore(playerId, currentHole, 1)}
                          className="score-btn"
                          aria-label="Increase score"
                        >
                          +
                        </button>

                        {/* Set to Par - extremely useful on the course */}
                        <button
                          onClick={() => setScoreToPar(playerId, currentHole, par)}
                          className="ml-1 flex-1 h-[68px] rounded-2xl border-2 border-[#c5a36f] bg-white dark:bg-[#1f4a3a] active:bg-[#c5a36f] active:text-[#051b14] text-base font-bold text-[#c5a36f] transition active:scale-[0.985]"
                        >
                          Set to Par
                        </button>
                      </div>

                      {/* Current hole vs par */}
                      <div className="mt-2 px-1 text-right">
                        {currentScore !== null && (
                          <span className={`text-sm font-semibold tabular-nums ${currentScore > par ? "text-red-400" : currentScore < par ? "text-emerald-400" : "text-[#c5a36f]"}`}>
                            This hole: {currentScore > par ? "+" : ""}{currentScore - par}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* MAXIMUM thumb-friendly navigation at the bottom - much bigger as requested */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    if (activeHoleIndex > 0) {
                      setCurrentHole(activeHolesInPlay[activeHoleIndex - 1]);
                    }
                  }}
                  disabled={activeHoleIndex <= 0}
                  className="py-5 text-lg font-bold rounded-2xl border-2 border-golf-green-100 dark:border-[#2a5a48] text-[#c5a36f] active:bg-golf-green-50 dark:active:bg-[#1f4a3a] active:border-[#c5a36f] disabled:opacity-40 transition-all"
                >
                  ← Previous Hole
                </button>
                <button
                  onClick={() => {
                    if (activeHoleIndex >= 0 && activeHoleIndex < activeHolesInPlay.length - 1) {
                      setCurrentHole(activeHolesInPlay[activeHoleIndex + 1]);
                    }
                  }}
                  disabled={activeHoleIndex < 0 || activeHoleIndex >= activeHolesInPlay.length - 1}
                  className="py-5 text-lg font-bold rounded-2xl border-2 border-golf-green-100 dark:border-[#2a5a48] text-[#c5a36f] active:bg-golf-green-50 dark:active:bg-[#1f4a3a] active:border-[#c5a36f] disabled:opacity-40 transition-all"
                >
                  Next Hole →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== HOME VIEW ========== */}
        {!activeRound && activeTab === "home" && (
          <>
            {/* Hero / Big CTA */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-golf-green-100 dark:bg-[#153a2a] text-[#c5a36f] text-xs tracking-[2px] px-4 py-1 rounded-full mb-3">
                ON THE COURSE • NO ACCOUNTS • PRIVATE
              </div>
              <h1 className="text-4xl font-semibold tracking-tighter mb-2">Ready to play?</h1>
              <p className="text-[#c5a36f]/80 max-w-xs mx-auto">Track scores fast. Watch your OG index improve.</p>
            </div>

            <button
              onClick={openStartRoundModal}
              disabled={courses.length === 0 || players.length === 0}
              className="w-full mb-8 golf-btn text-2xl py-7 rounded-3xl font-semibold shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.985]"
            >
              {courses.length === 0 || players.length === 0
                ? "Add a course and players first"
                : "▶  Start New Round"}
            </button>

            {/* MY COURSES */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xl font-semibold">My Courses</h2>
                <button onClick={openAddCourseModal} className="text-sm text-[#c5a36f] hover:underline">
                  + Add Course
                </button>
              </div>

              {sortedCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedCourses.map((course) => (
                    <div key={course.id} className="golf-card rounded-3xl p-6">
                      <div className="font-semibold text-[17px] leading-tight">{course.name}</div>
                      <div className="text-sm text-[#c5a36f]/80 mt-1">{course.location}</div>
                      <div className="mt-4 text-sm font-medium text-[#c5a36f]">
                        {course.holes.length} holes • Total Par {getCourseTotalPar(course)}
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <button
                          onClick={() => openEditCourseModal(course.id)}
                          className="text-xs text-[#c5a36f] hover:underline"
                        >
                          Edit course
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-xs text-red-400/70 hover:text-red-400"
                        >
                          Remove course
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="golf-card rounded-2xl p-8 text-center text-[#c5a36f]/70">No courses yet. Add your first one above.</div>
              )}
            </section>

            {/* MY PLAYERS */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xl font-semibold">My Players</h2>
                <button onClick={openAddPlayerModal} className="text-sm text-[#c5a36f] hover:underline">
                  + Add Player
                </button>
              </div>

              {sortedPlayers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedPlayers.map((player) => (
                    <div key={player.id} className="golf-card rounded-3xl p-6 flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-[17px]">{player.name}</div>
                        {player.nickname && <div className="text-sm text-[#c5a36f] mt-0.5">“{player.nickname}”</div>}
                        <div className="mt-3 text-sm">
                          OG Index: <span className="font-semibold text-[#c5a36f] text-base">{player.handicap}</span>
                          <span className="block text-[10px] text-[#c5a36f]/50 mt-0.5">Simplified · not USGA</span>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          <button
                            onClick={() => openEditPlayerModal(player.id)}
                            className="text-xs text-[#c5a36f] hover:underline"
                          >
                            Edit player
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="text-xs text-red-400/70 hover:text-red-400"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="golf-card rounded-2xl p-8 text-center text-[#c5a36f]/70">Add players to start tracking rounds and OG index.</div>
              )}
            </section>

            {/* PAST ROUNDS PREVIEW */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xl font-semibold">Recent Rounds</h2>
                <button onClick={() => setActiveTab("rounds")} className="text-sm text-[#c5a36f] hover:underline">
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
                        className="golf-card w-full text-left rounded-2xl p-5 flex items-center justify-between hover:border-[#c5a36f]/30"
                      >
                        <div>
                          <div className="font-medium">{c?.name || "Unknown course"}</div>
                          <div className="text-xs text-[#c5a36f]/70">{new Date(round.date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right text-sm text-[#c5a36f]">
                          {round.playerScores.length} players
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="golf-card rounded-2xl p-8 text-center text-[#c5a36f]/70">Complete your first round to see history here.</div>
              )}
                        </section>

            {/* ========== BACKUP & RESTORE ========== */}
            <section className="mt-8 pt-6 border-t border-golf-green-100 dark:border-[#2a5a48]">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xl font-semibold">Backup & Restore</h2>
              </div>
              <div className="golf-card rounded-3xl p-6 space-y-4">
                <div className="text-sm text-[#c5a36f]/80">
                  Save all your courses, players, and rounds as a backup file.
                </div>

                <button
                  type="button"
                  onClick={handleLoadTestData}
                  disabled={!!activeRound || hasTestDataLoaded(players)}
                  className="w-full py-4 rounded-2xl border border-dashed border-[#c5a36f]/50 text-[#c5a36f] font-semibold hover:bg-golf-green-50 dark:hover:bg-[#1f4a3a] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasTestDataLoaded(players) ? "Test Data Loaded" : "Load Test Data"}
                </button>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={exportBackup}
                    className="flex-1 py-4 rounded-2xl border border-[#c5a36f] text-[#c5a36f] font-semibold hover:bg-golf-green-50 dark:hover:bg-[#1f4a3a] transition"
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
                    <div className="py-4 rounded-2xl bg-[#c5a36f] text-[#051b14] font-semibold text-center hover:bg-white transition">
                      📥 Import Backup
                    </div>
                  </label>
                </div>
              </div>
            </section>

          </>
        )}

        {/* ========== STATS VIEW ========== */}
        {!activeRound && activeTab === "stats" && (
          <PlayerStatsView
            players={players}
            rounds={rounds}
            courses={courses}
            onLoadTestData={handleLoadTestData}
            testDataLoaded={hasTestDataLoaded(players)}
          />
        )}

        {/* ========== ROUNDS / HISTORY VIEW ========== */}
        {!activeRound && activeTab === "rounds" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 px-1">Round History</h2>

            {rounds.length === 0 && (
              <div className="golf-card p-10 text-center rounded-3xl text-[#c5a36f]/70">
                No rounds recorded yet. Start one from the Home tab.
              </div>
            )}

            {/* Past Round Detail View */}
            {viewingRound && viewingCourse && (
              <div className="mb-8">
                <button onClick={() => setViewingRoundId(null)} className="text-sm text-[#c5a36f] mb-3">← Back to list</button>
                <div className="golf-card rounded-3xl p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-2xl font-semibold">{viewingCourse.name}</div>
                      <div className="text-[#c5a36f]">{new Date(viewingRound.date).toLocaleDateString()}</div>
                      <div className="text-sm text-[#c5a36f]/70 mt-1">
                        {getRoundFormatLabel(viewingCourse, viewingRound)}
                      </div>
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
                    {viewingRound.playerScores.map((ps) => {
                      const pl = players.find((p) => p.id === ps.playerId);
                      const total = getTotalScoreForPlayerInRound(ps, viewingCourse);
                      const vsPar = getScoreVsParForPlayerInRound(ps, viewingCourse);
                      return (
                        <div key={ps.playerId} className="bg-golf-green-100 dark:bg-[#153a2a] rounded-2xl p-4">
                          <div className="flex justify-between items-baseline">
                            <button
                          onClick={() => setPlayerDetailModal({ playerId: ps.playerId, roundId: viewingRound.id })}
                          className="font-semibold text-left hover:text-[#c5a36f] active:opacity-80"
                        >
                          {pl?.name}
                        </button>
                            <div className="text-right">
                              <span className="text-2xl font-semibold tabular-nums">{total}</span>
                              <span className={`ml-2 text-sm font-medium ${vsPar < 0 ? "text-emerald-400" : vsPar > 0 ? "text-red-400" : ""}`}>
                                {vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : vsPar}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-[#c5a36f]/60 mt-1">{ps.scores.length} holes played</div>
                        </div>
                      );
                    })}
                  </div>

                  {viewingRound.completed && (
                    <RoundExportPanel
                      round={viewingRound}
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
                            <div className="text-xs text-[#c5a36f]/70 mt-0.5">{new Date(round.date).toLocaleDateString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-[#c5a36f]">{round.playerScores.length} players</div>
                            <div className={`text-xs mt-0.5 ${round.completed ? "text-emerald-400" : "text-amber-400"}`}>
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
            <div className="text-sm font-medium text-[#c5a36f] mb-2">Select Course</div>
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => selectCourseForStart(course.id)}
                    className={`text-left p-4 rounded-2xl border transition ${selectedCourseForStart === course.id ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]" : "border-golf-green-100 dark:border-[#2a5a48]"}`}
                  >
                    <div className="font-medium">{course.name}</div>
                    <div className="text-xs text-[#c5a36f]/70">{course.location} • {course.holes.length} holes</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[#c5a36f]/70">No courses available. Add one first from the Home screen.</div>
            )}
          </div>

          {/* Round Options */}
          {selectedCourseForStart && (() => {
            const startCourse = courses.find((c) => c.id === selectedCourseForStart);
            if (!startCourse) return null;
            const courseIs18 = is18HoleCourse(startCourse);

            if (!courseIs18) {
              return (
                <div className="rounded-2xl border border-golf-green-100 dark:border-[#2a5a48] p-4 text-sm text-[#c5a36f]">
                  9-hole course — round plays all holes (1–9). Hole 10 and 18-hole options are not available.
                </div>
              );
            }

            return (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-[#c5a36f] mb-2">Round Length</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRoundLengthForStart(18)}
                      className={`p-4 rounded-2xl border text-left transition ${roundLengthForStart === 18 ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]" : "border-golf-green-100 dark:border-[#2a5a48]"}`}
                    >
                      <div className="font-medium">18 Holes</div>
                    </button>
                    <button
                      onClick={() => setRoundLengthForStart(9)}
                      className={`p-4 rounded-2xl border text-left transition ${roundLengthForStart === 9 ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]" : "border-golf-green-100 dark:border-[#2a5a48]"}`}
                    >
                      <div className="font-medium">9 Holes</div>
                    </button>
                  </div>
                </div>

                {roundLengthForStart === 9 && (
                  <div>
                    <div className="text-sm font-medium text-[#c5a36f] mb-2">Which Nine?</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setNineSideForStartRound("front")}
                        className={`p-4 rounded-2xl border text-left transition ${nineSideForStart === "front" ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]" : "border-golf-green-100 dark:border-[#2a5a48]"}`}
                      >
                        Front 9 (Holes 1-9)
                      </button>
                      <button
                        onClick={() => setNineSideForStartRound("back")}
                        className={`p-4 rounded-2xl border text-left transition ${nineSideForStart === "back" ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]" : "border-golf-green-100 dark:border-[#2a5a48]"}`}
                      >
                        Back 9 (Holes 10-18)
                      </button>
                    </div>
                  </div>
                )}

                {roundLengthForStart === 18 && (
                  <div>
                    <div className="text-sm font-medium text-[#c5a36f] mb-2">Starting Hole</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setStartingHoleForStart(1)}
                        className={`p-4 rounded-2xl border text-left transition ${startingHoleForStart === 1 ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]" : "border-golf-green-100 dark:border-[#2a5a48]"}`}
                      >
                        Hole 1
                      </button>
                      <button
                        onClick={() => setStartingHoleForStart(10)}
                        className={`p-4 rounded-2xl border text-left transition ${startingHoleForStart === 10 ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]" : "border-golf-green-100 dark:border-[#2a5a48]"}`}
                      >
                        Hole 10
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Choose Players */}
          {selectedCourseForStart && (
            <div>
              <div className="text-sm font-medium text-[#c5a36f] mb-2">Select Players (at least one)</div>
              <div className="space-y-2">
                {players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerForRound(player.id)}
                    className={`w-full flex justify-between items-center p-4 rounded-2xl border text-left transition ${selectedPlayersForStart.includes(player.id) ? "border-[#c5a36f] bg-white dark:bg-[#1f4a3a]" : "border-golf-green-100 dark:border-[#2a5a48]"}`}
                  >
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-[#c5a36f]/70">OG Index {player.handicap} · not USGA</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${selectedPlayersForStart.includes(player.id) ? "bg-[#c5a36f] text-[#051b14]" : "border-golf-green-200 dark:border-[#0f3d24]"}`}>
                      {selectedPlayersForStart.includes(player.id) && "✓"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button onClick={() => setIsStartRoundModalOpen(false)} className="flex-1 py-3.5 rounded-2xl border border-golf-green-200 dark:border-[#0f3d24] font-semibold">
              Cancel
            </button>
            <button
              onClick={startRound}
              disabled={!selectedCourseForStart || selectedPlayersForStart.length === 0}
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
        title={editingPlayerId ? "Edit Player" : "Add New Player"}
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
      <div className="text-center text-[10px] text-[#c5a36f]/40 mt-12 pb-6">
        All data saved privately in your browser (localStorage). Nothing leaves your device.
      </div>
    </div>
  );
}
