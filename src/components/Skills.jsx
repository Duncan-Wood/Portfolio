import { skillGroups } from "../site";
import { chipClasses, interactiveChipClasses } from "./chip-classes";

const tagText = "text-purple-900 text-sm font-medium px-4 py-2";
const linkClasses = `${interactiveChipClasses} ${tagText}`;
const staticClasses = `${chipClasses} border border-purple-100 ${tagText}`;

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
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand mb-3 text-center sm:text-left">
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
