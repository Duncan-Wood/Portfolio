import { useState } from "react";

import github from "../assets/github.png";
import link from "../assets/link.png";

import hemingway from "../assets/Projects/hemingway.png";
import hemingway_motion from "../assets/Projects/hemingway-motion.gif";
import fakeTwitter from "../assets/Projects/faketwitter.png";
import fakeTwitter_motion from "../assets/Projects/faketwitter-motion.gif";
import amazon_clone from "../assets/Projects/amazon-clone.png";
import amazon_clone_motion from "../assets/Projects/amazon-clone-motion.gif";
import thrivetracker from "../assets/Projects/thrivetracker.png";
import thrivetracker_motion from "../assets/Projects/thrivetracker-motion.gif";
import tickiT from "../assets/Projects/tickit.png";
import tickiT_motion from "../assets/Projects/tickit-motion.gif";
import coping_corner from "../assets/Projects/coping-corner-screenshot.png";
import coping_corner_motion from "../assets/Projects/coping-corner-motion.gif";
import dog_city from "../assets/Projects/dog-city-screenshot.png";
import dog_city_motion from "../assets/Projects/dog-city-motion.gif";
import sunrise_weather from "../assets/Projects/sunrise-weather-screenshot.png";
import sunrise_weather_motion from "../assets/Projects/sunrise-weather-motion.gif";

const Projects = () => {
  const [showAllProjects, setShowAllProjects] = useState(false);

  const [isHoveringHemingway, setIsHoveringHemingway] = useState(false);
  const [isHoveringFakeTwitter, setIsHoveringFakeTwitter] = useState(false);
  const [isHoveringAmazonClone, setIsHoveringAmazonClone] = useState(false);
  const [isHoveringThriveTracker, setIsHoveringThriveTracker] = useState(false);
  const [isHoveringTickiT, setIsHoveringTickiT] = useState(false);
  const [isHoveringCopingCorner, setIsHoveringCopingCorner] = useState(false);
  const [isHoveringDogCity, setIsHoveringDogCity] = useState(false);
  const [isHoveringSunriseWeather, setIsHoveringSunriseWeather] =
    useState(false);

  const toggleProjects = () => {
    setShowAllProjects(!showAllProjects);
  };

  return (
    <div id="projects" className="m-10">
      <h2 className="text-3xl font-bold mb-10 text-center">
        Featured Projects
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg: justify-items-center grid-cols-3 text-center justify-items-center">
        {/* Hemingway*/}
        <div
          className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300"
          onMouseEnter={() => setIsHoveringHemingway(true)}
          onMouseLeave={() => setIsHoveringHemingway(false)}
        >
          <img
            src={isHoveringHemingway ? hemingway_motion : hemingway}
            alt="Hemingway Search Engine"
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="text-xl font-semibold mb-2">
              Hemingway Search Engine
            </h3>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              React | Flask | Word2Vec | NumPy
            </h4>
            <p className="text-gray-700 text-base">
              Hemingway is a search engine that uses a Word2Vec model and NumPy
              to calculate the similarity between a user's query and the text in
              the corpus. If no exact results are found, it will display at
              least three results.
            </p>
            <div className="flex justify-center mt-4">
              <a
                href="https://github.com/Duncan-Wood/Hemingway-Search-Engine"
                className="bg-gray-300 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md border border-gray-500"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={github}
                  alt="Github"
                  className="w-full h-8 object-cover"
                />
              </a>
            </div>
          </div>
        </div>
        {/* FakeTwitter*/}
        <div
          className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300"
          onMouseEnter={() => setIsHoveringFakeTwitter(true)}
          onMouseLeave={() => setIsHoveringFakeTwitter(false)}
        >
          <img
            src={isHoveringFakeTwitter ? fakeTwitter_motion : fakeTwitter}
            alt="Fake Twitter"
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="text-xl font-semibold mb-2">Fake Twitter</h3>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              React | Material UI | AWS | Docker
            </h4>
            <p className="text-gray-700 text-base">
              FakeTwitter is a collaborative full-stack app developed with
              Joshua Rizek, a Senior Software Engineer at Booz Allen, aiming to
              replicate Twitter's features while emphasizing full stack
              development and DevOps integration.
            </p>
            <div className="flex justify-center mt-4">
              <a
                href="https://github.com/rizekj12/fakeTwitter"
                className="bg-gray-300 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md border border-gray-500"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={github}
                  alt="Github"
                  className="w-full h-8 object-cover"
                />
              </a>
            </div>
          </div>
        </div>
        {/* Amazon Clone*/}
        <div
          className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300"
          onMouseEnter={() => setIsHoveringAmazonClone(true)}
          onMouseLeave={() => setIsHoveringAmazonClone(false)}
        >
          <img
            src={isHoveringAmazonClone ? amazon_clone_motion : amazon_clone}
            alt="Amazon Clone"
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="text-xl font-semibold mb-2">Amazon Clone</h3>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              React | Firebase | Stripe
            </h4>
            <p className="text-gray-700 text-base">
              The Amazon Clone is a React-based e-commerce app where users can
              create accounts, add items to their basket, and view the subtotal.
              It's a valuable learning resource and a solid foundation for
              e-commerce apps.
            </p>
            <div className="flex justify-center mt-4">
              <a
                href="https://clone-153b6.web.app/"
                className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md border border-blue-500 mr-4"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={link}
                  alt="Deployed App"
                  className="w-full h-8 object-cover"
                />
              </a>
              <a
                href="https://github.com/Duncan-Wood/amazon-clone"
                className="bg-gray-300 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md border border-gray-500"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={github}
                  alt="Github"
                  className="w-full h-8 object-cover"
                />
              </a>
            </div>
          </div>
        </div>
        {/* Thrivetracker */}
        <div
          className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300"
          onMouseEnter={() => setIsHoveringThriveTracker(true)}
          onMouseLeave={() => setIsHoveringThriveTracker(false)}
        >
          <img
            src={isHoveringThriveTracker ? thrivetracker_motion : thrivetracker}
            alt="ThriveTracker"
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="text-xl font-semibold mb-2">ThriveTracker</h3>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              React | Django | Tailwind
            </h4>
            <p className="text-gray-700 text-base">
              ThriveTracker is a full-stack application that features time
              tracking and progress monitoring functionalities to aid
              individuals in their addiction recovery journey.
            </p>
            <div className="flex justify-center mt-4">
              <a
                href="https://github.com/Duncan-Wood/ThriveTracker-Frontend"
                className="bg-gray-300 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md border border-gray-500"
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={github}
                  alt="Github"
                  className="w-full h-8 object-cover"
                />
              </a>
            </div>
          </div>
        </div>
        {/* Additional projects (hidden by default) */}
        {showAllProjects && (
          <>
            {/* TickiT*/}
            <div
              className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300"
              onMouseEnter={() => setIsHoveringTickiT(true)}
              onMouseLeave={() => setIsHoveringTickiT(false)}
            >
              <img
                src={isHoveringTickiT ? tickiT_motion : tickiT}
                alt="Tick-iT"
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">Tick-iT</h3>
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  Django Views | Django | Material Theme Builder
                </h4>
                <p className="text-gray-700 text-base">
                  Tick-iT is a Django web app for browsing venues, events, and
                  purchasing tickets, providing a seamless ticket-buying
                  experience.
                </p>
                <div className="flex justify-center mt-4">
                  <a
                    href="https://github.com/nezcodin/Tick-iT-Hackathon"
                    className="bg-gray-300 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md border border-gray-500"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={github}
                      alt="Github"
                      className="w-full h-8 object-cover"
                    />
                  </a>
                </div>
              </div>
            </div>
            {/* Coping Corner */}
            <div
              className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300"
              onMouseEnter={() => setIsHoveringCopingCorner(true)}
              onMouseLeave={() => setIsHoveringCopingCorner(false)}
            >
              <img
                src={
                  isHoveringCopingCorner ? coping_corner_motion : coping_corner
                }
                alt="Coping Corner"
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">Coping Corner</h3>
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  React | PostgreSQL | Material Theme Builder
                </h4>
                <p className="text-gray-700 text-base">
                  Coping Corner is a full-stack web application for individuals
                  struggling with mental health that provides user
                  authentication, resource creation and sharing, and community
                  building.
                </p>
                <div className="flex justify-center mt-4">
                  <a
                    href="https://github.com/Duncan-Wood/Coping-Corner-Frontend"
                    className="bg-gray-300 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md border border-gray-500"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={github}
                      alt="Github"
                      className="w-full h-8 object-cover"
                    />
                  </a>
                </div>
              </div>
            </div>
            {/* Dog City */}
            <div
              className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300"
              onMouseEnter={() => setIsHoveringDogCity(true)}
              onMouseLeave={() => setIsHoveringDogCity(false)}
            >
              <img
                src={isHoveringDogCity ? dog_city_motion : dog_city}
                alt="Dog City"
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">Dog City</h3>
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  React | Axios | ChartJS
                </h4>
                <p className="text-gray-700 text-base">
                  Dog City is a React web app for dog lovers that lets users
                  browse 172 dog breeds and view their characteristics and
                  images.
                </p>
                <div className="flex justify-center mt-4">
                  <a
                    href="https://dog-city.netlify.app/"
                    className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md border border-blue-500 mr-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={link}
                      alt="Deployed App"
                      className="w-full h-8 object-cover"
                    />
                  </a>
                  <a
                    href="https://github.com/Duncan-Wood/Dog-City"
                    className="bg-gray-300 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md border border-gray-500"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={github}
                      alt="Github"
                      className="w-full h-8 object-cover"
                    />
                  </a>
                </div>
              </div>
            </div>
            {/* Sunrise Weather */}
            <div
              className="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 hover:shadow-lg transition duration-300"
              onMouseEnter={() => setIsHoveringSunriseWeather(true)}
              onMouseLeave={() => setIsHoveringSunriseWeather(false)}
            >
              <img
                src={
                  isHoveringSunriseWeather
                    ? sunrise_weather_motion
                    : sunrise_weather
                }
                alt="Sunrise Weather"
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">Sunrise Weather</h3>
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  HTML | Axios | JavaScript
                </h4>
                <p className="text-gray-700 text-base">
                  Sunrise Weather is a single-page website that displays current
                  weather information from a weather API and a random quote to
                  brighten up your day.
                </p>
                <div className="flex justify-center mt-4">
                  <a
                    href="https://sunrise-weather.surge.sh"
                    className="bg-blue-300 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md border border-blue-500 mr-4"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={link}
                      alt="Deployed App"
                      className="w-full h-8 object-cover"
                    />
                  </a>
                  <a
                    href="https://github.com/Duncan-Wood/Sunrise-Weather"
                    className="bg-gray-300 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md border border-gray-500"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={github}
                      alt="Github"
                      className="w-full h-8 object-cover"
                    />
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="text-center mt-4">
        <button
          className="bg-gray-400 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
          onClick={toggleProjects}
        >
          {showAllProjects ? "Show Less" : "Show All"}
        </button>
      </div>
    </div>
  );
};

export default Projects;
