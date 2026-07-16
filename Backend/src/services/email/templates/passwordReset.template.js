/**
 * Password reset email template — pure function.
 * @param {{ otp: string }} vars
 * @returns {{ subject: string, html: string, text: string }}
 */
module.exports = function passwordResetTemplate({ otp }) {
  const subject = 'Password Reset Request';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Password Reset</h1>
        <p>You requested to reset your password.</p>
        <p>Your verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; letter-spacing: 8px; margin: 20px 0;">${otp}</div>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  const text = `Password Reset\n\nYour verification code is: ${otp}\nThis code expires in 10 minutes.\nIf you didn't request this, please ignore this email.`;

  return { subject, html, text };
};
