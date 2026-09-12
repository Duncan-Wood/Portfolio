import { experienceData } from "../site";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthAndYear = (isoMonth) => {
  const [year, month] = isoMonth.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
};

const Experience = () => {
  return (
    <div
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
                {`${monthAndYear(job.start)} – ${monthAndYear(job.end)}`}
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
