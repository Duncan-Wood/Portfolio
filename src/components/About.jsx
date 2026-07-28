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
            I'm a software engineer with a background in writing and rhetoric —
            a combination that helps me turn ambiguous, high-stakes problems into
            reliable software and communicate the thinking behind it. Over the
            past two years I've owned the stability of a 70+ customer platform,
            built internal tools from an empty repo, and worked across Python,
            TypeScript, Ruby on Rails, and Google Cloud. I'm especially drawn to
            work that widens access and supports mental health.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
