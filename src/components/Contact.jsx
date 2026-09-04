import { useRef, useState } from "react";
import emailjs from "emailjs-com";

/*
 * The contact form — and the only part of the portfolio that talks to anything
 * external.
 *
 * THERE IS NO BACKEND. EmailJS is a third-party service that accepts the form
 * contents straight from the browser and relays them as an email. That is why
 * this site can be hosted as pure static files with no server anywhere.
 *
 * The trade-off: the service id, template id and public key below are visible
 * in the shipped JavaScript. That is by design — EmailJS calls it a *public*
 * key precisely because it is meant to be exposed, and abuse is limited on
 * their side by domain allow-listing and rate limits. It is NOT a secret that
 * has leaked. A private key would be a different matter and must never appear
 * in client code.
 */
import linkedin from "../assets/linkedin.png";
import github from "../assets/github.png";
import resume from "../assets/resume.png";

const Contact = () => {
  /**
   * A ref to the <form> DOM node. EmailJS's `sendForm` reads the live element
   * and its named inputs directly, rather than taking a JavaScript object — so
   * this is an uncontrolled form, with no React state per field. The `name`
   * attributes on the inputs (`from_name`, `user_email`, `message`) are what
   * the EmailJS template expects, so renaming one silently empties a field in
   * the delivered email.
   */
  const form = useRef();

  /** null before submitting, then "success" or "error". Drives the message below. */
  const [status, setStatus] = useState(null);

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
        () => {
          setStatus("success");
          form.current.reset();
        },
        () => {
          setStatus("error");
        }
      );
  };

  return (
    <div
      // Scroll target for the nav link of the same name; renaming it
      // silently breaks that link. See nav.jsx.
      id='contact'
      className="bg-white p-8 rounded-lg shadow-lg"
    >
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
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-sm"
              type="submit"
              value="Send"
            >
              Send
            </button>
          </div>
          {/*
            `role="status"` is announced politely by screen readers, while
            `role="alert"` below interrupts — the right split for a confirmation
            versus a failure the user must act on.
          */}
          {status === "success" && (
            <p role="status" className="text-center text-green-600 font-medium">
              Thanks — your message is on its way.
            </p>
          )}
          {status === "error" && (
            <p role="alert" className="text-center text-red-600 font-medium">
              Something went wrong — email me directly at{" "}
              <a href="mailto:duncanwoodpro@gmail.com" className="underline">
                duncanwoodpro@gmail.com
              </a>
              .
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Contact;
