import {
  getPlayerHoleBreakdown,
  getRoundFormatLabel,
  getScoreVsParForPlayerInRound,
  getTotalScoreForPlayerInRound,
} from "./calculations";
import type { Course, Player, Round } from "./types";
import {
  SCORE_MARK_LEGEND,
  isCircleMark,
  markRingCount,
  scoreMark,
} from "./scoreMarks";

export interface RoundExportPlayer {
  name: string;
  nickname?: string;
  total: number;
  vsPar: number;
  holes: Array<{ number: number; par: number; score: number | null; vsPar: number | null }>;
  frontTotal: number;
  backTotal: number;
}

export interface RoundExportData {
  courseName: string;
  courseLocation: string;
  dateLabel: string;
  formatLabel: string;
  players: RoundExportPlayer[];
}

function formatVsPar(vsPar: number): string {
  if (vsPar === 0) return "E";
  return vsPar > 0 ? `+${vsPar}` : String(vsPar);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function buildRoundExportData(
  round: Round,
  course: Course,
  players: Player[]
): RoundExportData {
  const roundConfig = {
    roundLength: round.roundLength,
    nineSide: round.nineSide,
    startingHole: round.startingHole,
  };

  const exportPlayers = round.playerScores
    .map((playerScore) => {
      const player = players.find((p) => p.id === playerScore.playerId);
      if (!player) return null;

      const breakdown = getPlayerHoleBreakdown(playerScore, course, roundConfig);
      const frontHoles = breakdown.filter((h) => h.holeNumber <= 9);
      const backHoles = breakdown.filter((h) => h.holeNumber > 9);

      const sumScores = (holes: typeof breakdown) =>
        holes.reduce((sum, h) => sum + (h.score ?? 0), 0);

      return {
        name: player.name,
        nickname: player.nickname,
        total: getTotalScoreForPlayerInRound(playerScore, course),
        vsPar: getScoreVsParForPlayerInRound(playerScore, course),
        holes: breakdown.map((h) => ({
          number: h.holeNumber,
          par: h.par,
          score: h.score,
          vsPar: h.vsPar,
        })),
        frontTotal: sumScores(frontHoles),
        backTotal: sumScores(backHoles),
      };
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.total - b.total || a.vsPar - b.vsPar);

  return {
    courseName: course.name,
    courseLocation: course.location,
    dateLabel: new Date(round.date).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    formatLabel: getRoundFormatLabel(course, roundConfig),
    players: exportPlayers,
  };
}

export function generateRoundTextSummary(data: RoundExportData): string {
  const lines: string[] = [
    "⛳ OG GOLF — ROUND SUMMARY",
    "",
    `📍 ${data.courseName}`,
    `   ${data.courseLocation}`,
    `📅 ${data.dateLabel}`,
    `🏌️ ${data.formatLabel}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "LEADERBOARD",
    "━━━━━━━━━━━━━━━━━━━━",
  ];

  data.players.forEach((player, index) => {
    const rank = index + 1;
    const medal = rank === 1 ? "🥇 " : rank === 2 ? "🥈 " : rank === 3 ? "🥉 " : `${rank}. `;
    const label = player.nickname ? `${player.name} (${player.nickname})` : player.name;
    lines.push(`${medal}${label} — ${player.total} (${formatVsPar(player.vsPar)})`);
  });

  lines.push("", "━━━━━━━━━━━━━━━━━━━━", "SCORECARDS", "━━━━━━━━━━━━━━━━━━━━");

  for (const player of data.players) {
    const label = player.nickname ? `${player.name} (${player.nickname})` : player.name;
    lines.push("", `${label} — ${player.total} (${formatVsPar(player.vsPar)})`);

    const is18 = player.holes.length > 9;
    if (is18) {
      const front = player.holes.filter((h) => h.number <= 9);
      const back = player.holes.filter((h) => h.number > 9);
      const fmt = (holes: typeof front) =>
        holes.map((h) => (h.score !== null ? String(h.score) : "—")).join("·");

      lines.push(`Front 9: ${player.frontTotal}  |  Back 9: ${player.backTotal}`);
      lines.push(`  ${fmt(front)}`);
      lines.push(`  ${fmt(back)}`);
    } else {
      for (const hole of player.holes) {
        const score = hole.score !== null ? String(hole.score) : "—";
        const vs = hole.vsPar !== null ? formatVsPar(hole.vsPar) : "—";
        lines.push(`  #${hole.number}  Par ${hole.par}  →  ${score} (${vs})`);
      }
    }
  }

  lines.push("", "— Tracked with OG Golf");
  return lines.join("\n");
}

/**
 * Copy text to the clipboard.
 * Prefers navigator.clipboard; falls back to execCommand for iOS Safari
 * over HTTP / denied permission (common on LAN and some PWA contexts).
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through — iOS often rejects Clipboard API outside HTTPS or without gesture trust.
    }
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);

  const selection = document.getSelection();
  const priorRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    textarea.remove();
    if (selection) {
      selection.removeAllRanges();
      if (priorRange) selection.addRange(priorRange);
    }
  }

  if (!ok) {
    throw new Error("Clipboard is unavailable");
  }
}

/**
 * Share round text: native share sheet when available (iPhone), else clipboard.
 * Returns "shared" | "copied". AbortError (user cancel) counts as "shared"
 * so callers do not show a false clipboard error.
 */
export async function shareTextSummary(
  text: string,
  title: string
): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const data: ShareData = { title, text };
    try {
      if (!navigator.canShare || navigator.canShare({ text })) {
        await navigator.share(data);
        return "shared";
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "shared";
      }
      // Fall through to clipboard.
    }
  }

  await copyTextToClipboard(text);
  return "copied";
}

export function getRoundExportFilename(data: RoundExportData, extension: string): string {
  const datePart = data.dateLabel.replace(/,/g, "").split(" ").slice(-3).join("-");
  const ext = extension.replace(/^\./, "").toLowerCase() || "bin";
  return `og-golf-${slugify(data.courseName)}-${slugify(datePart)}.${ext}`;
}

function ensurePdfFilename(filename: string): string {
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
}

function pdfBlobFromDoc(doc: import("jspdf").jsPDF): Blob {
  // Explicit MIME — Safari/iOS often treats bare doc.output("blob") as octet-stream / extensionless.
  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}

type PdfDoc = import("jspdf").jsPDF & { lastAutoTable: { finalY: number } };

function getTableEndY(doc: PdfDoc): number {
  return doc.lastAutoTable.finalY;
}


/** Draw official scorecard circle/square marks centered on an autoTable cell. */
function drawScoreMarkOnCell(
  doc: import("jspdf").jsPDF,
  cell: { x: number; y: number; width: number; height: number },
  vsPar: number | null
): void {
  const kind = scoreMark(vsPar);
  const rings = markRingCount(kind);
  if (rings === 0) return;

  const cx = cell.x + cell.width / 2;
  const cy = cell.y + cell.height / 2;
  const maxR = Math.min(cell.width, cell.height) / 2 - 1.5;
  if (maxR < 4) return;

  const under = isCircleMark(kind);
  if (under) {
    doc.setDrawColor(15, 61, 36); // dark green
  } else {
    doc.setDrawColor(139, 41, 66); // burgundy
  }
  doc.setLineWidth(0.9);

  for (let i = 0; i < rings; i++) {
    const r = maxR - i * 2.2;
    if (r < 3) break;
    if (under) {
      doc.circle(cx, cy, r, "S");
    } else {
      const side = r * 2;
      doc.rect(cx - r, cy - r, side, side, "S");
    }
  }
}

export async function generateRoundPdf(data: RoundExportData): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "pt", format: "letter" }) as PdfDoc;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const gold = [197, 163, 111] as [number, number, number];
  const green = [5, 27, 20] as [number, number, number];
  const muted = [90, 107, 98] as [number, number, number];

  doc.setFillColor(...green);
  doc.rect(0, 0, pageWidth, 72, "F");
  doc.setTextColor(...gold);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("OG Golf", margin, 36);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Scorecard", margin, 54);

  doc.setTextColor(...green);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.courseName, margin, 100);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...muted);
  doc.text(data.courseLocation, margin, 118);
  doc.text(data.dateLabel, margin, 134);
  doc.text(data.formatLabel, margin, 150);

  autoTable(doc, {
    startY: 168,
    head: [["Player", "Total", "vs Par", "Holes"]],
    body: data.players.map((player) => [
      player.nickname ? `${player.name} (${player.nickname})` : player.name,
      String(player.total),
      formatVsPar(player.vsPar),
      String(player.holes.filter((h) => h.score !== null).length),
    ]),
    theme: "grid",
    headStyles: { fillColor: green, textColor: gold, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    alternateRowStyles: { fillColor: [240, 247, 240] },
    margin: { left: margin, right: margin },
  });

  let cursorY = getTableEndY(doc) + 24;

  for (const player of data.players) {
    if (cursorY > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage();
      cursorY = margin;
    }

    doc.setTextColor(...green);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(
      `${player.name} — ${player.total} (${formatVsPar(player.vsPar)})`,
      margin,
      cursorY
    );
    cursorY += 10;

    const is18 = player.holes.length > 9;
    if (is18) {
      const front = player.holes.filter((h) => h.number <= 9);
      const back = player.holes.filter((h) => h.number > 9);

      // Column map for SCORE row (body index 1): 0-8 front, 9 OUT, 10-18 back, 19 IN, 20 TOT
      const scoreVsParByCol: Array<number | null> = [
        ...front.map((h) => h.vsPar),
        null, // OUT
        ...back.map((h) => h.vsPar),
        null, // IN
        null, // TOT
      ];

      autoTable(doc, {
        startY: cursorY,
        head: [
          [
            ...front.map((h) => String(h.number)),
            "OUT",
            ...back.map((h) => String(h.number)),
            "IN",
            "TOT",
          ],
        ],
        body: [
          [
            ...front.map((h) => String(h.par)),
            String(front.reduce((s, h) => s + h.par, 0)),
            ...back.map((h) => String(h.par)),
            String(back.reduce((s, h) => s + h.par, 0)),
            String(
              front.reduce((s, h) => s + h.par, 0) + back.reduce((s, h) => s + h.par, 0)
            ),
          ],
          [
            ...front.map((h) => (h.score !== null ? String(h.score) : "—")),
            String(player.frontTotal || "—"),
            ...back.map((h) => (h.score !== null ? String(h.score) : "—")),
            String(player.backTotal || "—"),
            String(player.total),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: green, textColor: gold, fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 4, halign: "center" },
        margin: { left: margin, right: margin },
        didDrawCell: (hookData) => {
          if (hookData.section !== "body" || hookData.row.index !== 1) return;
          const vs = scoreVsParByCol[hookData.column.index];
          if (vs === null || vs === undefined) return;
          drawScoreMarkOnCell(doc, hookData.cell, vs);
        },
      });
    } else {
      autoTable(doc, {
        startY: cursorY,
        head: [["Hole", "Par", "Score", "vs Par"]],
        body: player.holes.map((hole) => [
          String(hole.number),
          String(hole.par),
          hole.score !== null ? String(hole.score) : "—",
          hole.vsPar !== null ? formatVsPar(hole.vsPar) : "—",
        ]),
        theme: "grid",
        headStyles: { fillColor: green, textColor: gold },
        styles: { fontSize: 9, cellPadding: 5 },
        margin: { left: margin, right: margin },
        didDrawCell: (hookData) => {
          // Score column only (index 2) — leave Hole/Par/vs Par and totals alone
          if (hookData.section !== "body" || hookData.column.index !== 2) return;
          const hole = player.holes[hookData.row.index];
          if (!hole) return;
          drawScoreMarkOnCell(doc, hookData.cell, hole.vsPar);
        },
      });
    }

    cursorY = getTableEndY(doc) + 20;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(SCORE_MARK_LEGEND, pageWidth / 2, pageH - 36, { align: "center" });
    doc.text(
      `Generated by OG Golf • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageH - 24,
      { align: "center" }
    );
  }

  return pdfBlobFromDoc(doc);
}


export async function captureScorecardImage(element: HTMLElement): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create image"));
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const safeName = filename.includes(".") ? filename : `${filename}.bin`;
  const typedBlob =
    blob.type && blob.type !== "application/octet-stream"
      ? blob
      : new Blob([blob], {
          type: safeName.toLowerCase().endsWith(".pdf")
            ? "application/pdf"
            : safeName.toLowerCase().endsWith(".png")
              ? "image/png"
              : blob.type || "application/octet-stream",
        });

  const url = URL.createObjectURL(typedBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Delay revoke so Safari can start the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Build and download a round PDF with an explicit .pdf name (Safari/iOS-friendly). */
export async function downloadRoundPdf(data: RoundExportData): Promise<void> {
  const blob = await generateRoundPdf(data);
  const filename = ensurePdfFilename(getRoundExportFilename(data, "pdf"));

  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  if (isIOS && typeof navigator !== "undefined" && navigator.share) {
    const file = new File([blob], filename, { type: "application/pdf" });
    const shareData: ShareData = { files: [file], title: filename };
    if (!navigator.canShare || navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
  }

  downloadBlob(blob, filename);
}

export async function shareFile(
  blob: Blob,
  filename: string,
  title: string
): Promise<"shared" | "downloaded"> {
  const inferredType = filename.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : filename.toLowerCase().endsWith(".png")
      ? "image/png"
      : "application/octet-stream";
  const file = new File([blob], filename, {
    type: blob.type && blob.type !== "application/octet-stream" ? blob.type : inferredType,
  });

  if (typeof navigator !== "undefined" && navigator.share) {
    const shareData: ShareData = { title, files: [file] };
    if (!navigator.canShare || navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return "shared";
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return "shared";
        }
      }
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
}

export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    return navigator.canShare({
      files: [new File([""], "test.pdf", { type: "application/pdf" })],
    });
  } catch {
    return false;
  }
}