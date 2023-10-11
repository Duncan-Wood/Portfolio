import { useState } from "react";
import { Link as ScrollLink } from "react-scroll";
import purple_leaf_stroke from "../assets/design/purple-leaf-stroke.png";

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(false); // close the mobile menu if open when a link is clicked
  };

  return (
    <nav id="nav" className="bg-purple-800">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger Icon */}
              <svg
                className={`${isOpen ? "hidden" : "block"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Close Icon */}
              <svg
                className={`${isOpen ? "block" : "hidden"} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center sm:items-stretch sm:justify-center">
            <div className="hidden sm:block sm:ml-6">
              <div className="flex flex-row space-x-4 items-center">
                <ScrollLink
                  to="home"
                  smooth={true}
                  duration={500}
                  onClick={handleClick}
                  className="cursor-pointer text-white hover:bg-purple-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <img
                    src={purple_leaf_stroke}
                    alt="leaf"
                    className="h-10 mr-2"
                  />
                  Duncan Wood
                </ScrollLink>
                <ScrollLink
                  to="about"
                  smooth={true}
                  duration={500}
                  onClick={handleClick}
                  className="cursor-pointer text-white hover:bg-purple-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  About
                </ScrollLink>
                <ScrollLink
                  to="projects"
                  smooth={true}
                  duration={500}
                  onClick={handleClick}
                  className="cursor-pointer text-white hover:bg-purple-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Projects
                </ScrollLink>
                <ScrollLink
                  to="skills"
                  smooth={true}
                  duration={500}
                  onClick={handleClick}
                  className="cursor-pointer text-white hover:bg-purple-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Skills
                </ScrollLink>
                <ScrollLink
                  to="contact"
                  smooth={true}
                  duration={500}
                  onClick={handleClick}
                  className="cursor-pointer text-white hover:bg-purple-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Contact
                </ScrollLink>
                <a
                  href="https://docs.google.com/document/d/1S1OmTFn_FNE7jcgu3MyRMuzcYBRcIsjW/edit?usp=sharing&ouid=105120848197838885353&rtpof=true&sd=true"
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer text-white hover:bg-purple-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Resume
                </a>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile menu, toggle className based on menu state */}

        <div
          className={`${isOpen ? "block" : "hidden"} sm:hidden`}
          id="mobile-menu"
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <ScrollLink
              to="home"
              smooth={true}
              duration={500}
              onClick={handleClick}
              className="cursor-pointer text-white hover:bg-purple-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium flex flex-row items-center"
            >
              <img src={purple_leaf_stroke} alt="leaf" className="h-10 mr-2" />
              Duncan Wood
            </ScrollLink>
            <ScrollLink
              to="about"
              smooth={true}
              duration={500}
              onClick={handleClick}
              className="cursor-pointer text-white hover:bg-purple-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            >
              About
            </ScrollLink>
            <ScrollLink
              to="projects"
              smooth={true}
              duration={500}
              onClick={handleClick}
              className="cursor-pointer text-white hover:bg-purple-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            >
              Projects
            </ScrollLink>
            <ScrollLink
              to="skills"
              smooth={true}
              duration={500}
              onClick={handleClick}
              className="cursor-pointer text-white hover:bg-purple-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            >
              Skills
            </ScrollLink>
            <ScrollLink
              to="contact"
              smooth={true}
              duration={500}
              onClick={handleClick}
              className="cursor-pointer text-white hover:bg-purple-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            >
              Contact
            </ScrollLink>
            <a
              href="https://docs.google.com/document/d/1S1OmTFn_FNE7jcgu3MyRMuzcYBRcIsjW/edit?usp=sharing&ouid=105120848197838885353&rtpof=true&sd=true"
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer text-white hover:bg-purple-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
            >
              Resume
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
