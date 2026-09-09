import { useEffect } from "react";
import { scroller } from "react-scroll";

import Nav, { scrollLinks } from "./nav";
import Home from "./home";
import About from "./About";
import Experience from "./Experience";
import Projects from "./Projects";
import Skills from "./Skills";
import Contact from "./Contact";

// The browser resolves the hash before React has rendered anything to scroll to.
const useHashTarget = () => {
  useEffect(() => {
    const target = scrollLinks.find(
      (link) => link.to === window.location.hash.slice(1)
    );

    if (!target) {
      return;
    }

    scroller.scrollTo(target.to, {
      smooth: true,
      duration: 500,
      offset: target.offset ?? -100,
    });
  }, []);
};

const StandardPortfolio = () => {
  useHashTarget();

  return (
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
};

export default StandardPortfolio;
