import { describe, expect, it } from "vitest";
import { draftFrom } from "./game-progress";

const build = { title: "The Build", tries: 1 };
const johns = { title: "No Johns", tries: 4 };
const laptop = { title: "The Laptop", tries: 7 };

describe("draftFrom", () => {
  it("is empty for someone who never played, so the form is untouched", () => {
    expect(draftFrom([], 5, false)).toBe("");
  });

  it("speaks for someone who played and surfaced nothing", () => {
    expect(draftFrom([], 5, true)).toBe("I played Connected.\n\n");
  });

  it("says how far, then what each one cost", () => {
    expect(draftFrom([build, johns, laptop], 5, true)).toBe(
      "I played Connected — 3 of 5.\n\n" +
        "The Build — 1 try\n" +
        "No Johns — 4 tries\n" +
        "The Laptop — 7 tries\n\n"
    );
  });

  it("says all rather than a score when they finished", () => {
    expect(draftFrom([build, johns], 2, true)).toBe(
      "I played Connected — all 2.\n\n" + "The Build — 1 try\n" + "No Johns — 4 tries\n\n"
    );
  });

  it("says try rather than tries for a first-time clear", () => {
    expect(draftFrom([build], 5, true)).toContain("The Build — 1 try\n");
  });

  it("skips an entry with no title, rather than printing a blank row", () => {
    expect(draftFrom([{ title: "", tries: 0 }, johns], 5, true)).toBe(
      "I played Connected — 2 of 5.\n\n" + "No Johns — 4 tries\n\n"
    );
  });

  it("copes with a log that is not an array", () => {
    expect(draftFrom(null, 5, true)).toBe("I played Connected.\n\n");
  });
});
