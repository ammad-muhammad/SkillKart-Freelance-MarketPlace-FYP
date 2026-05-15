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

/**
 * Send login alert email
 */
const sendLoginAlertEmail = async (to, details) => {
  const { time, method, browser, device, ip } = details;
  const subject = 'Security Alert: New Login Detected';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
        .content { padding: 30px; background: #ffffff; }
        .details { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .detail-item { margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .detail-label { font-weight: bold; color: #4b5563; min-width: 100px; display: inline-block; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        .warning { color: #dc2626; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Login Detected</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Your SkillKart account was successfully accessed. If this was you, you can safely ignore this email.</p>
          
          <div class="details">
            <div class="detail-item"><span class="detail-label">Time:</span> ${time}</div>
            <div class="detail-item"><span class="detail-label">Method:</span> ${method}</div>
            <div class="detail-item"><span class="detail-label">Device:</span> ${device || 'Unknown Device'}</div>
            <div class="detail-item"><span class="detail-label">Browser:</span> ${browser || 'Unknown Browser'}</div>
            ${ip ? `<div class="detail-item"><span class="detail-label">IP Address:</span> ${ip}</div>` : ''}
          </div>
          
          <p class="warning">If this was NOT you, please secure your account immediately by changing your password.</p>
          
          <a href="${config.frontend.url}/login" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">Secure My Account</a>
        </div>
        <div class="footer">
          <p>This is an automated security notification. For your protection, we send this email whenever a new login is detected.</p>
          <p>© ${new Date().getFullYear()} SkillKart. All rights reserved.</p>
        </div>
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
  sendPasswordResetEmail,
  sendLoginAlertEmail
};
