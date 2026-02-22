const createEmailTransporter = require('../config/email');
const config = require('../config');

/**
 * Send email
 */
const sendEmail = async (to, subject, html, text = '') => {
  try {
    const transporter = createEmailTransporter();

    const mailOptions = {
      from: config.email.from,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Email send error:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send OTP email
 */
const sendOTPEmail = async (to, otp, purpose) => {
  const purposes = {
    email_verification: 'Email Verification',
    password_reset: 'Password Reset',
    profile_update: 'Profile Update',
    email_change: 'Email Change',
    sensitive_operation: 'Security Verification'
  };

  const subject = `${purposes[purpose] || 'Verification'} - Your OTP Code`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; letter-spacing: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verification Code</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Your OTP code for <strong>${purposes[purpose] || 'verification'}</strong> is:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (to, name) => {
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
        <a href="${config.frontend.url}/profile" style="display: inline-block; padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Complete Profile</a>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(to, subject, html);
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (to, otp) => {
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

  return await sendEmail(to, subject, html);
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
};
