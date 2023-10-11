// References:
// https://tvolsen.github.io/?fbclid=IwAR10ehcoO-Q0AmVRIW2CCpECjArNk1qoi2pMXhCKptlDOOnGKMZJwIG8Z0U
// https://www.adeolaadeoti.xyz/
// https://www.rammaheshwari.com/
// https://mattfarley.ca/
// https://brittanychiang.com/
// https://css-tricks.com/hamburger-menu-with-a-side-of-react-hooks-and-styled-components/
// https://mannyaalonso.com/
// https://openai.com/blog/chatgpt/
// https://elliottventura.com/
// https://yaelkaufman.netlify.app/
// https://toni-h-portfolio.netlify.app/
// https://joshuarizek.netlify.app/
// https://austinholland.vercel.app/

import "./App.css";
import Nav from "./components/nav";
import Home from "./components/home";
import About from "./components/About";
import Projects from "./components/Projects";
import Skills from "./components/Skills";
import Contact from "./components/Contact";

function App() {
  return (
    <>
      <Nav className="sticky top-0 z-50" />
      <main id="body">
        <Home id="home" />
        <About id="about" />
        <Projects id="projects" />
        <Skills id="skills" />
        <Contact id="contact" />
      </main>
    </>
  );
}

export default App;
