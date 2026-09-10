import { describe, expect, it } from "vitest";
import { draftFrom } from "./game-progress";

const build = { title: "The Build", tries: 1 };
const johns = { title: "No Johns", tries: 4 };
const laptop = { title: "The Laptop", tries: 7 };

describe("draftFrom", () => {
  it("is empty for someone who never played, so the form is untouched", () => {
    expect(draftFrom([], 5, false, 0)).toBe("");
  });

  it("speaks for someone who played and surfaced nothing", () => {
    expect(draftFrom([], 5, true, 0)).toBe("I played Connected.\n\n");
  });

  it("answers the losing screen when they surfaced every fragment", () => {
    expect(draftFrom([build, johns], 2, true, 4)).toBe(
      "Still connected. Best chain: 4.\n\n"
    );
  });

  it("says how far they got when they stopped short", () => {
    expect(draftFrom([build, johns, laptop], 5, true, 3)).toBe(
      "I got as far as The Laptop. Best chain: 3.\n\n"
    );
  });

  it("stays a single sentence when they never built a chain", () => {
    expect(draftFrom([build], 1, true, 0)).toBe("Still connected.\n\n");
  });

  it("leaves out a chain of one, which is just a match", () => {
    expect(draftFrom([build], 1, true, 1)).toBe("Still connected.\n\n");
  });

  it("leaves the message box mostly empty for what they came to say", () => {
    expect(draftFrom([build, johns], 2, true, 4).split("\n")).toHaveLength(3);
  });

  it("ignores an entry with no title, rather than counting a blank as progress", () => {
    expect(draftFrom([{ title: "", tries: 9 }, johns], 5, true, 2)).toBe(
      "I got as far as No Johns. Best chain: 2.\n\n"
    );
  });

  it("copes with a log that is not an array", () => {
    expect(draftFrom(null, 5, true, 5)).toBe("I played Connected.\n\n");
  });

  it("says nothing about controls when they played the way it shipped", () => {
    expect(draftFrom([build, johns], 2, true, 4, "swipe")).toBe(
      "Still connected. Best chain: 4.\n\n"
    );
  });

  it("mentions the controls when they went and changed them", () => {
    expect(draftFrom([build, johns], 2, true, 4, "buttons")).toBe(
      "Still connected. Best chain: 4. (on the buttons)\n\n"
    );
  });

  it("mentions changed controls even on a run with no chain to report", () => {
    expect(draftFrom([build], 1, true, 0, "buttons")).toBe(
      "Still connected. (on the buttons)\n\n"
    );
  });
});
