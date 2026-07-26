const experienceData = [
  {
    role: "Software Engineer",
    company: "EcoMap Technologies",
    dates: "Nov 2023 – Jul 2026",
    bullets: [
      "Became sole engineering owner of a 70+ customer white-labeled, multi-tenant platform during an abrupt organizational transition, owning triage-to-deploy and cutting customer escalations to under 3 per month.",
      "Built a real-time internal data-review tool from an empty repo (Next.js, TypeScript, Supabase), compressing the data team's verification workflow and resolving severe state-desync issues.",
      "Shipped two analytics modules on a Ruby on Rails platform with high-performance BigQuery models and automated monthly data-refresh pipelines.",
      "Designed a reusable Rails LLM-summarization system across three modules, cut inference cost ~5x, and led a production RAG chatbot's embedding-model migration across 27,000+ records.",
      "Root-caused and remediated a production SQL-injection vulnerability and led a zero-downtime credential-rotation response across four services.",
      "Built search-log analysis tooling that revealed ~50% of traffic was automated bots, then shipped an upstream fix that reduced infrastructure spend.",
    ],
  },
  {
    role: "Contract Full-Stack Developer",
    company: "Mighty Crow",
    dates: "Jan 2025 – Nov 2025",
    bullets: [
      "Designed a rule-based compliance engine using database triggers and functions to automate real-time housing-certification state cascades across regulatory registries.",
      "Independently designed and shipped a HIPAA-compliant Python/Flask document-conversion service on Google Cloud Run — replacing an expensive commercial alternative — with a full unit, integration, and performance test suite.",
    ],
  },
];

const Experience = () => {
  return (
    <div id="experience" className="m-10">
      <h2 className="text-3xl font-bold mb-10 text-center">Experience</h2>
      <div className="max-w-3xl mx-auto space-y-8">
        {experienceData.map((job) => (
          <div
            key={job.company}
            className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-800"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-3">
              <h3 className="text-xl font-semibold">
                {job.role}{" "}
                <span className="text-purple-800">· {job.company}</span>
              </h3>
              <span className="text-sm font-medium text-gray-500 mt-1 sm:mt-0">
                {job.dates}
              </span>
            </div>
            <ul className="list-disc list-outside pl-5 space-y-2 text-gray-700 text-base">
              {job.bullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Experience;
