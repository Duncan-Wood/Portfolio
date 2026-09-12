import { StrictMode } from "react";
import App from "./App";

export const AppTree = ({ router: Router, ...routerProps }) => (
  <StrictMode>
    <Router {...routerProps}>
      <App />
    </Router>
  </StrictMode>
);
