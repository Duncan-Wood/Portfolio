export const SITE_URL = "https://duncanwoodpro.netlify.app";

export const PERSON = {
  name: "Duncan Wood",
  jobTitle: "Software Engineer",
  location: "Washington, D.C. area",
  email: "duncanwoodpro@gmail.com",
  summary:
    "Software engineer with a background in writing and rhetoric — I turn ambiguous, high-stakes problems into reliable software and communicate the thinking behind it. I'm especially drawn to work that widens access and supports mental health. Based in the Washington, D.C. area.",
  profiles: [
    "https://www.linkedin.com/in/duncanwoodpro/",
    "https://github.com/Duncan-Wood",
  ],
  education: [
    { credential: "Software Engineering Immersive", school: "General Assembly", year: "2023" },
    { credential: "B.A., Writing & Rhetoric", school: "University of Central Florida", year: "2020" },
  ],
};

export const PAGES = [{ path: "/", changefreq: "monthly", priority: "1.0" }];

export const experienceData = [
  {
    role: "Software Engineer",
    company: "EcoMap Technologies",
    start: "2023-11",
    end: "2026-07",
    bullets: [
      "Became the sole engineer maintaining a 70+ customer white-labeled platform, owning the full cycle from triage to weekly deploys while keeping customer escalations low.",
      "Built and shipped several State Scorecard intelligence-report modules (including Population and Business Formation & Survival) on a Ruby on Rails platform, backed by BigQuery data models and automated monthly refreshes.",
      "Helped design and did much of the refining on a shared AI-summary system that turns report data into plain-language narratives with a structured LLM schema, reused across multiple report modules.",
      "Root-caused and fixed a production SQL-injection vulnerability, and helped lead a zero-downtime credential rotation across four services.",
      "Built self-directed search-log analysis tooling that revealed how much traffic came from bots, then shipped an upstream fix to cut wasted requests and infrastructure spend.",
    ],
  },
  {
    role: "Contract Developer",
    company: "Mighty Crow",
    start: "2025-01",
    end: "2025-11",
    bullets: [
      "Designed a rule-based compliance engine using database triggers and functions to automate real-time housing-certification state cascades across regulatory registries.",
      "Independently designed and shipped a HIPAA-compliant Python/Flask document-conversion service on Google Cloud Run — replacing an expensive commercial alternative — with a full unit, integration, and performance test suite.",
    ],
  },
];

export const professionalProjects = [
  {
    name: "Update Detector",
    tech: "Next.js | TypeScript | Supabase",
    description:
      "A tool EcoMap's data team uses to review proposed changes to asset data — editing, accepting, or rejecting each suggested update before it goes live, with reviewed updates archived and the original values preserved. Built from an empty repo as lead developer. (Internal tool.)",
  },
  {
    name: "AI Report Summaries",
    tech: "Ruby on Rails | LLM | Structured Output",
    description:
      "A shared system that turns report data into plain-language narrative summaries using a structured LLM schema, reusable across multiple report modules. A team effort I helped design and did much of the refining on.",
  },
  {
    name: "HIPAA Document-Conversion Service",
    tech: "Python | Flask | Google Cloud Run",
    description:
      "A HIPAA-compliant microservice that converts documents on demand, replacing an expensive commercial tool, with a full automated unit, integration, and performance test suite.",
  },
];

export const personalProjects = [
  {
    name: "Hemingway Search Engine",
    tech: "React | Flask | Word2Vec | NumPy",
    description:
      "A search engine that uses a Word2Vec model and NumPy to calculate the similarity between a user's query and the text in the corpus. If no exact results are found, it returns at least three of the closest matches.",
    github: "https://github.com/Duncan-Wood/Hemingway-Search-Engine",
  },
  {
    name: "Coping Corner",
    tech: "React | PostgreSQL | Material Theme Builder",
    description:
      "A full-stack web application for people struggling with mental health, providing user authentication, resource creation and sharing, and community building.",
    github: "https://github.com/Duncan-Wood/Coping-Corner-Frontend",
  },
  {
    name: "ThriveTracker",
    tech: "React | Django | Tailwind",
    description:
      "A full-stack application with time-tracking and progress-monitoring features to support individuals in their addiction-recovery journey.",
    github: "https://github.com/Duncan-Wood/ThriveTracker-Frontend",
  },
  {
    name: "Dog City",
    tech: "React | Axios | ChartJS",
    description:
      "A React web app for dog lovers that lets users browse 172 dog breeds and view their characteristics and images.",
    live: "https://dog-city.netlify.app/",
    github: "https://github.com/Duncan-Wood/Dog-City",
  },
  {
    name: "Sunrise Weather",
    tech: "HTML | Axios | JavaScript",
    description:
      "A single-page website that displays current weather information from a weather API alongside a random quote to brighten your day.",
    live: "https://sunrise-weather.surge.sh",
    github: "https://github.com/Duncan-Wood/Sunrise-Weather",
  },
];

export const skillGroups = [
  {
    label: "Languages",
    skills: [
      { name: "JavaScript", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript" },
      { name: "TypeScript", url: "https://www.typescriptlang.org/" },
      { name: "Python", url: "https://www.python.org/" },
      { name: "Ruby", url: "https://www.ruby-lang.org/" },
      { name: "SQL" },
    ],
  },
  {
    label: "Frameworks & Libraries",
    skills: [
      { name: "Ruby on Rails", url: "https://rubyonrails.org/" },
      { name: "React", url: "https://react.dev/" },
      { name: "Next.js", url: "https://nextjs.org/" },
      { name: "Node.js", url: "https://nodejs.org/" },
      { name: "Flask", url: "https://flask.palletsprojects.com/" },
      { name: "FastAPI", url: "https://fastapi.tiangolo.com/" },
      { name: "Tailwind CSS", url: "https://tailwindcss.com/" },
    ],
  },
  {
    label: "Data & Cloud",
    skills: [
      { name: "PostgreSQL", url: "https://www.postgresql.org/" },
      { name: "Supabase", url: "https://supabase.com/" },
      { name: "BigQuery", url: "https://cloud.google.com/bigquery" },
      { name: "Google Cloud Platform", url: "https://cloud.google.com/" },
      { name: "Docker", url: "https://www.docker.com/" },
    ],
  },
  {
    label: "AI & LLM",
    skills: [
      { name: "LLM Integration" },
      { name: "Retrieval-Augmented Generation" },
      { name: "Vector Embeddings" },
      { name: "Structured Output" },
    ],
  },
  {
    label: "Practices",
    skills: [
      { name: "Sentry", url: "https://sentry.io/" },
      { name: "Testing" },
      { name: "CI/CD" },
    ],
  },
];
