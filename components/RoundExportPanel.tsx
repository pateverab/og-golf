"use client";

import { useMemo, useRef, useState } from "react";
import type { Course, Player, Round } from "@/lib/types";
import {
  buildRoundExportData,
  canShareFiles,
  captureScorecardImage,
  downloadBlob,
  generateRoundPdf,
  generateRoundTextSummary,
  getRoundExportFilename,
  shareFile,
  shareText,
} from "@/lib/roundExport";
import { RoundScorecard } from "./RoundScorecard";

interface RoundExportPanelProps {
  round: Round;
  course: Course;
  players: Player[];
}

type ExportAction = "pdf-download" | "pdf-share" | "image-share" | "text-share";

export function RoundExportPanel({ round, course, players }: RoundExportPanelProps) {
  const scorecardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<ExportAction | null>(null);
  const shareSupported = useMemo(() => canShareFiles(), []);

  const exportData = useMemo(
    () => buildRoundExportData(round, course, players),
    [round, course, players]
  );

  const shareTitle = `${exportData.courseName} — ${exportData.dateLabel}`;

  const runExport = async (action: ExportAction) => {
    setLoading(action);
    try {
      if (action === "pdf-download") {
        const blob = await generateRoundPdf(exportData);
        downloadBlob(blob, getRoundExportFilename(exportData, "pdf"));
        return;
      }

      if (action === "pdf-share") {
        const blob = await generateRoundPdf(exportData);
        const result = await shareFile(blob, getRoundExportFilename(exportData, "pdf"), shareTitle);
        if (result === "downloaded") {
          alert("Sharing unavailable — PDF downloaded instead.");
        }
        return;
      }

      if (action === "image-share") {
        if (!scorecardRef.current) {
          throw new Error("Scorecard not ready");
        }
        const blob = await captureScorecardImage(scorecardRef.current);
        const result = await shareFile(blob, getRoundExportFilename(exportData, "png"), shareTitle);
        if (result === "downloaded") {
          alert("Sharing unavailable — image downloaded instead.");
        }
        return;
      }

      const summary = generateRoundTextSummary(exportData);
      const result = await shareText(summary, shareTitle);
      if (result === "copied") {
        alert("Round summary copied! Paste it into WhatsApp or any chat.");
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-golf-green-100 dark:border-[#2a5a48]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Export Round</h3>
        <span className="text-[10px] uppercase tracking-wider text-[#c5a36f]/70">Scorecard</span>
      </div>

      <p className="text-sm text-[#c5a36f]/80 mb-4">
        Download or share a scorecard — or send a text summary perfect for WhatsApp.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => runExport("pdf-download")}
          disabled={loading !== null}
          className="py-3.5 px-4 rounded-2xl bg-[#c5a36f] text-[#051b14] font-semibold hover:bg-white transition disabled:opacity-50"
        >
          {loading === "pdf-download" ? "Generating…" : "Download PDF"}
        </button>

        <button
          type="button"
          onClick={() => runExport("pdf-share")}
          disabled={loading !== null}
          className="py-3.5 px-4 rounded-2xl border border-[#c5a36f] text-[#c5a36f] font-semibold hover:bg-golf-green-50 dark:hover:bg-[#1f4a3a] transition disabled:opacity-50"
        >
          {loading === "pdf-share"
            ? "Preparing…"
            : shareSupported
              ? "Share PDF"
              : "Share PDF"}
        </button>

        <button
          type="button"
          onClick={() => runExport("image-share")}
          disabled={loading !== null}
          className="py-3.5 px-4 rounded-2xl border border-golf-green-200 dark:border-[#2a5a48] text-[#c5a36f] font-semibold hover:bg-golf-green-50 dark:hover:bg-[#1f4a3a] transition disabled:opacity-50"
        >
          {loading === "image-share" ? "Capturing…" : "Share Image"}
        </button>

        <button
          type="button"
          onClick={() => runExport("text-share")}
          disabled={loading !== null}
          className="py-3.5 px-4 rounded-2xl border border-golf-green-200 dark:border-[#2a5a48] text-[#c5a36f] font-semibold hover:bg-golf-green-50 dark:hover:bg-[#1f4a3a] transition disabled:opacity-50 col-span-2 sm:col-span-1"
        >
          {loading === "text-share" ? "Preparing…" : "Share Round Summary"}
        </button>
      </div>

      {!shareSupported && (
        <p className="text-xs text-[#c5a36f]/60 mt-3">
          File sharing opens your device share sheet when supported; otherwise the file downloads automatically.
        </p>
      )}

      <div
        ref={scorecardRef}
        aria-hidden="true"
        className="fixed left-[-10000px] top-0 pointer-events-none"
      >
        <RoundScorecard data={exportData} />
      </div>
    </div>
  );
}