import { describe, expect, it } from "vitest";
import { OPTION_PRESSED_CLASS, optionPillClass, optionSubtextClass, optionTileClass } from "./selectable";

describe("selectable option classes", () => {
  it("fills selected options with the Start New Round gold and its text token", () => {
    for (const cls of [optionTileClass(true), optionPillClass(true)]) {
      expect(cls).toMatch(/(^| )bg-og-accent( |$)/);
      expect(cls).toMatch(/(^| )text-og-on-accent( |$)/);
    }
    expect(optionSubtextClass(true)).toBe("text-og-on-accent");
  });

  it("is not border-only when unselected either way, and never gold-filled", () => {
    expect(optionTileClass(false)).not.toMatch(/(^| )bg-og-accent( |$)/);
    expect(optionPillClass(false)).not.toMatch(/(^| )bg-og-accent( |$)/);
    expect(optionSubtextClass(false)).toContain("text-og-muted");
  });

  it("darkens to the pressed gold on :active in both states", () => {
    for (const sel of [true, false]) {
      expect(optionTileClass(sel)).toContain(OPTION_PRESSED_CLASS);
      expect(optionPillClass(sel)).toContain(OPTION_PRESSED_CLASS);
    }
    expect(OPTION_PRESSED_CLASS).toContain("active:bg-og-accent-pressed");
    expect(OPTION_PRESSED_CLASS).toContain("active:text-og-on-accent");
    // secondary lines inside a pressed tile follow the pressed text color
    expect(optionTileClass(false)).toMatch(/(^| )group( |$)/);
    expect(optionSubtextClass(false)).toContain("group-active:text-og-on-accent");
  });

  it("uses theme tokens only", () => {
    const all = [optionTileClass(true), optionTileClass(false), optionPillClass(true), optionPillClass(false)].join(" ");
    expect(all).not.toMatch(/#[0-9a-f]{3,8}/i);
    for (const cls of all.split(/\s+/)) {
      if (/^(active:|hover:)?(bg|text|border)-/.test(cls)) expect(cls).toMatch(/-og-/);
    }
  });
});
