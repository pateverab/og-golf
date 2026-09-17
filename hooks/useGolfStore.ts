"use client";

import { useEffect, useState } from "react";
import type { ActiveRound, Course, Player, Round } from "@/lib/types";
import {
  getCourses,
  saveCourses,
  getPlayers,
  savePlayers,
  getRounds,
  saveRounds,
  getActiveRound,
  saveActiveRound,
  clearActiveRound,
} from "@/lib/storage";

/**
 * Owns OG Golf domain data + localStorage hydrate/persist.
 * UI chrome (tabs, modals, install CTA) stays in app/page.tsx.
 */
export function useGolfStore() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [storageHydrated, setStorageHydrated] = useState(false);
  /** True after hydrate if an active round was restored (page can switch tab). */
  const [restoredActiveRound, setRestoredActiveRound] = useState(false);

  useEffect(() => {
    setCourses(getCourses());
    setPlayers(getPlayers());
    setRounds(getRounds());

    const stored = getActiveRound();
    if (stored?.round) {
      setActiveRound(stored.round);
      setCurrentHole(stored.currentHole || stored.round.startingHole || 1);
      setRestoredActiveRound(true);
    }

    setStorageHydrated(true);
  }, []);

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

  useEffect(() => {
    if (!storageHydrated) return;
    if (activeRound) {
      saveActiveRound({ round: activeRound, currentHole });
    } else {
      clearActiveRound();
    }
  }, [activeRound, currentHole, storageHydrated]);

  useEffect(() => {
    if (!activeRound) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [activeRound]);

  return {
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
    clearActiveRound,
  };
}
