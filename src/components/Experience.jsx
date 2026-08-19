/**
 * Work history, most recent end date first.
 *
 * Content lives as a plain array rather than as hand-written JSX so that adding
 * a role means editing data, not markup — the rendering below is written once
 * and applies to every entry. The same pattern is used in `Projects.jsx` and
 * `Skills.jsx`.
 *
 * Kept deliberately in sync with `README.md` and the PDF résumé; those are three
 * separate copies of the same facts, so a change to one needs the others.
 */
const experienceData = [
  {
    role: "Software Engineer",
    company: "EcoMap Technologies",
    dates: "Nov 2023 – Jul 2026",
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
    dates: "Jan 2025 – Nov 2025",
    bullets: [
      "Designed a rule-based compliance engine using database triggers and functions to automate real-time housing-certification state cascades across regulatory registries.",
      "Independently designed and shipped a HIPAA-compliant Python/Flask document-conversion service on Google Cloud Run — replacing an expensive commercial alternative — with a full unit, integration, and performance test suite.",
    ],
  },
];

const Experience = () => {
  return (
    <div
      // Scroll target for the nav link of the same name; renaming it
      // silently breaks that link. See nav.jsx.
      id="experience"
      className="m-10"
    >
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
