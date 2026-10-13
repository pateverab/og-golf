import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUGGESTED_COURSE_TEMPLATES } from "./calculations";

/**
 * Guards the confirmed Quito Tenis y Golf Club par order (Par 72, PR #12)
 * against drift. Local course JSON exports are untracked and only checked
 * when present on disk (CI does not have them).
 */
const QUITO = "Quito Tenis y Golf Club";
const CONFIRMED_QUITO_PARS = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 5, 4, 3, 4, 4, 3, 5, 4];
const LOCAL_EXPORTS = ["og-golf-quito-arrayanes.json", "quito-arrayanes-courses.json"];

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("Quito course template", () => {
  const template = SUGGESTED_COURSE_TEMPLATES.find((t) => t.name === QUITO);
  const templatePars: number[] = template?.suggestedPars ?? [];

  it("matches the confirmed par order (front 36, back 36, par 72)", () => {
    expect(template).toBeDefined();
    expect(template!.holeCount).toBe(18);
    expect(templatePars).toEqual(CONFIRMED_QUITO_PARS);
    expect(sum(templatePars.slice(0, 9))).toBe(36);
    expect(sum(templatePars.slice(9))).toBe(36);
    expect(sum(templatePars)).toBe(72);
  });

  for (const file of LOCAL_EXPORTS) {
    const path = join(__dirname, "..", file);
    it.skipIf(!existsSync(path))(`local export ${file} matches the template (skipped when absent)`, () => {
      const data = JSON.parse(readFileSync(path, "utf8")) as {
        courses?: { name: string; holes: { number: number; par: number }[] }[];
      };
      const course = data.courses?.find((c) => c.name === QUITO);
      expect(course, `${QUITO} in ${file}`).toBeDefined();
      const pars = [...course!.holes].sort((a, b) => a.number - b.number).map((h) => h.par);
      expect(pars).toEqual(CONFIRMED_QUITO_PARS);
    });
  }
});
