// @vitest-environment node

import { expect, test } from "vitest";
import { render } from "./entry-server";

test("the server render carries the resume, not an empty shell", () => {
  const html = render("/");

  expect(html).toContain("Duncan Wood");
  expect(html).toContain("EcoMap Technologies");
  expect(html).toContain("Hemingway Search Engine");
});
