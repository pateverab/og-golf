"use client";

import { useMemo, useRef, useState } from "react";
import type { Course, Player, Round } from "@/lib/types";
import {
  buildRoundExportData,
  captureScorecardImage,
  downloadBlob,
  generateRoundPdf,
  copyTextToClipboard,
  generateRoundTextSummary,
  getRoundExportFilename,
  shareFile,
} from "@/lib/roundExport";
import { RoundScorecard } from "./RoundScorecard";

interface RoundExportPanelProps {
  round: Round;
  course: Course;
  players: Player[];
}

type ExportAction = "pdf-download" | "image-share" | "text-share";

export function RoundExportPanel({ round, course, players }: RoundExportPanelProps) {
  const scorecardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<ExportAction | null>(null);
  const [showShareCopy, setShowShareCopy] = useState(false);

  const exportData = useMemo(
    () => buildRoundExportData(round, course, players),
    [round, course, players]
  );

  const shareTitle = `${exportData.courseName} — ${exportData.dateLabel}`;

  const handleDownloadPdf = async () => {
    setLoading("pdf-download");
    try {
      const blob = await generateRoundPdf(exportData);
      downloadBlob(blob, getRoundExportFilename(exportData, "pdf"));
      setShowShareCopy(true);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleShareImage = async () => {
    setLoading("image-share");
    try {
      if (!scorecardRef.current) throw new Error("Scorecard not ready");
      const blob = await captureScorecardImage(scorecardRef.current);
      const result = await shareFile(blob, getRoundExportFilename(exportData, "png"), shareTitle);
      if (result === "downloaded") {
        alert("Sharing unavailable — image downloaded instead.");
      }
    } catch (error) {
      console.error("Image share failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleShareCopy = async () => {
    setLoading("text-share");
    try {
      const summary = generateRoundTextSummary(exportData);
      await copyTextToClipboard(summary);
      alert("Copied to clipboard! Paste into WhatsApp or Messages.");
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Could not copy to clipboard. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-golf-green-100 dark:border-[#2a5a48]">
      <h3 className="text-lg font-semibold mb-4">Export Round</h3>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={loading !== null}
          className="py-3.5 px-4 rounded-2xl bg-[#c5a36f] text-[#051b14] font-semibold hover:bg-white transition disabled:opacity-50"
        >
          {loading === "pdf-download" ? "Generating…" : "Download PDF"}
        </button>

        <button
          type="button"
          onClick={handleShareImage}
          disabled={loading !== null}
          className="py-3.5 px-4 rounded-2xl border border-[#c5a36f] text-[#c5a36f] font-semibold hover:bg-golf-green-50 dark:hover:bg-[#1f4a3a] transition disabled:opacity-50"
        >
          {loading === "image-share" ? "Capturing…" : "Share Image"}
        </button>
      </div>

      {showShareCopy && (
        <button
          type="button"
          onClick={handleShareCopy}
          disabled={loading !== null}
          className="mt-3 w-full py-2.5 text-sm text-[#c5a36f] font-medium hover:underline disabled:opacity-50"
        >
          {loading === "text-share" ? "Copying…" : "Share a Copy"}
        </button>
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