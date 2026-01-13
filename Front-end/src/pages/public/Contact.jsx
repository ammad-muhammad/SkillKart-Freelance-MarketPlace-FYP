const Contact = () => (
    <section>
      <h1>Contact Us</h1>
      <form>
        <input type="text" placeholder="Your Name" required />
        <input type="email" placeholder="Email" required />
        <textarea placeholder="Message" required />
        <button type="submit">Send</button>
      </form>
    </section>
  );
  
  export default Contact;
  