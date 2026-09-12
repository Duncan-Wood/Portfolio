import { skillGroups } from "../site";

const baseTag =
  "bg-white text-purple-900 text-sm font-medium px-4 py-2 rounded-lg shadow-xs border";
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
