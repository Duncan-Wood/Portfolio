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
      "Still connected. No Johns took me 4 tries.\n\n"
    );
  });

  it("says how far they got when they stopped short", () => {
    expect(draftFrom([build, johns, laptop], 5, true)).toBe(
      "I got as far as The Laptop. The Laptop took me 7 tries.\n\n"
    );
  });

  it("stays a single sentence when nothing cost more than one try", () => {
    expect(draftFrom([build], 1, true)).toBe("Still connected.\n\n");
  });

  it("names only the hardest fragment, not a table of every one", () => {
    const draft = draftFrom([build, johns, laptop], 3, true);
    expect(draft).toContain("The Laptop took me 7 tries");
    expect(draft).not.toContain("The Build");
    expect(draft).not.toContain("No Johns");
  });

  it("leaves the message box mostly empty for what they came to say", () => {
    expect(draftFrom([build, johns, laptop], 3, true).split("\n")).toHaveLength(3);
  });

  it("ignores an entry with no title, rather than counting a blank as progress", () => {
    expect(draftFrom([{ title: "", tries: 9 }, johns], 5, true)).toBe(
      "I got as far as No Johns. No Johns took me 4 tries.\n\n"
    );
  });

  it("copes with a log that is not an array", () => {
    expect(draftFrom(null, 5, true)).toBe("I played Connected.\n\n");
  });
});
