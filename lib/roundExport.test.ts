import { describe, expect, it } from "vitest";
import { getRoundExportFilename } from "@/lib/roundExport";
import type { RoundExportData } from "@/lib/roundExport";

const sample: RoundExportData = {
  courseName: "Quito Tenis y Golf Club",
  courseLocation: "Quito",
  dateLabel: "Thu, Sep 17, 2026",
  formatLabel: "18 Holes",
  players: [],
};

describe("getRoundExportFilename", () => {
  it("always includes a real extension", () => {
    expect(getRoundExportFilename(sample, "pdf").endsWith(".pdf")).toBe(true);
    expect(getRoundExportFilename(sample, ".pdf").endsWith(".pdf")).toBe(true);
    expect(getRoundExportFilename(sample, "png").endsWith(".png")).toBe(true);
  });
});
