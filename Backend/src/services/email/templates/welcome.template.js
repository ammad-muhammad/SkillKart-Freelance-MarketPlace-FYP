/**
 * Welcome email template — pure function.
 * @param {{ name: string, frontendUrl: string }} vars
 * @returns {{ subject: string, html: string, text: string }}
 */
module.exports = function welcomeTemplate({ name, frontendUrl }) {
  const subject = 'Welcome to Our Platform!';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Welcome, ${name}!</h1>
        <p>Thank you for joining our platform.</p>
        <p>We're excited to have you on board!</p>
        <p>Get started by completing your profile.</p>
        <a href="${frontendUrl}/profile" style="display: inline-block; padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Complete Profile</a>
      </div>
    </body>
    </html>
  `;

  const text = `Welcome, ${name}!\n\nThank you for joining our platform. We're excited to have you on board!\nGet started by completing your profile: ${frontendUrl}/profile`;

  return { subject, html, text };
};
