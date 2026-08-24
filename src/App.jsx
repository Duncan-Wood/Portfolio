import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import StandardPortfolio from "./components/StandardPortfolio";

/**
 * The portfolio's routing table.
 *
 * Deliberately tiny: one real page, and a catch-all that sends anything else
 * home. Navigation within the page is not routing at all — the nav uses
 * `react-scroll` to scroll to section IDs, so there is only ever one route.
 *
 * Note there is NO route for `/game`. That is not an omission. In development
 * `/game` is proxied by the `server.proxy` entry in the root `vite.config.mjs`
 * before React ever sees it, and in production it is a real directory of files
 * on disk. React is never involved either way — which is also why the links to
 * it in `nav.jsx` and `home.jsx` are plain anchors rather than router links.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<StandardPortfolio />} />
      {/* `replace` so a bad URL does not leave a dead entry in history. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
