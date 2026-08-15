import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

test("the root path renders the standard portfolio", () => {
  renderAt("/");
  expect(
    screen.getByRole("heading", { name: /about me/i })
  ).toBeInTheDocument();
});

test("an unknown path renders the standard portfolio", () => {
  renderAt("/does-not-exist");
  expect(
    screen.getByRole("heading", { name: /about me/i })
  ).toBeInTheDocument();
});
