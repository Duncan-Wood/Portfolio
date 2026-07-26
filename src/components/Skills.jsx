const skillGroups = [
  {
    label: "Languages",
    skills: ["JavaScript", "TypeScript", "Python", "Ruby", "SQL"],
  },
  {
    label: "Frameworks & Libraries",
    skills: [
      "Ruby on Rails",
      "React",
      "Next.js",
      "Node.js",
      "Flask",
      "FastAPI",
      "Tailwind CSS",
    ],
  },
  {
    label: "Data & Cloud",
    skills: [
      "PostgreSQL",
      "Supabase",
      "BigQuery",
      "Google Cloud Platform",
      "Docker",
    ],
  },
  {
    label: "AI & LLM",
    skills: [
      "LLM Integration",
      "Retrieval-Augmented Generation",
      "Vector Embeddings",
      "Structured Output",
    ],
  },
  {
    label: "Practices",
    skills: ["Sentry", "Testing", "CI/CD"],
  },
];

const Skills = () => {
  return (
    <div id="skills" className="m-10">
      <h2 className="text-3xl font-bold mb-10 text-center">Skills</h2>
      <div className="max-w-4xl mx-auto space-y-6">
        {skillGroups.map((group) => (
          <div key={group.label}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-purple-800 mb-3 text-center sm:text-left">
              {group.label}
            </h3>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {group.skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-white border border-purple-200 text-purple-900 text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:border-purple-800 hover:-translate-y-0.5 transition duration-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Skills;
