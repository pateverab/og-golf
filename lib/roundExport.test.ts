import { describe, expect, it } from "vitest";
import { getRoundExportFilename, copyTextToClipboard } from "@/lib/roundExport";
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

describe("copyTextToClipboard", () => {
  it("uses clipboard.writeText when available", async () => {
    const writes: string[] = [];
    const clipboard = {
      writeText: async (text: string) => {
        writes.push(text);
      },
    };
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { clipboard },
    });
    await copyTextToClipboard("lying 4");
    expect(writes).toEqual(["lying 4"]);
  });

  it("falls back to execCommand when clipboard API is missing", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });

    const calls: string[] = [];
    const textarea = {
      value: "",
      style: {} as Record<string, string>,
      setAttribute() {},
      focus() {},
      select() {},
      setSelectionRange() {},
      remove() {},
    };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: (tag: string) => {
          expect(tag).toBe("textarea");
          return textarea;
        },
        body: {
          appendChild() {},
        },
        getSelection: () => null,
        execCommand: (cmd: string) => {
          calls.push(cmd);
          return true;
        },
      },
    });

    await copyTextToClipboard("hole out 5");
    expect(calls).toEqual(["copy"]);
    expect(textarea.value).toBe("hole out 5");
  });
});
