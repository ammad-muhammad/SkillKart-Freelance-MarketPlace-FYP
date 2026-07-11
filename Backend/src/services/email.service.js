const createEmailTransporter = require('../config/email');
const config = require('../config');
const EmailLog = require('../models/EmailLog');

// Record every send attempt so the admin Monitoring → Email tab has real data.
// Fire-and-forget; logging must never affect the send outcome.
const logEmail = (to, subject, status, errorMessage) => {
  EmailLog.create({ to, subject, status, errorMessage, sentAt: new Date() }).catch(() => {});
};

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
    logEmail(to, subject, 'sent');
    return info;
  } catch (error) {
    console.error('Email send error:', error);
    logEmail(to, subject, 'failed', error.message);
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
    recovery_email_change: 'Recovery Email Change',
    sensitive_operation: 'Security Verification',
    login: 'Login Verification'
  };

  if (purpose === 'recovery_email_change') {
    const subject = `🔒 Security Code for Recovery Email Update`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Verification Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 20px; line-height: 1.6; color: #1f2937;">
        <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          
          <!-- Branded Header -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 30px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">SkillKart Security</h2>
            <p style="color: #c7d2fe; margin: 5px 0 0 0; font-size: 14px; font-weight: 500;">Recovery Email Update Verification</p>
          </div>

          <!-- Body Content -->
          <div style="padding: 40px 30px;">
            <p style="margin-top: 0; font-size: 16px;">Hello,</p>
            <p style="font-size: 15px; color: #4b5563; margin-bottom: 25px;">
              We received a request to update the <strong>security recovery email</strong> for your SkillKart account. To complete this change, please use the following one-time verification code:
            </p>

            <!-- Prominent OTP Code -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <span style="display: block; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Verification Code</span>
              <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #4f46e5; letter-spacing: 8px; margin: 0; padding-left: 8px;">${otp}</div>
            </div>

            <!-- Expiry & Instructions -->
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
              <p style="margin: 0; font-size: 14px; color: #b45309; font-weight: 500;">
                ⏳ This security code is strictly confidential and will expire in <strong style="color: #92400e;">10 minutes</strong>.
              </p>
            </div>

            <!-- Security Warning -->
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #dc2626; font-weight: 600;">Didn't make this request?</h4>
            <p style="margin: 0; font-size: 13.5px; color: #6b7280;">
              If you did not request this update, someone else may be trying to access your account. Please ignore this message and ensure your primary account credentials are secure.
            </p>
          </div>

          <!-- Clean Footer -->
          <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              This is an automated security transmission. Please do not reply directly to this email.
            </p>
            <p style="margin: 6px 0 0 0; font-size: 12px; font-weight: 600; color: #4f46e5;">
              © 2026 SkillKart Security Team
            </p>
          </div>

        </div>
      </body>
      </html>
    `;
    return await sendEmail(to, subject, html);
  }

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

/**
 * Send password change alert email
 */
const sendPasswordChangeAlertEmail = async (to, details) => {
  const { time, browser, device, ip } = details;
  const subject = 'Security Alert: Password Changed';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .header { background: #4b5563; color: white; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
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
          <h1>Password Changed Successfully</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>This is a confirmation that your SkillKart account password has been changed successfully.</p>
          
          <div class="details">
            <div class="detail-item"><span class="detail-label">Time:</span> ${time}</div>
            <div class="detail-item"><span class="detail-label">Device:</span> ${device || 'Unknown Device'}</div>
            <div class="detail-item"><span class="detail-label">Browser:</span> ${browser || 'Unknown Browser'}</div>
            ${ip ? `<div class="detail-item"><span class="detail-label">IP Address:</span> ${ip}</div>` : ''}
          </div>
          
          <p class="warning">If you did NOT change your password, please contact support and secure your account immediately.</p>
        </div>
        <div class="footer">
          <p>This is an automated security notification.</p>
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
  sendLoginAlertEmail,
  sendPasswordChangeAlertEmail
};
