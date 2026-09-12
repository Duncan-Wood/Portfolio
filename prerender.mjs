import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { render, buildStructuredData, buildSitemap, buildLlmsTxt } from "./.ssr/entry-server.mjs";

const BUILD_DIR = path.resolve("build");

const inject = (template, placeholder, markup) => {
  if (!template.includes(placeholder)) {
    throw new Error(
      `index.html is missing the ${placeholder} placeholder, so the build would ship a page crawlers see as blank.`
    );
  }
  return template.replace(placeholder, () => markup);
};

const appHtml = render("/");

if (appHtml.includes("/src/assets/")) {
  throw new Error(
    "Prerendered HTML points at dev asset paths, which 404 in production. The SSR bundle is stale — rebuild it."
  );
}

const jsonLd = JSON.stringify(buildStructuredData()).replace(/</g, "\\u003c");
const scriptTag = `<script type="application/ld+json">${jsonLd}</script>`;

const template = await readFile(path.join(BUILD_DIR, "index.html"), "utf8");
const html = inject(
  inject(template, "<!--app-html-->", appHtml),
  "<!--structured-data-->",
  scriptTag
);

await writeFile(path.join(BUILD_DIR, "index.html"), html);
await writeFile(path.join(BUILD_DIR, "sitemap.xml"), buildSitemap());
await writeFile(path.join(BUILD_DIR, "llms.txt"), buildLlmsTxt());

console.log(
  `prerendered ${appHtml.length} chars of HTML, ${jsonLd.length} chars of JSON-LD, plus sitemap.xml and llms.txt`
);
