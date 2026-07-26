const About = () => {
  return (
    <div
      id="about"
      className="flex flex-col items-center justify-center md:justify-start px-8 "
    >
      <div className="flex flex-row m-5 ">
        <div className="max-w-3xl">
          <h3 className="text-2xl font-bold mb-2 text-center">About Me</h3>
          <p className="text-gray-600 leading-relaxed ">
            I'm a software engineer and a generalist at heart — more interested
            in building things that matter than in job titles. My path into tech
            ran through writing and rhetoric, community organizing, and a lot of
            curiosity, and the throughline is a belief in using technology to
            serve people and be part of something bigger than myself. I care
            about work that empowers communities, widens access, and supports
            mental health, and I like taking on ambiguous, high-stakes problems
            and staying with them until they genuinely work. Above all, I want
            the things I build to leave people a little better off than before.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
