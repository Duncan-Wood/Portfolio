import { expect, test } from "vitest";
import { buildStructuredData, buildSitemap, buildLlmsTxt } from "./structured-data";
import { SITE_URL, PERSON } from "./site";

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

  expect(person.worksFor.map((org) => org.name)).toContain("EcoMap Technologies");
  expect(person.alumniOf.map((org) => org.name)).toContain("General Assembly");
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
  expect(sitemap).toContain(`<loc>${SITE_URL}/game/</loc>`);
  expect(sitemap.startsWith("<?xml")).toBe(true);
});

test("llms.txt gives a crawler the whole resume without executing anything", () => {
  const text = buildLlmsTxt();

  expect(text).toContain("# Duncan Wood");
  expect(text).toContain("EcoMap Technologies");
  expect(text).toContain("Hemingway Search Engine");
  expect(text).toContain("duncanwoodpro@gmail.com");
});
