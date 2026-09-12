import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Contact from "./Contact";

test("every field can be reached by its label, the way a screen reader reaches it", () => {
  render(<Contact />);

  for (const label of [/^name$/i, /^email$/i, /^message$/i]) {
    expect(screen.getByLabelText(label)).toBeDefined();
  }
});

test("the fields a browser can fill say what they hold", () => {
  render(<Contact />);

  expect(screen.getByLabelText(/^name$/i).getAttribute("autocomplete")).toBe("name");
  expect(screen.getByLabelText(/^email$/i).getAttribute("autocomplete")).toBe("email");
});
