import { describe, expect, it } from "vitest";
import { openingLine, draftFor } from "./game-progress";

describe("openingLine", () => {
  it("says nothing for someone who never opened the game", () => {
    expect(openingLine(0, 0, null, false)).toBe(null);
  });

  it("speaks for someone who played and surfaced nothing, since they can still write", () => {
    expect(openingLine(0, 5, null, true)).toBe("I played Connected.");
  });

  it("names where they stopped, which is the part worth replying to", () => {
    expect(openingLine(3, 5, "The Laptop", true)).toBe(
      "I played Connected and got as far as The Laptop — 3 of 5."
    );
  });

  it("says so plainly when they saw everything", () => {
    expect(openingLine(5, 5, "The Notebook", true)).toBe(
      "I played Connected and saw all 5."
    );
  });

  it("falls back to the count when no title was stored", () => {
    expect(openingLine(2, 5, null, true)).toBe("I played Connected and got 2 of 5.");
  });

  it("never claims more fragments than the game has", () => {
    expect(openingLine(9, 5, "The Notebook", true)).toBe(
      "I played Connected and saw all 5."
    );
  });

  it("ignores stored values that are not numbers", () => {
    expect(openingLine(NaN, NaN, "The Hat", true)).toBe("I played Connected.");
  });
});

describe("draftFor", () => {
  it("is empty for someone who never played, so the form is untouched", () => {
    expect(draftFor(null)).toBe("");
  });

  it("leaves the message itself entirely to the sender", () => {
    expect(draftFor("I played Connected and got as far as The Laptop — 3 of 5.")).toBe(
      "I played Connected and got as far as The Laptop — 3 of 5.\n\n"
    );
  });
});
