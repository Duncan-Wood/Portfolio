import { useRef } from "react";
import emailjs from "emailjs-com";
import linkedin from "../assets/linkedin.png";
import github from "../assets/github.png";
import resume from "../assets/resume.png";

const Contact = () => {
  const form = useRef();

  const sendEmail = (e) => {
    e.preventDefault();

    emailjs
      .sendForm(
        "service_cga7jcz",
        "contact_form",
        form.current,
        "UHwNnvmJByK7HhFBu"
      )
      .then(
        (result) => {
          console.log(result.text);
        },
        (error) => {
          console.log(error.text);
        }
      );
    e.target.reset();
  };

  return (
    <div id='contact' className="bg-white p-8 rounded-lg shadow-lg">
      <div
        id="contact-header"
        className="flex flex-col items-center justify-center"
      >
        <h1 className="text-3xl font-bold mb-4">Contact Me</h1>
        <h3 className="text-gray-600 mb-8">(duncanwoodpro@gmail.com)</h3>
        <div id="contact-icons" className="flex flex-row mb-10">
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
      </div>
      <div className="flex justify-center">
        <form
          id="contact__form"
          ref={form}
          onSubmit={sendEmail}
          className="space-y-4"
        >
          <div>
            <label
              className="block text-gray-700 font-bold mb-2 flex justify-center"
              htmlFor="name"
            >
              Name
            </label>
            <input
              className="w-full border border-gray-400 p-2 rounded-lg"
              type="text"
              id="name"
              name="from_name"
            />
          </div>
          <div>
            <label
              className="block text-gray-700 font-bold mb-2 flex justify-center"
              htmlFor="email"
            >
              Email
            </label>
            <input
              className="w-full border border-gray-400 p-2 rounded-lg"
              type="email"
              id="email"
              name="user_email"
            />
          </div>
          <div>
            <label
              className="block text-gray-700 font-bold mb-2 flex justify-center"
              htmlFor="message"
            >
              Message
            </label>
            <textarea
              id="contact__formMessage"
              className="w-full border border-gray-400 p-2 rounded-lg"
              name="message"
            ></textarea>
          </div>
          <div className="flex justify-center">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              type="submit"
              value="Send"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Contact;
