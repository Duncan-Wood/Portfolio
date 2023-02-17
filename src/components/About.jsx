import Headshot from "./headshot"

const About = () => {
    return (
        <section id="about">
            <div className="aboutText">
                <h3>About Me</h3>
                <p>As a full stack developer with a background in rhetorical writing, I have a unique perspective that allows me to investigate complex problems and create meaningful solutions through software development. My proficiency in JavaScript, React.js, Python, and other technologies, combined with my experience in creating full stack applications, makes me a valuable asset to any software engineering team. I am passionate about using my skills to make a difference in people's lives, particularly in the area of mental health and empowering disadvantaged communities. With a commitment to collaboration, continuous learning, and innovation, I am excited to bring my skills and experience to an entry-level software engineering role and contribute to meaningful projects that positively impact society.</p>
            </div>
            <div className="headshot">
                <Headshot />
            </div>
        </section>    
    )
}

export default About