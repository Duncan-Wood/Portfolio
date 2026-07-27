import { useState } from "react";
import { Link as ScrollLink } from "react-scroll";
import purple_leaf_stroke from "../assets/design/purple-leaf-stroke.png";

const scrollLinks = [
  { to: "home", label: "Duncan Wood", image: purple_leaf_stroke },
  { to: "about", label: "About" },
  { to: "experience", label: "Experience" },
  { to: "projects", label: "Projects" },
  { to: "skills", label: "Skills" },
  { to: "contact", label: "Contact", offset: 0 },
];

const linkBase = "cursor-pointer text-white hover:bg-purple-700 hover:text-white";
const variantClass = {
  desktop: "px-3 py-2 rounded-md text-sm font-medium",
  mobile: "block px-3 py-2 rounded-md text-base font-medium",
};
const homeRowClass = {
  desktop: "flex items-center",
  mobile: "flex flex-row items-center",
};

const NavLinks = ({ variant, onNavigate }) => {
  const className = (extra) =>
    `${linkBase} ${variantClass[variant]}${extra ? ` ${extra}` : ""}`;
  return (
    <>
      {scrollLinks.map((link) => (
        <ScrollLink
          key={link.to}
          to={link.to}
          smooth={true}
          duration={500}
          offset={link.offset ?? -100}
          onClick={onNavigate}
          className={className(link.image ? homeRowClass[variant] : "")}
        >
          {link.image && (
            <img src={link.image} alt="leaf" className="h-10 mr-2" />
          )}
          {link.label}
        </ScrollLink>
      ))}
      <a
        href="/resume.pdf"
        target="_blank"
        rel="noreferrer"
        className={className()}
      >
        Resume
      </a>
    </>
  );
};

const Nav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav id="nav" className="bg-purple-800">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <div className="absolute inset-y-0 left-0 flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
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
            <div className="hidden md:block md:ml-6">
              <div className="flex flex-row space-x-2 items-center">
                <NavLinks variant="desktop" onNavigate={closeMenu} />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`${isOpen ? "block" : "hidden"} md:hidden`}
          id="mobile-menu"
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            <NavLinks variant="mobile" onNavigate={closeMenu} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
