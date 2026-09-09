import { describe, expect, it } from "vitest";
import { openingLine, draftFor } from "./game-progress";

describe("openingLine", () => {
  it("says nothing for someone who never opened the game", () => {
    expect(openingLine(0, 0, false)).toBe(null);
  });

  it("speaks for someone who played and surfaced nothing, since they can still write", () => {
    expect(openingLine(0, 5, true)).toBe("I played Connected.");
  });

  it("counts what they surfaced", () => {
    expect(openingLine(3, 5, true)).toBe("I played Connected and got 3 of 5.");
  });

  it("reads plainly for a finished game", () => {
    expect(openingLine(5, 5, true)).toBe("I played Connected and got 5 of 5.");
  });

  it("never claims more fragments than the game has", () => {
    expect(openingLine(7, 5, true)).toBe("I played Connected and got 5 of 5.");
  });

  it("says nothing when the stored values are not numbers", () => {
    expect(openingLine(NaN, NaN, true)).toBe("I played Connected.");
    expect(openingLine(3, NaN, true)).toBe("I played Connected.");
  });
});

describe("draftFor", () => {
  it("is empty for someone who never played, so the form is untouched", () => {
    expect(draftFor(null)).toBe("");
  });

  it("leaves the visitor a line of their own to finish", () => {
    expect(draftFor("I played Connected and got 3 of 5.")).toBe(
      "I played Connected and got 3 of 5.\n\nSomething I kept:\n"
    );
  });
});
