import type { Course, Player, Round } from "./types";

/**
 * One-time safety copy taken on the first launch of the WHS-style version,
 * BEFORE course migration or index recalculation writes anything. It lives in
 * localStorage (works offline, in Safari and the installed PWA, no prompt
 * needed), and Home offers it once as a downloadable JSON backup.
 */
export const PRE_WHS_BACKUP_KEY = "og-golf-pre-whs-backup";
export const PRE_WHS_BACKUP_DONE_KEY = "og-golf-pre-whs-backup-done";

export interface BackupFile {
  courses: Course[];
  players: Player[];
  rounds: Round[];
  exportDate: string;
  version: string;
  note?: string;
}

export function buildBackup(courses: Course[], players: Player[], rounds: Round[], note?: string): BackupFile {
  return { courses, players, rounds, exportDate: new Date().toISOString(), version: "1.0", ...(note ? { note } : {}) };
}

/** True when the snapshot should be taken: there is data and no snapshot yet. */
export function shouldSnapshot(existing: string | null, courses: unknown[], players: unknown[], rounds: unknown[]): boolean {
  return existing === null && courses.length + players.length + rounds.length > 0;
}

/** Take the snapshot if needed. Never throws (a full storage just skips it). */
export function snapshotPreWhsBackup(courses: Course[], players: Player[], rounds: Round[]): void {
  if (typeof window === "undefined") return;
  try {
    const existing = window.localStorage.getItem(PRE_WHS_BACKUP_KEY);
    if (!shouldSnapshot(existing, courses, players, rounds)) return;
    window.localStorage.setItem(
      PRE_WHS_BACKUP_KEY,
      JSON.stringify(buildBackup(courses, players, rounds, "Automatic copy taken before the WHS-style OG Index update"))
    );
  } catch {
    // ignore
  }
}

export function readPreWhsBackup(): BackupFile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PRE_WHS_BACKUP_KEY);
    return raw ? (JSON.parse(raw) as BackupFile) : null;
  } catch {
    return null;
  }
}

export function preWhsBackupPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PRE_WHS_BACKUP_KEY) !== null && window.localStorage.getItem(PRE_WHS_BACKUP_DONE_KEY) === null;
  } catch {
    return false;
  }
}

export function markPreWhsBackupDone(): void {
  try {
    window.localStorage.setItem(PRE_WHS_BACKUP_DONE_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
}

/**
 * Save a JSON file from a tap. On iOS (Safari or Home Screen app) the share
 * sheet with a file is the reliable way to "Save to Files"; elsewhere a Blob
 * download link is used. Must be called from a user gesture.
 */
export async function saveJsonFile(name: string, data: unknown): Promise<"shared" | "downloaded" | "cancelled"> {
  const text = JSON.stringify(data, null, 2);
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    const file = new File([text], name, { type: "application/json" });
    if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: name });
      return "shared";
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return "cancelled";
    // fall through to download
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
