const config = require('../../../config');
const { escapeHtml } = require('./layout');

/**
 * @param {{ otp: string }} data
 * @returns {{ subject: string, html: string }}
 */
const render = ({ otp }) => ({
  subject: 'Password Reset Request',
  html: `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Password Reset</h1>
        <p>You requested to reset your password.</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; letter-spacing: 8px; margin: 20px 0;">${escapeHtml(otp)}</div>
        <p>This code expires in ${config.otp.expiryMinutes} minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    </body>
    </html>
  `
});

module.exports = { render };
