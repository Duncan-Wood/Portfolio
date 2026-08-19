/**
 * The hero section: headshot, name, social links, one-line summary.
 *
 * Images are IMPORTED rather than referenced by path. That matters — the build
 * fingerprints them (`headshot.4f3a....png`) and rewrites the reference, so
 * they can be cached forever and a changed image busts its own cache. A raw
 * `src="/assets/headshot.png"` would skip all of that.
 *
 * The exception is `/resume.pdf` below, which lives in `public/` and is served
 * verbatim — correct for a file whose URL should stay stable and shareable.
 */
import headshot from "../assets/headshot.png";
import linkedin from "../assets/linkedin.png";
import github from "../assets/github.png";
import resume from "../assets/resume.png";

const Home = () => {
  return (
    <div
      // `id` is the scroll target for the nav link of the same name.
      id="home"
      className="flex flex-col items-center justify-center p-8 lg:p-12 m-10"
    >
      <div
        id="inner-home"
        className="flex flex-col md:flex-row lg:flex-row p-8 justify-center  items-center "
      >
        <div className=" mr-8 flex justify-center pl-8 sm: mb-8">
          <img
            src={headshot}
            alt="Duncan's Headshot"
            id="headshot"
            className="rounded-full max-h-96 mx-auto"
          />
        </div>
        <div
          id="home-text"
          className="flex flex-col items-center justify-center"
        >
          <h2 className="text-4xl font-bold leading-tight text-center p-4">
            Hello! My name is Duncan Wood
          </h2>
          <div id="contact-icons" className="flex flex-row mt-4 ">
            {/*
              `noreferrer` suppresses the Referer header, and implies `noopener`
              (the attribute that actually severs `window.opener`). Modern
              browsers imply `noopener` for `target="_blank"` anyway, so this is
              belt-and-braces plus referrer privacy.
            */}
            <a
              href="https://www.linkedin.com/in/duncanwoodpro/"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={linkedin}
                alt="LinkedIn"
                className="w-auto h-10 object-cover mr-4"
              />
            </a>
            <a
              href="https://github.com/Duncan-Wood"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={github}
                alt="Github"
                className="w-auto h-10 object-cover mr-4"
              />
            </a>
            <a
              href="/resume.pdf"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={resume}
                alt="Resume"
                className="w-auto h-10 object-cover"
              />
            </a>
          </div>
          <h3 className="text-xl font-medium mt-4 text-center p-4">
            I'm a software engineer based in the Washington, D.C. area
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Home;
