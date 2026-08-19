/**
 * Skills, grouped by category.
 *
 * `url` is optional, and its presence is what decides how a tag renders: with a
 * link it becomes an anchor with hover styling, without one it is plain text.
 * That is why concepts like "Structured Output" — which have no canonical home
 * page to link to — sit happily in the same list as named technologies.
 */
const skillGroups = [
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

const baseTag =
  "bg-white text-purple-900 text-sm font-medium px-4 py-2 rounded-lg shadow-sm border";
const linkClasses = `${baseTag} border-purple-200 hover:border-purple-800 hover:-translate-y-0.5 transition duration-200`;
const staticClasses = `${baseTag} border-purple-100`;

const SkillTag = ({ skill }) =>
  skill.url ? (
    <a
      href={skill.url}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClasses}
    >
      {skill.name}
    </a>
  ) : (
    <span className={staticClasses}>{skill.name}</span>
  );

const Skills = () => {
  return (
    <div
      // Scroll target for the nav link of the same name; renaming it
      // silently breaks that link. See nav.jsx.
      id="skills"
      className="m-10"
    >
      <h2 className="text-3xl font-bold mb-10 text-center">Skills</h2>
      <div className="max-w-4xl mx-auto space-y-6">
        {skillGroups.map((group) => (
          <div key={group.label}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-purple-800 mb-3 text-center sm:text-left">
              {group.label}
            </h3>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {group.skills.map((skill) => (
                <SkillTag key={skill.name} skill={skill} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Skills;
