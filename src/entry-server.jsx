import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import { AppTree } from "./app-tree";

export { buildStructuredData, buildSitemap, buildLlmsTxt } from "./structured-data";

export function render(location) {
  return renderToString(<AppTree router={StaticRouter} location={location} />);
}
