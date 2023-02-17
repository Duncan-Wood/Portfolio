// References: 
// https://tvolsen.github.io/?fbclid=IwAR10ehcoO-Q0AmVRIW2CCpECjArNk1qoi2pMXhCKptlDOOnGKMZJwIG8Z0U
// https://www.adeolaadeoti.xyz/
// https://www.rammaheshwari.com/
// https://mattfarley.ca/
// https://brittanychiang.com/
// https://css-tricks.com/hamburger-menu-with-a-side-of-react-hooks-and-styled-components/
// https://mannyaalonso.com/
// https://openai.com/blog/chatgpt/

import './App.css';
import Header from './components/Header'
import About from './components/About'
import Projects from './components/Projects';
import Contact from './components/Contact';
import Resume from './components/Resume';

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <About />
        <Projects />
        <Contact />
      </main>
      <footer>
        <div className="resume">
          <Resume />
        </div>
      </footer>
    </div>
  );
}

export default App;
