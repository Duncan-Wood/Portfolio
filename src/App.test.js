import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

test("story landing at /story names the experience", () => {
  renderAt("/story");
  expect(screen.getByText(/an interactive story/i)).toBeInTheDocument();
});

test("story landing links back to the standard version at the root", () => {
  renderAt("/story");
  const link = screen.getByRole("link", { name: /standard version/i });
  expect(link).toHaveAttribute("href", "/");
});

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
