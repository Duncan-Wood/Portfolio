import headshot from "../assets/headshot.png";
import linkedin from "../assets/linkedin.png";
import github from "../assets/github.png";
import resume from "../assets/resume.png";

const Home = () => {
  return (
    <div
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
              href="https://docs.google.com/document/d/1S1OmTFn_FNE7jcgu3MyRMuzcYBRcIsjW/edit?usp=sharing&ouid=105120848197838885353&rtpof=true&sd=true"
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
            I'm a software engineer based out of Northern Virginia
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Home;
