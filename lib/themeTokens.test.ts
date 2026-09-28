import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_CHROME_COLORS, THEME_LABELS, THEME_STORAGE_KEY } from "./theme";

/**
 * Guards the Clubhouse / Sunlight tokens in app/globals.css against the
 * WCAG pairs from the approved palette spec (schemes.md, section 3).
 */

type Tokens = Record<string, [number, number, number]>;

const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");
const tailwindConfig = readFileSync(join(__dirname, "..", "tailwind.config.ts"), "utf8");

function parseBlock(selector: ":root" | ".dark"): Tokens {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`missing ${selector} block`);
  const body = css.slice(start, css.indexOf("}", start));
  const tokens: Tokens = {};
  for (const m of body.matchAll(/--og-([a-z-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
    tokens[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return tokens;
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// [foreground token, background token, required ratio, spec label]
const PAIRS: [string, string, number, string][] = [
  ["text", "bg", 4.5, "Text / background"],
  ["text", "surface", 4.5, "Text / surface (strip digits)"],
  ["text", "raised", 4.5, "Text / surface-raised (Lying value)"],
  ["text", "now-bg", 4.5, "Text / NOW cell"],
  ["muted", "bg", 4.5, "Muted / background"],
  ["muted", "surface", 4.5, "Muted / surface (P4 in strip)"],
  ["muted", "raised", 4.5, "Muted / surface-raised (LYING label)"],
  ["accent-text", "bg", 4.5, "Gold text / background"],
  ["accent-text", "chip", 4.5, "Gold text / unselected chip"],
  ["accent-text", "raised", 4.5, "Gold text / raised (Next shot)"],
  ["on-accent", "accent", 4.5, "+1 label (text on gold)"],
  ["on-primary", "primary", 4.5, "Hole Out label (text on green)"],
  ["on-par-pill", "par-pill", 4.5, "Par pill label"],
  ["total-text", "total-bg", 4.5, "Big gold Total / its background"],
  ["total-label", "total-bg", 4.5, "TOTAL · NAME label / Total bg"],
  ["total-danger", "total-bg", 4.5, "Total vs-par (+3) / Total bg"],
  ["total-success", "total-bg", 4.5, "Total vs-par (-1) / Total bg"],
  ["total-sub", "total-bg", 4.5, "+N this hole / Total bg"],
  ["plus-border", "bg", 3, "+1 button boundary / background"],
  ["accent-line", "bg", 3, "Gold outline (Hole Out, Penalty, Card) / background"],
  ["penalty-border", "bg", 3, "Penalty border / background"],
  ["accent-line", "now-bg", 3, "NOW border / NOW fill"],
  ["border", "bg", 3, "Control border / background"],
  ["border", "surface", 3, "Strip-cell border / surface"],
  ["chip-border", "bg", 3, "Unselected chip border / background"],
  ["chip-selected-border", "chip", 3, "Selected chip boundary vs unselected chip"],
  ["success", "surface", 3, "Birdie circle mark / surface"],
  ["danger", "surface", 3, "Bogey square mark / surface"],
  ["success", "bg", 4.5, "Under-par text / background"],
  ["danger", "bg", 4.5, "Over-par text / background (and Quit)"],
  ["live", "now-bg", 4.5, "'in play' label / NOW cell"],
  ["accent-text", "disabled-bg", 4.5, "Lie hint (gold) / disabled +1 bg"],
  ["on-danger", "danger", 4.5, "Delete label / danger fill"],
];

const schemes = { Sunlight: parseBlock(":root"), Clubhouse: parseBlock(".dark") } as const;

describe("theme tokens", () => {
  it("keeps the stored values and maps them to the new names", () => {
    expect(THEME_STORAGE_KEY).toBe("og-golf-theme");
    expect(THEME_LABELS).toEqual({ dark: "Clubhouse", light: "Sunlight" });
  });

  it("defines the same tokens in both schemes, all exposed to Tailwind", () => {
    const sun = Object.keys(schemes.Sunlight).sort();
    expect(sun.length).toBeGreaterThan(20);
    expect(Object.keys(schemes.Clubhouse).sort()).toEqual(sun);
    for (const name of sun) {
      expect(tailwindConfig).toContain(`var(--og-${name})`);
    }
  });

  it("uses each scheme's background as the browser chrome color", () => {
    expect(THEME_CHROME_COLORS.light).toBe(hex(schemes.Sunlight.bg));
    expect(THEME_CHROME_COLORS.dark).toBe(hex(schemes.Clubhouse.bg));
  });

  it("matches the approved hero values", () => {
    expect(hex(schemes.Sunlight["total-bg"])).toBe("#0a2e1f");
    expect(hex(schemes.Sunlight["total-text"])).toBe("#ecd08f");
    expect(hex(schemes.Sunlight["plus-border"])).toBe("#0a2e1f");
    expect(hex(schemes.Sunlight["chip-selected-border"])).toBe("#0a2e1f");
    expect(hex(schemes.Clubhouse.bg)).toBe("#06231a");
    expect(hex(schemes.Clubhouse.accent)).toBe("#d8b56f");
  });

  for (const [scheme, tokens] of Object.entries(schemes)) {
    describe(scheme, () => {
      it.each(PAIRS)("%s on %s ≥ %s (%s)", (fg, bg, need) => {
        expect(tokens[fg], `--og-${fg}`).toBeDefined();
        expect(tokens[bg], `--og-${bg}`).toBeDefined();
        expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(need);
      });
    });
  }
});
