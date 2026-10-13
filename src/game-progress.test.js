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

  it("answers the losing screen when they surfaced every fragment", () => {
    expect(draftFrom([build, johns], 2, true)).toBe(
      "Still connected.\n\n"
    );
  });

  it("says how far they got when they stopped short", () => {
    expect(draftFrom([build, johns, laptop], 5, true)).toBe(
      "I got as far as The Laptop.\n\n"
    );
  });

  it("leaves the message box mostly empty for what they came to say", () => {
    expect(draftFrom([build, johns], 2, true).split("\n")).toHaveLength(3);
  });

  it("ignores an entry with no title, rather than counting a blank as progress", () => {
    expect(draftFrom([{ title: "", tries: 9 }, johns], 5, true)).toBe(
      "I got as far as No Johns.\n\n"
    );
  });

  it("copes with a log that is not an array", () => {
    expect(draftFrom(null, 5, true)).toBe("I played Connected.\n\n");
  });
});
