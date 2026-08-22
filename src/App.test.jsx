import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

test("renders the portfolio with its sections", () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );

  for (const section of [/about me/i, /experience/i, /projects/i, /skills/i]) {
    expect(screen.getAllByRole("heading", { name: section }).length).toBeGreaterThan(0);
  }
});
