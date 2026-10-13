import { describe, expect, it } from "vitest";
import { buildBackup, shouldSnapshot } from "./backup";

describe("pre-WHS backup snapshot", () => {
  it("only when there is data and no snapshot yet", () => {
    expect(shouldSnapshot(null, [], [], [])).toBe(false);
    expect(shouldSnapshot(null, [{}], [], [])).toBe(true);
    expect(shouldSnapshot("{}", [{}], [{}], [{}])).toBe(false);
  });
  it("is an importable backup file", () => {
    const b = buildBackup([], [], [], "note");
    expect(Object.keys(b)).toEqual(["courses", "players", "rounds", "exportDate", "version", "note"]);
  });
});
