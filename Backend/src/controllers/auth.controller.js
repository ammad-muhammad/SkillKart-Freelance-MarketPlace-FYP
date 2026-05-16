const authService = require('../services/auth.service');
const { handleLoginAlert, handlePasswordChangeAlert } = authService;
const otpService = require('../services/otp.service');
const { sendSuccess, sendCreated, sendError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const User = require('../models/User');
const Job = require('../models/Job');
const { syncFreelancerVerification } = require('../services/verification.service');
/**
 * createUser: create user and send otp
 */
const createUser = asyncHandler(async (req, res) => {
  const { email , firstName, lastName, password , role } = req.body;

  const user = await authService.registerWithEmail({
    email, firstName, lastName, password, role
  });

  await otpService.generateAndSendOTP(email, 'email_verification');
  
  sendSuccess(res, {
    message: 'User Created and OTP sent to your email',
    data: { 
      user,
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
      otpService.generateAndSendOTP(email, 'email_verification')
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
    const tokens = require('../utils/jwt').generateTokenPair(user);
    
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
  const { email, otp } = req.body;
  let data;

  // Verify OTP
  const otpResult = await otpService.verifyOTP(email, otp, 'email_verification');
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
  const { firstName, lastName, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { firstName, lastName, phone },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  sendSuccess(res, {
    message: 'Profile updated successfully',
    data: { user: user.toAuthJSON() }
  });
});


/**
 * Refresh Token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const accessToken = await authService.refreshAccessToken(refreshToken);

  sendSuccess(res, {
    message: 'Token refreshed successfully',
    data: { accessToken }
  });
});

/**
 * Change Password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  // Step 1: Verify current password
  const user = await User.findById(userId).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    return sendError(res, 'Invalid current password', 401);
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
    return sendError(res, 'User not found', 404);
  }

  // Step 1: Verify OTP
  const isOtpValid = await otpService.verifyOTP(user.email, otp, 'password_reset');
  if (!isOtpValid) {
    return sendError(res, 'Invalid or expired OTP', 400);
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

  // Check if user exists
  const user = await User.findOne({ email });
  
  if (!user) {
    return sendError(res, {
      statusCode: 404,
      message: 'User with this email does not exist'
    });
  }

  // Only send OTP if user exists
  await otpService.generateAndSendOTP(email, 'password_reset');

  sendSuccess(res, {
    message: 'Password reset OTP sent to your email'
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

  await otpService.generateAndSendOTP(email, purpose || 'email_verification');

  sendSuccess(res, {
    message: 'OTP sent successfully'
  });
});

/**
 * Logout
 */
const logout = asyncHandler(async (req, res) => {
  // In a stateless JWT setup, logout is handled client-side
  // But you can blacklist tokens if needed

  sendSuccess(res, {
    message: 'Logged out successfully'
  });
});

/**
 * Authenticate with Supabase OAuth tokens
 */
const supabaseAuth = asyncHandler(async (req, res) => {
  const { supabaseAccessToken, supabaseRefreshToken } = req.body;

  console.log(supabaseAccessToken, req.body)

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
  supabaseAuth,
  updateRole,
  updateMe,
  requestDeactivation,
  confirmDeactivation,
  confirmChangePassword
};
