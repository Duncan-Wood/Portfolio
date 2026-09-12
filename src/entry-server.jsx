import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import App from "./App";

export { buildStructuredData, buildSitemap, buildLlmsTxt } from "./structured-data";

export function render(location) {
  return renderToString(
    <StaticRouter location={location}>
      <App />
    </StaticRouter>
  );
}
