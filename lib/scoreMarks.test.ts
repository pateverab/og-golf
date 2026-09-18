import { describe, expect, it } from "vitest";
import { scoreMark } from "@/lib/scoreMarks";

describe("scoreMark", () => {
  it("maps birdie / eagle / bogey / none from vs-par", () => {
    // par 4 score 3 → -1 birdie
    expect(scoreMark(3 - 4)).toBe("birdie");
    // par 3 score 1 → -2 eagle (incl. hole-in-one)
    expect(scoreMark(1 - 3)).toBe("eagle");
    // par 4 score 5 → +1 bogey
    expect(scoreMark(5 - 4)).toBe("bogey");
    // unscored
    expect(scoreMark(null)).toBe("none");
  });

  it("covers albatross, par, double, and +3+", () => {
    expect(scoreMark(-3)).toBe("albatross");
    expect(scoreMark(-4)).toBe("albatross");
    expect(scoreMark(0)).toBe("par");
    expect(scoreMark(2)).toBe("double");
    expect(scoreMark(5)).toBe("double");
    expect(scoreMark(undefined)).toBe("none");
  });
});
