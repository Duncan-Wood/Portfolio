import { expect, test } from "vitest";
import { buildStructuredData, buildSitemap, buildLlmsTxt } from "./structured-data";
import { SITE_URL, PERSON, personalProjects } from "./site";

const graphOf = (type) =>
  buildStructuredData()["@graph"].find((node) => node["@type"] === type);

test("the person node is the identity the rest of the graph points at", () => {
  const person = graphOf("Person");

  expect(person["@id"]).toBe(`${SITE_URL}/#duncan-wood`);
  expect(person.name).toBe("Duncan Wood");
  expect(person.jobTitle).toBe("Software Engineer");
  expect(person.sameAs).toEqual(PERSON.profiles);
  expect(person.email).toBe("mailto:duncanwoodpro@gmail.com");
  expect(person.image).toBe(`${SITE_URL}/headshot.png`);
});

test("the person carries the roles and schooling the resume claims", () => {
  const person = graphOf("Person");

  expect(person.hasOccupation.map((role) => role.occupationLocation.name)).toContain(
    "EcoMap Technologies"
  );
  expect(person.alumniOf.map((org) => org.name)).toContain("General Assembly");
});

test("no role is published as current, because none of them are", () => {
  const person = graphOf("Person");

  expect(person.worksFor).toBeUndefined();
  for (const role of person.hasOccupation) {
    expect(role.startDate).toMatch(/^\d{4}-\d{2}$/);
    expect(role.endDate).toMatch(/^\d{4}-\d{2}$/);
  }
});

test("nothing points a crawler at the game while it is behind the code gate", () => {
  const graph = buildStructuredData()["@graph"];

  expect(graph.some((node) => node["@type"] === "VideoGame")).toBe(false);
  expect(JSON.stringify(graph)).not.toContain("/game/");
  expect(buildSitemap()).not.toContain("/game/");
  expect(buildLlmsTxt()).not.toContain("/game/");
});

test("the profile page points back at the person rather than restating them", () => {
  const profile = graphOf("ProfilePage");

  expect(profile.mainEntity["@id"]).toBe(`${SITE_URL}/#duncan-wood`);
  expect(profile.url).toBe(`${SITE_URL}/`);
});

test("every project the site shows becomes a findable work", () => {
  const works = buildStructuredData()["@graph"].filter(
    (node) => node["@type"] === "CreativeWork" || node["@type"] === "SoftwareSourceCode"
  );

  expect(works.map((work) => work.name)).toContain("Hemingway Search Engine");
  expect(works.map((work) => work.name)).toContain("Update Detector");
  for (const work of works) {
    expect(work.author["@id"]).toBe(`${SITE_URL}/#duncan-wood`);
  }
});

test("the sitemap lists real URLs and nothing that 404s", () => {
  const sitemap = buildSitemap();

  expect(sitemap).toContain(`<loc>${SITE_URL}/</loc>`);
  expect(sitemap.startsWith("<?xml")).toBe(true);
});

test("llms.txt gives a crawler the whole resume without executing anything", () => {
  const text = buildLlmsTxt();

  expect(text).toContain("# Duncan Wood");
  expect(text).toContain("EcoMap Technologies");
  expect(text).toContain("Hemingway Search Engine");
  expect(text).toContain("duncanwoodpro@gmail.com");
});

test("every personal project the site shows has artwork to show for it", async () => {
  const { projectArt } = await import("./components/Projects");

  for (const project of personalProjects) {
    expect(projectArt[project.name]).toBeDefined();
  }
});
