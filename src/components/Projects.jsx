import { useState } from "react";

import github from "../assets/github.png";
import link from "../assets/link.png";

import hemingway from "../assets/Projects/hemingway.png";
import hemingway_motion from "../assets/Projects/hemingway-motion.gif";
import thrivetracker from "../assets/Projects/thrivetracker.png";
import thrivetracker_motion from "../assets/Projects/thrivetracker-motion.gif";
import coping_corner from "../assets/Projects/coping-corner-screenshot.png";
import coping_corner_motion from "../assets/Projects/coping-corner-motion.gif";
import dog_city from "../assets/Projects/dog-city-screenshot.png";
import dog_city_motion from "../assets/Projects/dog-city-motion.gif";
import sunrise_weather from "../assets/Projects/sunrise-weather-screenshot.png";
import sunrise_weather_motion from "../assets/Projects/sunrise-weather-motion.gif";

const professionalProjects = [
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

const personalProjects = [
  {
    name: "Hemingway Search Engine",
    tech: "React | Flask | Word2Vec | NumPy",
    description:
      "A search engine that uses a Word2Vec model and NumPy to calculate the similarity between a user's query and the text in the corpus. If no exact results are found, it returns at least three of the closest matches.",
    image: hemingway,
    motion: hemingway_motion,
    github: "https://github.com/Duncan-Wood/Hemingway-Search-Engine",
  },
  {
    name: "Coping Corner",
    tech: "React | PostgreSQL | Material Theme Builder",
    description:
      "A full-stack web application for people struggling with mental health, providing user authentication, resource creation and sharing, and community building.",
    image: coping_corner,
    motion: coping_corner_motion,
    github: "https://github.com/Duncan-Wood/Coping-Corner-Frontend",
  },
  {
    name: "ThriveTracker",
    tech: "React | Django | Tailwind",
    description:
      "A full-stack application with time-tracking and progress-monitoring features to support individuals in their addiction-recovery journey.",
    image: thrivetracker,
    motion: thrivetracker_motion,
    github: "https://github.com/Duncan-Wood/ThriveTracker-Frontend",
  },
  {
    name: "Dog City",
    tech: "React | Axios | ChartJS",
    description:
      "A React web app for dog lovers that lets users browse 172 dog breeds and view their characteristics and images.",
    image: dog_city,
    motion: dog_city_motion,
    live: "https://dog-city.netlify.app/",
    github: "https://github.com/Duncan-Wood/Dog-City",
  },
  {
    name: "Sunrise Weather",
    tech: "HTML | Axios | JavaScript",
    description:
      "A single-page website that displays current weather information from a weather API alongside a random quote to brighten your day.",
    image: sunrise_weather,
    motion: sunrise_weather_motion,
    live: "https://sunrise-weather.surge.sh",
    github: "https://github.com/Duncan-Wood/Sunrise-Weather",
  },
];

const PERSONAL_PREVIEW_COUNT = 3;

const cardClasses =
  "bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300 flex flex-col";

const LinkButton = ({ href, icon, alt, color }) => (
  <a
    href={href}
    className={`${color} text-white font-bold py-1 px-3 rounded-md border mx-2`}
    target="_blank"
    rel="noreferrer"
  >
    <img src={icon} alt={alt} className="w-full h-8 object-cover" />
  </a>
);

const ProfessionalCard = ({ project }) => (
  <div className={cardClasses}>
    <div className="h-40 bg-gradient-to-br from-purple-700 to-purple-900 flex items-center justify-center p-4">
      <h3 className="text-xl font-semibold text-white text-center">
        {project.name}
      </h3>
    </div>
    <div className="p-4 flex flex-col flex-1">
      <h4 className="text-sm font-medium text-gray-600 mb-2">{project.tech}</h4>
      <p className="text-gray-700 text-base flex-1">{project.description}</p>
      {project.live && (
        <div className="flex justify-center mt-4">
          <LinkButton
            href={project.live}
            icon={link}
            alt="Live Site"
            color="bg-blue-300 hover:bg-blue-500 border-blue-500"
          />
        </div>
      )}
    </div>
  </div>
);

const PersonalCard = ({ project }) => {
  const [isHovering, setIsHovering] = useState(false);
  return (
    <div
      className={cardClasses}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <img
        src={isHovering ? project.motion : project.image}
        alt={project.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
        <h4 className="text-sm font-medium text-gray-600 mb-2">
          {project.tech}
        </h4>
        <p className="text-gray-700 text-base flex-1">{project.description}</p>
        <div className="flex justify-center mt-4">
          {project.live && (
            <LinkButton
              href={project.live}
              icon={link}
              alt="Deployed App"
              color="bg-blue-300 hover:bg-blue-500 border-blue-500"
            />
          )}
          {project.github && (
            <LinkButton
              href={project.github}
              icon={github}
              alt="Github"
              color="bg-gray-300 hover:bg-gray-500 border-gray-500"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const cardGrid =
  "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-items-center";

const Projects = () => {
  const [showAllPersonal, setShowAllPersonal] = useState(false);

  const visiblePersonal = showAllPersonal
    ? personalProjects
    : personalProjects.slice(0, PERSONAL_PREVIEW_COUNT);

  return (
    <div id="projects" className="m-10">
      <h2 className="text-3xl font-bold mb-10 text-center">Projects</h2>

      <section className="mb-14">
        <h3 className="text-2xl font-semibold mb-2 text-center">
          Professional Work
        </h3>
        <p className="text-gray-500 text-center mb-8">
          Tools and services I built on the job.
        </p>
        <div className={cardGrid}>
          {professionalProjects.map((project) => (
            <ProfessionalCard key={project.name} project={project} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-2xl font-semibold mb-2 text-center">
          Personal Projects
        </h3>
        <p className="text-gray-500 text-center mb-8">
          Things I built to learn and to scratch an itch.
        </p>
        <div className={cardGrid}>
          {visiblePersonal.map((project) => (
            <PersonalCard key={project.name} project={project} />
          ))}
        </div>
        {personalProjects.length > PERSONAL_PREVIEW_COUNT && (
          <div className="text-center mt-8">
            <button
              className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
              onClick={() => setShowAllPersonal(!showAllPersonal)}
            >
              {showAllPersonal ? "Show Less" : "Show All"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Projects;
