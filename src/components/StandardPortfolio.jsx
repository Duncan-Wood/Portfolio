import Nav from "./nav";
import Home from "./home";
import About from "./About";
import Experience from "./Experience";
import Projects from "./Projects";
import Skills from "./Skills";
import Contact from "./Contact";

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
