import html from "../assets/Skill_Logos/html.png";
import css from "../assets/Skill_Logos/css.png";
import javascript from "../assets/Skill_Logos/javaScript.png";
import python from "../assets/Skill_Logos/python-logo.png";
import cpp from "../assets/Skill_Logos/cpp.png";
import postgresql from "../assets/Skill_Logos/postgresql.png";
import nodejs from "../assets/Skill_Logos/nodejs.png";
import react from "../assets/Skill_Logos/react.png";
import sequelize from "../assets/Skill_Logos/sequelize.png";
import django from "../assets/Skill_Logos/django.png";
import tailwind from "../assets/Skill_Logos/tailwind.png";
import material_ui from "../assets/Skill_Logos/material_ui.png";
import docker from "../assets/Skill_Logos/docker.png";
import firebase from "../assets/Skill_Logos/firebase.png";
import aws from "../assets/Skill_Logos/aws.png";
import bubble from "../assets/Skill_Logos/bubble.png";
const Skills = () => {
  const skillsData = [
    { name: "HTML", url: "https://html.com", icon: html },
    { name: "CSS", url: "https://css-tricks.com", icon: css },
    {
      name: "JavaScript",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      icon: javascript,
    },
    { name: "Python", url: "https://www.python.org/", icon: python },
    { name: "C++", url: "https://isocpp.org/", icon: cpp },
    { name: "Node.js", url: "https://nodejs.org/", icon: nodejs },
    { name: "React", url: "https://reactjs.org/", icon: react },
    { name: "Bubble", url: "https://bubble.io/", icon: bubble },
    {
      name: "PostgreSQL",
      url: "https://www.postgresql.org/",
      icon: postgresql,
    },
    { name: "Sequelize", url: "https://sequelize.org/", icon: sequelize },
    { name: "Django", url: "https://www.djangoproject.com/", icon: django },
    { name: "Tailwind CSS", url: "https://tailwindcss.com/", icon: tailwind },
    { name: "Material UI", url: "https://mui.com/", icon: material_ui },
    { name: "Docker", url: "https://www.docker.com/", icon: docker },
    { name: "AWS", url: "https://aws.amazon.com/", icon: aws },
    { name: "Firebase", url: "https://firebase.google.com/", icon: firebase },
  ];
  return (
    <div id="skills" className="m-10">
      <h2 className="text-2xl font-bold mb-4 flex justify-center">
        Some of My Skills!
      </h2>
      <div id="skills-container" className="overflow-x-auto">
        <div className="skills-wrapper">
          {skillsData.map((skill, index) => (
            <a
              key={index}
              href={skill.url}
              title={skill.name}
              target="_blank"
              rel="noopener noreferrer"
              className="h-auto mx-4 my-2 w-20 flex justify-center items-center"
            >
              <img src={skill.icon} alt={`${skill.name} Logo`} />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Skills;
