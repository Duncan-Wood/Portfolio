const skillCategories = [
  {
    category: "Languages",
    skills: ["JavaScript", "TypeScript", "Python", "Ruby", "SQL", "HTML/CSS"],
  },
  {
    category: "Backend",
    skills: ["Ruby on Rails", "Node.js", "Flask", "FastAPI", "Express"],
  },
  {
    category: "Frontend",
    skills: ["React", "Next.js", "Tailwind CSS", "Material UI"],
  },
  {
    category: "Data & Databases",
    skills: ["PostgreSQL", "Supabase", "BigQuery", "SQLAlchemy", "ActiveRecord"],
  },
  {
    category: "Cloud & Infrastructure",
    skills: [
      "Google Cloud Platform",
      "Cloud Run",
      "Docker",
      "CI/CD",
      "Vercel",
    ],
  },
  {
    category: "AI & LLM",
    skills: [
      "LLM Integration",
      "Retrieval-Augmented Generation",
      "Vector Embeddings",
      "Structured Output",
    ],
  },
  {
    category: "Testing & Observability",
    skills: ["Sentry", "Playwright", "RSpec", "Jest"],
  },
];

const Skills = () => {
  return (
    <div id="skills" className="m-10">
      <h2 className="text-3xl font-bold mb-10 text-center">Skills</h2>
      <div className="max-w-4xl mx-auto space-y-6">
        {skillCategories.map((group) => (
          <div
            key={group.category}
            className="flex flex-col sm:flex-row sm:items-start"
          >
            <h3 className="text-base font-semibold text-purple-800 sm:w-56 sm:flex-shrink-0 mb-2 sm:mb-0">
              {group.category}
            </h3>
            <div className="flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-purple-100 text-purple-900 text-sm font-medium px-3 py-1 rounded-full"
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
