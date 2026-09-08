import { describe, expect, it } from "vitest";
import { progressLine } from "./game-progress";

describe("progressLine", () => {
  it("says nothing for someone who never opened the game", () => {
    expect(progressLine(0, 0)).toBe(null);
  });

  it("says nothing for someone who played but surfaced nothing", () => {
    expect(progressLine(0, 4)).toBe(null);
  });

  it("says nothing when the stored values are not numbers", () => {
    expect(progressLine(NaN, NaN)).toBe(null);
    expect(progressLine(3, NaN)).toBe(null);
  });

  it("reports the count and the percent", () => {
    expect(progressLine(3, 4)).toBe(
      "Played Connected — reached 3 of 4 fragments (75%)."
    );
  });

  it("reports a finished game", () => {
    expect(progressLine(4, 4)).toBe(
      "Played Connected — reached 4 of 4 fragments (100%)."
    );
  });

  it("rounds to whole percents", () => {
    expect(progressLine(1, 3)).toBe(
      "Played Connected — reached 1 of 3 fragments (33%)."
    );
  });

  it("never claims more fragments than the game has", () => {
    expect(progressLine(6, 4)).toBe(
      "Played Connected — reached 4 of 4 fragments (100%)."
    );
  });
});
