const config = require('../../../config');
const { escapeHtml } = require('./layout');

/**
 * @param {{ name: string }} data
 * @returns {{ subject: string, html: string }}
 */
const render = ({ name }) => ({
  subject: 'Welcome to Our Platform!',
  html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Welcome, ${escapeHtml(name)}!</h1>
        <p>Thank you for joining our platform.</p>
        <p>We're excited to have you on board!</p>
        <p>Get started by completing your profile.</p>
        <a href="${config.frontend.url}/profile" style="display: inline-block; padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Complete Profile</a>
      </div>
    </body>
    </html>
  `
});

module.exports = { render };
