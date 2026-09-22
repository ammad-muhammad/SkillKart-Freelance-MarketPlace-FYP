const authService = require('../services/auth.service');
const { handleLoginAlert, handlePasswordChangeAlert } = authService;
const otpService = require('../services/otp.service');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const User = require('../models/User');
const { BadRequestError } = require('../utils/apiError');
const { isUsernameTaken, applyUsernameUpdate } = require('../utils/username');
const Job = require('../models/Job');
const { syncFreelancerVerification } = require('../services/verification.service');
const pushService = require('../services/push.service');
/**
 * createUser: create user and send otp
 */
const createUser = asyncHandler(async (req, res) => {
  const { email , firstName, lastName, password , role } = req.body;

  const user = await authService.registerWithEmail({
    email, firstName, lastName, password, role
  });

  // The account is already created at this point — an email-provider hiccup
  // (e.g. an expired Gmail OAuth token) must not turn into a 500 that leaves
  // the user stuck with a real account they can never verify (retrying
  // registration would just hit a duplicate-email error). Let them proceed
  // to the OTP screen either way; its "Resend Code" action gives the email
  // provider another chance.
  let otpSent = true;
  try {
    await otpService.generateAndSendOTP(email, 'email_verification');
  } catch (err) {
    otpSent = false;
    console.error('[createUser] OTP send failed after account creation:', err.message);
  }

  sendSuccess(res, {
    message: otpSent
      ? 'User Created and OTP sent to your email'
      : 'Account created, but we could not send your verification email right now — use "Resend Code" on the next screen.',
    data: {
      user,
      otpSent
    }
  });
});

/**
 * Login with Email/Password (Direct - No OTP)
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Step 1: Verify credentials
    const result = await authService.loginWithEmail(email, password);
    const user = await User.findById(result.user);

    // Step 2: Check 2FA setting
    const is2FAEnabled = await authService.checkTwoFactorEnabled(user._id, user.role);

    if (is2FAEnabled) {
      // Send OTP in background
      otpService.generateAndSendOTP(email, 'login')
        .then(() => console.log("✅ 2FA OTP sent successfully"))
        .catch(err => console.error("⚠️ 2FA OTP send failed:", err.message));

      return res.status(200).json({
        success: true,
        message: 'Credentials verified. 2FA OTP sent to your email.',
        data: {
          userId: result.user,
          email: email,
          requires2FA: true
        }
      });
    }

    // Step 3: Direct Login (2FA Disabled)
    const tokens = await authService.issueTokenPair(user);
    
    // Trigger login alert
    handleLoginAlert(user, 'Email/Password (2FA Disabled)', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        tokens,
        user: user.toAuthJSON(),
        requires2FA: false
      }
    });

  } catch (error) {
    if (error.name === 'AuthenticationError') {
      return res.status(401).json({ success: false, message: error.message || 'Invalid credentials' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
});

/**
 * Verify OTP
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, purpose } = req.body;
  let data;

  const verificationPurpose = purpose || 'email_verification';

  // Verify OTP
  const otpResult = await otpService.verifyOTP(email, otp, verificationPurpose);
  if (!otpResult.valid) {
    return sendError(res, { statusCode: 400, message: otpResult.message });
  }

  // Try to verify email and check if user exists
  try {
    const emailResult = await authService.verifyEmail(email);
    
    if (emailResult.user) {
      handleLoginAlert(emailResult.user, 'Email/Password', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    data = { 
      tokens: emailResult.tokens, 
      user: emailResult.user, 
      isUserFound: true 
    };
  } catch (error) {
    // If user not found (NotFoundError)
    if (error.statusCode === 404 || error.name === 'NotFoundError') {
      data = { 
        tokens: null, 
        user: null, 
        isUserFound: false 
      };
    } else {
      // If it's some other error, rethrow it
      throw error;
    }
  }

  sendSuccess(res, {
    message: otpResult.message,
    data: data
  });
});
/**
 * SuperAdmin Login
 */
const superAdminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const result = await authService.loginSuperAdmin(username, password);

  sendSuccess(res, {
    message: 'SuperAdmin login successful',
    data: result
  });
});

/**
 * Get Current User
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;

  sendSuccess(res, {
    message: 'User retrieved successfully',
    data: { user }
  });
});

/**
 * Update user role
 */
const updateRole = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Get from authenticated token
  const { role } = req.body;
  
  // Validate role input
  if (!role) {
    return res.status(400).json({
      success: false,
      message: 'Role is required'
    });
  }

  // Validate role value
  const allowedRoles = ['freelancer', 'client', 'publicviewer'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}`
    });
  }
  
  // Update user by ID from token
  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  );
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  sendSuccess(res, {
    message: 'Your role updated successfully',
    data: { user: user.toAuthJSON() }
  });
});

/**
 * Update Current User Basic Info
 */
const updateMe = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { firstName, lastName, phone, username } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  if (username !== undefined && String(username).trim() !== '') {
    await applyUsernameUpdate(user, username);
  }

  await user.save();

  sendSuccess(res, {
    message: 'Profile updated successfully',
    data: { user: user.toAuthJSON() }
  });
});

/**
 * Register this device's FCM token for push notifications (mobile app only).
 * Idempotent — calling it again with the same token is a no-op.
 */
const registerPushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return sendError(res, { statusCode: 400, message: 'token is required' });
  }
  await pushService.registerToken(req.user._id, token);
  sendSuccess(res, { message: 'Push token registered' });
});

/**
 * Unregister this device's FCM token, e.g. on logout, so it stops receiving
 * pushes for an account it's no longer signed into.
 */
const removePushToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return sendError(res, { statusCode: 400, message: 'token is required' });
  }
  await pushService.removeToken(req.user._id, token);
  sendSuccess(res, { message: 'Push token removed' });
});

/**
 * Check if a username is available (any authenticated user)
 */
const checkUsername = asyncHandler(async (req, res) => {
  const { username } = req.query;
  if (!username || !String(username).trim()) {
    throw new BadRequestError('Username query parameter is required');
  }

  const exists = await isUsernameTaken(username, req.user._id);

  sendSuccess(res, {
    message: exists ? 'Username is already taken' : 'Username is available',
    data: { exists, available: !exists }
  });
});

/**
 * Request Email Change
 */
const requestEmailChange = asyncHandler(async (req, res) => {
  const { newEmail } = req.body;
  const userId = req.user._id;

  if (!newEmail || newEmail.trim() === '') {
    return sendError(res, { statusCode: 400, message: 'New email is required' });
  }

  const normalizedEmail = newEmail.trim().toLowerCase();

  // Check if new email is already in use
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return sendError(res, { statusCode: 400, message: 'Email is already in use' });
  }

  // Update pending email
  await User.findByIdAndUpdate(userId, { pendingEmail: normalizedEmail }, { new: true });

  // Generate OTP and send to new email
  await otpService.generateAndSendOTP(normalizedEmail, 'email_change');

  sendSuccess(res, {
    message: 'OTP sent to new email address'
  });
});

/**
 * Confirm Email Change
 */
const confirmEmailChange = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const userId = req.user._id;

  const user = await User.findById(userId);
  
  if (!user.pendingEmail) {
    return sendError(res, { statusCode: 400, message: 'No pending email change requested' });
  }

  const newEmail = user.pendingEmail;
  const oldEmail = user.email;

  // Verify OTP against the NEW email and 'email_change' purpose
  const otpResult = await otpService.verifyOTP(newEmail, otp, 'email_change');
  if (!otpResult.valid) {
    return sendError(res, { statusCode: 400, message: otpResult.message || 'Invalid OTP' });
  }

  // Find recovery email
  let recoveryEmail = null;
  if (user.role === 'freelancer') {
    const FreelancerProfile = require('../models/FreelancerProfile');
    const profile = await FreelancerProfile.findOne({ userId });
    recoveryEmail = profile?.securitySettings?.recoveryEmail;
  } else if (user.role === 'client') {
    const ClientProfile = require('../models/ClientProfile');
    const profile = await ClientProfile.findOne({ userId });
    recoveryEmail = profile?.securitySettings?.recoveryEmail || profile?.recoveryEmail;
  }

  // Update email and clear pending
  user.email = newEmail;
  user.pendingEmail = undefined;
  await user.save();

  // Send Security Alerts
  const emailService = require('../services/email.service');
  
  // Helper to mask email
  const maskEmail = (email) => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.substring(0, 3)}***@${domain}`;
  };

  const timestamp = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  
  const generateSecurityAlertHtml = (isRecoveryContact) => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #fef2f2; padding: 20px; border-bottom: 1px solid #fee2e2; text-align: center;">
        <h2 style="color: #dc2626; margin: 0; font-size: 20px;">⚠️ Critical Security Alert</h2>
      </div>
      <div style="padding: 30px 20px;">
        <p style="margin-top: 0;">Hello,</p>
        <p>You are receiving this notification because this email address is registered as the <strong>${isRecoveryContact ? 'designated security recovery contact' : 'primary email address'}</strong> for a SkillKart account.</p>
        <p>We want to inform you that the primary email address for this account was recently changed.</p>
        
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 25px 0;">
          <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Change Details</h3>
          <p style="margin: 5px 0;"><strong>Previous Email:</strong> ${maskEmail(oldEmail)}</p>
          <p style="margin: 5px 0;"><strong>New Email:</strong> ${newEmail}</p>
          <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${timestamp}</p>
          <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
          <p style="margin: 5px 0; word-break: break-all;"><strong>Device Info:</strong> <span style="font-size: 13px; color: #6b7280;">${userAgent}</span></p>
        </div>

        <h3 style="font-size: 16px; margin-top: 25px;">What does this mean?</h3>
        <p>The owner of the account has successfully verified their identity and updated their login credentials. All future communications, including password resets, will now be sent to the new email address.</p>

        <h3 style="font-size: 16px; color: #dc2626; margin-top: 25px;">Didn't authorize this change?</h3>
        <p>If you or the account owner did not make this change, the account may be compromised. Please take the following steps immediately:</p>
        <ol style="margin-bottom: 0;">
          <li style="margin-bottom: 8px;">Go to the SkillKart login page and attempt to reset your password.</li>
          <li style="margin-bottom: 8px;">If you cannot access the account, contact our dedicated support team immediately at <strong>support@skillkart.com</strong>.</li>
          <li>Provide this exact email as reference so we can investigate the unauthorized change and lock the account.</li>
        </ol>
      </div>
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">This is an automated security notification. Please do not reply directly to this email.</p>
        <p style="margin: 5px 0 0 0;">SkillKart Security Team</p>
      </div>
    </div>
  `;

  // 1. To old email
  await emailService.sendEmail(oldEmail, 'Critical Security Alert: Your email was changed', generateSecurityAlertHtml(false)).catch(console.error);
  // 2. To new email
  await emailService.sendEmail(newEmail, 'Email updated successfully', `<h2>Email Updated</h2><p>Your email has been successfully updated to ${newEmail} for your SkillKart account.</p>`).catch(console.error);
  // 3. To recovery email
  if (recoveryEmail && recoveryEmail !== oldEmail && recoveryEmail !== newEmail) {
    await emailService.sendEmail(recoveryEmail, 'Critical Security Alert: Account email updated', generateSecurityAlertHtml(true)).catch(console.error);
  }

  sendSuccess(res, {
    message: 'Email updated successfully'
  });
});

/**
 * Request Recovery Email Change
 */
const requestRecoveryEmailChange = asyncHandler(async (req, res) => {
  const { newRecoveryEmail } = req.body;
  const userId = req.user._id;

  if (!newRecoveryEmail || newRecoveryEmail.trim() === '') {
    return sendError(res, { statusCode: 400, message: 'New recovery email is required' });
  }

  const normalizedEmail = newRecoveryEmail.trim().toLowerCase();

  // Save pending recovery email on User
  await User.findByIdAndUpdate(userId, { pendingRecoveryEmail: normalizedEmail }, { new: true });

  // Generate and send OTP to the new recovery email
  await otpService.generateAndSendOTP(normalizedEmail, 'recovery_email_change');

  sendSuccess(res, {
    message: 'OTP sent to new recovery email'
  });
});

/**
 * Confirm Recovery Email Change
 */
const confirmRecoveryEmailChange = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user.pendingRecoveryEmail) {
    return sendError(res, { statusCode: 400, message: 'No pending recovery email change requested' });
  }

  const newRecoveryEmail = user.pendingRecoveryEmail;

  // Verify OTP against the NEW recovery email and 'recovery_email_change' purpose
  const otpResult = await otpService.verifyOTP(newRecoveryEmail, otp, 'recovery_email_change');
  if (!otpResult.valid) {
    return sendError(res, { statusCode: 400, message: otpResult.message || 'Invalid OTP' });
  }

  // Find current recovery email and update profile
  let oldRecoveryEmail = null;
  let profile = null;

  if (user.role === 'freelancer') {
    const FreelancerProfile = require('../models/FreelancerProfile');
    profile = await FreelancerProfile.findOne({ userId });
    if (profile) {
      oldRecoveryEmail = profile.securitySettings?.recoveryEmail;
      profile.securitySettings = {
        ...profile.securitySettings,
        recoveryEmail: newRecoveryEmail
      };
      await profile.save();
    }
  } else if (user.role === 'client') {
    const ClientProfile = require('../models/ClientProfile');
    profile = await ClientProfile.findOne({ userId });
    if (profile) {
      oldRecoveryEmail = profile.securitySettings?.recoveryEmail || profile.recoveryEmail;
      profile.securitySettings = {
        ...(profile.securitySettings || {}),
        recoveryEmail: newRecoveryEmail
      };
      await profile.save();
    }
  }

  // Clear pending recovery email on User
  user.pendingRecoveryEmail = undefined;
  await user.save();

  // Send Security Alerts
  const emailService = require('../services/email.service');
  const timestamp = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
  const userAgent = req.headers['user-agent'] || 'Unknown Device';

  const maskEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.substring(0, 3)}***@${domain}`;
  };

  const generateRecoveryChangeAlertHtml = (isOldEmail) => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #fef2f2; padding: 20px; border-bottom: 1px solid #fee2e2; text-align: center;">
        <h2 style="color: #dc2626; margin: 0; font-size: 20px;">⚠️ Security Alert: Recovery Email Changed</h2>
      </div>
      <div style="padding: 30px 20px;">
        <p style="margin-top: 0;">Hello,</p>
        <p>You are receiving this notification because a request was processed to change the security recovery contact email for a SkillKart account.</p>
        
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin: 25px 0;">
          <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Change Details</h3>
          <p style="margin: 5px 0;"><strong>Previous Recovery Email:</strong> ${oldRecoveryEmail ? maskEmail(oldRecoveryEmail) : 'None set'}</p>
          <p style="margin: 5px 0;"><strong>New Recovery Email:</strong> ${newRecoveryEmail}</p>
          <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${timestamp}</p>
          <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>
          <p style="margin: 5px 0; word-break: break-all;"><strong>Device Info:</strong> <span style="font-size: 13px; color: #6b7280;">${userAgent}</span></p>
        </div>

        <p>If you authorized this change, no further action is required.</p>

        <h3 style="font-size: 16px; color: #dc2626; margin-top: 25px;">Didn't authorize this change?</h3>
        <p>If you did not make this change, please secure your SkillKart account immediately:</p>
        <ol style="margin-bottom: 0;">
          <li style="margin-bottom: 8px;">Login to SkillKart and change your primary password.</li>
          <li style="margin-bottom: 8px;">Contact our security support team immediately at <strong>support@skillkart.com</strong>.</li>
        </ol>
      </div>
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">This is an automated security notification. Please do not reply directly to this email.</p>
        <p style="margin: 5px 0 0 0;">SkillKart Security Team</p>
      </div>
    </div>
  `;

  // 1. Send alert to old recovery email (if it exists)
  if (oldRecoveryEmail) {
    await emailService.sendEmail(oldRecoveryEmail, 'Security Alert: Recovery email was changed', generateRecoveryChangeAlertHtml(true)).catch(console.error);
  }

  // 2. Send confirmation to new recovery email
  await emailService.sendEmail(newRecoveryEmail, 'Recovery email updated successfully', generateRecoveryChangeAlertHtml(false)).catch(console.error);

  sendSuccess(res, {
    message: 'Recovery email updated successfully'
  });
});

/**
 * Refresh Token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  // Rotates on every use — the response's refreshToken REPLACES the one the
  // client sent; reusing the old one again is treated as token theft.
  const { accessToken, refreshToken: newRefreshToken } = await authService.refreshAccessToken(refreshToken);

  sendSuccess(res, {
    message: 'Token refreshed successfully',
    data: { accessToken, refreshToken: newRefreshToken }
  });
});

/**
 * Change Password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword } = req.body;
  const userId = req.user._id;

  // Step 1: Verify current password
  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    return sendError(res, { 
      message: 'Current password is incorrect', 
      statusCode: 401,
      errors: [{ field: 'currentPassword', message: 'Current password is incorrect' }]
    });
  }

  // Step 2: Generate and Send OTP
  await otpService.generateAndSendOTP(user.email, 'password_reset');

  sendSuccess(res, {
    message: 'OTP sent to your email for password change confirmation'
  });
});

/**
 * Confirm Change Password (Step 2)
 */
const confirmChangePassword = asyncHandler(async (req, res) => {
  const { otp, newPassword } = req.body;
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    return sendError(res, { message: 'User not found', statusCode: 404 });
  }

  // Step 1: Verify OTP
  const otpResult = await otpService.verifyOTP(user.email, otp, 'password_reset');
  if (!otpResult.valid) {
    return sendError(res, { statusCode: 400, message: otpResult.message || 'Invalid OTP' });
  }

  // Step 2: Update Password
  await authService.resetPassword(user.email, newPassword);

  // Step 3: Trigger Alert
  handlePasswordChangeAlert(user, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  sendSuccess(res, {
    message: 'Password updated successfully'
  });
});

/**
 * Request Password Reset
 */
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Always return the same generic response whether or not the email is
  // registered — a differing response (404 vs 200) lets an attacker enumerate
  // valid accounts. Only actually send an OTP when the user exists.
  const user = await User.findOne({ email });
  if (user) {
    await otpService.generateAndSendOTP(email, 'password_reset');
  }

  sendSuccess(res, {
    message: 'If an account exists for this email, a password reset OTP has been sent.'
  });
});

/**
 * Reset Password with OTP
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Verify OTP
  const otpResult = await otpService.verifyOTP(email, otp, 'password_reset');
  if (!otpResult.valid) {
    return sendError(res, { statusCode: 400, message: otpResult.message });
  }

  await authService.resetPassword(email, newPassword);

  // Trigger password change alert
  const user = await User.findOne({ email });
  if (user) {
    handlePasswordChangeAlert(user, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  sendSuccess(res, {
    message: 'Password reset successful'
  });
});

/**
 * Verify Email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Verify OTP
  const otpResult = await otpService.verifyOTP(email, otp, 'email_verification');
  if (!otpResult.valid) {
    return sendError(res, { statusCode: 400, message: otpResult.message });
  }

  await authService.verifyEmail(email);

  // Sync verification if user is a freelancer
  const user = await User.findOne({ email });
  if (user && user.role === 'freelancer') {
    await syncFreelancerVerification(user._id);
  }

  sendSuccess(res, {
    message: 'Email verified successfully'
  });
});

/**
 * Resend OTP
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body;

  const result = await otpService.resendOTP(email, purpose || 'email_verification');
  if (!result.success) {
    return sendError(res, {
      statusCode: 429,
      message: result.message,
      errors: { secondsRemaining: result.secondsRemaining }
    });
  }

  sendSuccess(res, {
    message: result.message
  });
});

/**
 * Logout
 */
const logout = asyncHandler(async (req, res) => {
  // Revoke this specific refresh token's RefreshToken record so it can't be
  // used again (this device only — other logged-in devices are unaffected).
  await authService.revokeRefreshToken(req.body.refreshToken);

  sendSuccess(res, {
    message: 'Logged out successfully'
  });
});

/**
 * Log out from ALL devices by bumping the user's tokenVersion (invalidates
 * every previously-issued access token immediately) and revoking every
 * refresh token on record for this user.
 */
const logoutAllDevices = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  await authService.revokeAllRefreshTokens(req.user._id);

  sendSuccess(res, {
    message: 'Signed out from all devices'
  });
});

/**
 * Authenticate with Supabase OAuth tokens
 */
const supabaseAuth = asyncHandler(async (req, res) => {
  const { supabaseAccessToken } = req.body;

  if (!supabaseAccessToken) {
    return sendError(res, {
      statusCode: 400,
      message: 'Supabase access token is required'
    });
  }

  // Call auth service
  const result = await authService.authenticateWithSupabase(supabaseAccessToken);

  // Trigger login alert
  if (result.user) {
    handleLoginAlert(result.user, `${result.user.authProvider || 'OAuth'} Login`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  sendSuccess(res, {
    message: 'Authentication successful',
    data: result
  });
});

/**
 * Request Account Deactivation
 */
const requestDeactivation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = req.user;

  if (user.role === 'freelancer') {
    // Check for active jobs where hired
    const activeJobs = await Job.countDocuments({ hiredFreelancer: userId, status: 'in-progress' });
    if (activeJobs > 0) {
      return sendError(res, { statusCode: 400, message: 'You have active in-progress jobs. Please complete or cancel them before deactivating your account.' });
    }
  } else if (user.role === 'client') {
    // Check for active jobs created by client
    const activeJobs = await Job.countDocuments({ clientId: userId, status: { $in: ['open', 'in-progress'] } });
    if (activeJobs > 0) {
      return sendError(res, { statusCode: 400, message: 'You have open or in-progress jobs. Please complete or close them before deactivating your account.' });
    }
  }

  // Generate and send OTP for deactivation
  await otpService.generateAndSendOTP(user.email, 'account_deactivation');

  sendSuccess(res, {
    message: 'Deactivation OTP sent to your email'
  });
});

/**
 * Confirm Account Deactivation
 */
const confirmDeactivation = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = req.user;

  // Verify OTP
  const otpResult = await otpService.verifyOTP(user.email, otp, 'account_deactivation');
  if (!otpResult.valid) {
    return sendError(res, { statusCode: 400, message: otpResult.message });
  }

  // Deactivate account
  await User.findByIdAndUpdate(user._id, { isActive: false });

  sendSuccess(res, {
    message: 'Account successfully deactivated'
  });
});

/**
 * Request permanent Account Deletion (OTP-gated, stronger than deactivation).
 */
const requestDeletion = asyncHandler(async (req, res) => {
  const user = req.user;

  // Block deletion while the user has live commitments.
  if (user.role === 'freelancer') {
    const activeJobs = await Job.countDocuments({ hiredFreelancer: user._id, status: 'in-progress' });
    if (activeJobs > 0) {
      return sendError(res, { statusCode: 400, message: 'You have active in-progress jobs. Complete or cancel them before deleting your account.' });
    }
  } else if (user.role === 'client') {
    const activeJobs = await Job.countDocuments({ clientId: user._id, status: { $in: ['open', 'in-progress'] } });
    if (activeJobs > 0) {
      return sendError(res, { statusCode: 400, message: 'You have open or in-progress projects. Close them before deleting your account.' });
    }
  }

  await otpService.generateAndSendOTP(user.email, 'account_deletion');
  sendSuccess(res, { message: 'Deletion OTP sent to your email' });
});

/**
 * Confirm permanent Account Deletion — verifies OTP, then cascades cleanup of
 * the user's profile, jobs, gigs and proposals before removing the user.
 */
const confirmDeletion = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = req.user;

  const otpResult = await otpService.verifyOTP(user.email, otp, 'account_deletion');
  if (!otpResult.valid) {
    return sendError(res, { statusCode: 400, message: otpResult.message });
  }

  const FreelancerProfile = require('../models/FreelancerProfile');
  const ClientProfile = require('../models/ClientProfile');
  const Gig = require('../models/Gig');
  const Proposal = require('../models/Proposal');

  const userId = user._id;

  // Cascade delete everything owned by this user.
  await Promise.all([
    FreelancerProfile.deleteOne({ userId }),
    ClientProfile.deleteOne({ userId }),
    Gig.deleteMany({ freelancerId: userId }),
    Job.deleteMany({ clientId: userId }),
    Proposal.deleteMany({ freelancerId: userId }),
  ]);

  await User.findByIdAndDelete(userId);

  sendSuccess(res, { message: 'Account and all associated data permanently deleted' });
});

module.exports = {
  createUser,
  login,
  verifyOtp,
  superAdminLogin,
  getCurrentUser,
  refreshToken,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendOTP,
  logout,
  logoutAllDevices,
  supabaseAuth,
  updateRole,
  updateMe,
  registerPushToken,
  removePushToken,
  checkUsername,
  requestEmailChange,
  confirmEmailChange,
  requestRecoveryEmailChange,
  confirmRecoveryEmailChange,
  requestDeactivation,
  confirmDeactivation,
  requestDeletion,
  confirmDeletion,
  confirmChangePassword
};
