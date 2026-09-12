import { SITE_URL, PERSON, PAGES } from "./site";
import { experienceData } from "./components/Experience";
import { professionalProjects, personalProjects } from "./components/Projects";
import { skillGroups } from "./components/Skills";

const PERSON_ID = `${SITE_URL}/#duncan-wood`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const authorReference = { "@id": PERSON_ID };

const projectId = (name) => `${SITE_URL}/#${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const buildPerson = () => ({
  "@type": "Person",
  "@id": PERSON_ID,
  name: PERSON.name,
  alternateName: "duncanwoodpro",
  jobTitle: PERSON.jobTitle,
  description: PERSON.summary,
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/headshot.png`,
  email: `mailto:${PERSON.email}`,
  address: {
    "@type": "PostalAddress",
    addressRegion: "DC",
    addressCountry: "US",
  },
  sameAs: PERSON.profiles,
  worksFor: experienceData.map((job) => ({
    "@type": "Organization",
    name: job.company,
  })),
  hasOccupation: experienceData.map((job) => ({
    "@type": "Occupation",
    name: job.role,
    occupationLocation: { "@type": "Organization", name: job.company },
    description: job.bullets.join(" "),
  })),
  alumniOf: PERSON.education.map((entry) => ({
    "@type": "EducationalOrganization",
    name: entry.school,
  })),
  knowsAbout: skillGroups.flatMap((group) => group.skills.map((skill) => skill.name)),
});

const buildWebSite = () => ({
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: `${PERSON.name} — ${PERSON.jobTitle}`,
  description: PERSON.summary,
  inLanguage: "en-US",
  author: authorReference,
  publisher: authorReference,
});

const buildProfilePage = () => ({
  "@type": "ProfilePage",
  "@id": `${SITE_URL}/#profile`,
  url: `${SITE_URL}/`,
  name: `${PERSON.name} — ${PERSON.jobTitle}`,
  isPartOf: { "@id": WEBSITE_ID },
  mainEntity: authorReference,
});

const buildProfessionalWork = (project) => ({
  "@type": "CreativeWork",
  "@id": projectId(project.name),
  name: project.name,
  description: project.description,
  keywords: project.tech,
  author: authorReference,
});

const buildPersonalWork = (project) => ({
  "@type": "SoftwareSourceCode",
  "@id": projectId(project.name),
  name: project.name,
  description: project.description,
  programmingLanguage: project.tech.split(" | "),
  keywords: project.tech,
  author: authorReference,
  ...(project.github ? { codeRepository: project.github } : {}),
  ...(project.live ? { url: project.live } : {}),
});

const buildGame = () => ({
  "@type": "VideoGame",
  "@id": `${SITE_URL}/game/#connected`,
  name: "Connected",
  url: `${SITE_URL}/game/`,
  image: `${SITE_URL}/og-game.png`,
  description:
    "A browser game about the part a resume leaves out — the story behind the CV, told the other way round.",
  author: authorReference,
  applicationCategory: "Game",
  gamePlatform: "Web browser",
  operatingSystem: "Any modern web browser",
  inLanguage: "en-US",
});

export function buildStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildPerson(),
      buildWebSite(),
      buildProfilePage(),
      buildGame(),
      ...professionalProjects.map(buildProfessionalWork),
      ...personalProjects.map(buildPersonalWork),
    ],
  };
}

export function buildSitemap(lastModified = new Date().toISOString().slice(0, 10)) {
  const entries = PAGES.map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

export function buildLlmsTxt() {
  const job = (entry) =>
    [`### ${entry.role} — ${entry.company} (${entry.dates})`, ...entry.bullets.map((bullet) => `- ${bullet}`)].join("\n");

  const project = (entry) =>
    `- **${entry.name}** (${entry.tech}) — ${entry.description}${entry.github ? ` Source: ${entry.github}` : ""}${entry.live ? ` Live: ${entry.live}` : ""}`;

  return `# ${PERSON.name}

> ${PERSON.jobTitle} in the ${PERSON.location}. ${PERSON.summary}

- Site: ${SITE_URL}/
- Email: ${PERSON.email}
${PERSON.profiles.map((url) => `- Profile: ${url}`).join("\n")}
- Resume (PDF): ${SITE_URL}/resume.pdf

## Experience

${experienceData.map(job).join("\n\n")}

## Professional projects

${professionalProjects.map(project).join("\n")}

## Personal projects

${personalProjects.map(project).join("\n")}

## Skills

${skillGroups.map((group) => `- **${group.label}:** ${group.skills.map((skill) => skill.name).join(", ")}`).join("\n")}

## Education

${PERSON.education.map((entry) => `- ${entry.credential} — ${entry.school} (${entry.year})`).join("\n")}

## Connected

A browser game at ${SITE_URL}/game/ about the part a resume leaves out.
`;
}
