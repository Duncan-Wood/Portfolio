import Nav from "./nav";
import Home from "./home";
import About from "./About";
import Experience from "./Experience";
import Projects from "./Projects";
import Skills from "./Skills";
import Contact from "./Contact";

/**
 * The whole portfolio: one page, six sections stacked vertically.
 *
 * There is no routing between sections — the nav scrolls to them. Each section
 * component renders a wrapper with an `id` (`home`, `about`, `experience`,
 * `projects`, `skills`, `contact`), and `nav.jsx` targets those ids by name.
 * Renaming an id therefore silently breaks a nav link, since nothing links the
 * two lists together but convention.
 */
const StandardPortfolio = () => (
  <>
    <Nav />
    <main id="body">
      <Home />
      <About />
      <Experience />
      <Projects />
      <Skills />
      <Contact />
    </main>
  </>
);

export default StandardPortfolio;
