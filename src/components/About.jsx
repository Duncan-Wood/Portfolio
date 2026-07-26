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
            I'm a full-stack software engineer with 2+ years of professional
            experience and a background in writing and rhetoric — a combination
            that helps me translate ambiguous, high-stakes problems into
            reliable, production-grade software. At EcoMap Technologies I became
            the sole engineer on a 70+ customer white-labeled platform during an
            abrupt organizational transition, stabilizing it while continuing to
            ship 0-to-1 features across Next.js, TypeScript, Ruby on Rails, and
            Python services. As a contract developer with Mighty Crow I designed
            a rule-based housing-compliance engine and shipped a HIPAA-compliant
            document-conversion service on Google Cloud Run that replaced an
            expensive commercial tool. I care most about work that empowers
            disadvantaged communities and improves access to mental-health
            resources — and about finding the real root cause of a problem
            rather than the first fix that compiles.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
