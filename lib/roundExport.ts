import {
  getPlayerHoleBreakdown,
  getRoundFormatLabel,
  getScoreVsParForPlayerInRound,
  getTotalScoreForPlayerInRound,
} from "./calculations";
import type { Course, Player, Round } from "./types";

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

export function getRoundExportFilename(data: RoundExportData, extension: string): string {
  const datePart = data.dateLabel.replace(/,/g, "").split(" ").slice(-3).join("-");
  return `og-golf-${slugify(data.courseName)}-${slugify(datePart)}.${extension}`;
}

type PdfDoc = import("jspdf").jsPDF & { lastAutoTable: { finalY: number } };

function getTableEndY(doc: PdfDoc): number {
  return doc.lastAutoTable.finalY;
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
          [...front.map((h) => String(h.par)), String(front.reduce((s, h) => s + h.par, 0)), ...back.map((h) => String(h.par)), String(back.reduce((s, h) => s + h.par, 0)), String(front.reduce((s, h) => s + h.par, 0) + back.reduce((s, h) => s + h.par, 0))],
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
      });
    }

    cursorY = getTableEndY(doc) + 20;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(
      `Generated by OG Golf • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 24,
      { align: "center" }
    );
  }

  return doc.output("blob");
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareFile(
  blob: Blob,
  filename: string,
  title: string
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, {
    type: blob.type || "application/octet-stream",
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