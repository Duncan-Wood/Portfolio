import { useEffect } from "react";
import { Link } from "react-router-dom";
import { GiBrain } from "react-icons/gi";
import "./StoryLanding.css";

const StoryLanding = () => {
  useEffect(() => {
    const previous = document.title;
    document.title = "Duncan Wood — Story";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="story">
      <Link to="/" className="story__standard">
        Standard version
      </Link>
      <div className="story__inner">
        <div className="story__brain" aria-hidden="true">
          <GiBrain className="story__brain-icon" />
          <span className="story__focal" />
        </div>
        <h1 className="story__name">Duncan Wood</h1>
        <p className="story__tag">An interactive story</p>
      </div>
      <footer className="story__credit">
        Brain by{" "}
        <a
          href="https://game-icons.net/1x1/lorc/brain.html"
          target="_blank"
          rel="noreferrer"
        >
          Lorc
        </a>{" "}
        · game-icons.net · recolored ·{" "}
        <a
          href="https://creativecommons.org/licenses/by/3.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 3.0
        </a>
      </footer>
    </div>
  );
};

export default StoryLanding;
