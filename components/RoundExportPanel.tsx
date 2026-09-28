"use client";

import { useMemo, useRef, useState } from "react";
import type { Course, Player, Round } from "@/lib/types";
import {
  buildRoundExportData,
  captureScorecardImage,
  downloadRoundPdf,
  shareTextSummary,
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

  const exportData = useMemo(
    () => buildRoundExportData(round, course, players),
    [round, course, players]
  );

  const shareTitle = `${exportData.courseName} — ${exportData.dateLabel}`;

  const handleDownloadPdf = async () => {
    setLoading("pdf-download");
    try {
      await downloadRoundPdf(exportData);
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
      const result = await shareTextSummary(summary, shareTitle);
      if (result === "copied") {
        alert("Copied to clipboard! Paste into WhatsApp or Messages.");
      }
    } catch (error) {
      console.error("Share copy failed:", error);
      alert("Could not share this round. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-og-border">
      <h3 className="text-lg font-semibold mb-4">Export Round</h3>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={loading !== null}
          className="py-3.5 px-4 rounded-2xl bg-og-accent text-og-on-accent font-semibold hover:bg-og-accent-hover transition disabled:opacity-50"
        >
          {loading === "pdf-download" ? "Generating…" : "Download PDF"}
        </button>

        <button
          type="button"
          onClick={handleShareImage}
          disabled={loading !== null}
          className="py-3.5 px-4 rounded-2xl border border-og-accent-line text-og-accent-text font-semibold hover:bg-og-raised transition disabled:opacity-50"
        >
          {loading === "image-share" ? "Capturing…" : "Share Image"}
        </button>
      </div>

      <button
        type="button"
        onClick={handleShareCopy}
        disabled={loading !== null}
        className="mt-3 w-full py-2.5 text-sm text-og-accent-text font-medium hover:underline disabled:opacity-50"
      >
        {loading === "text-share" ? "Sharing…" : "Share a Copy"}
      </button>

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