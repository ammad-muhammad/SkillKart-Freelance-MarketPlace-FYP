const authService = require('../services/auth.service');
const otpService = require('../services/otp.service');
const { sendSuccess, sendCreated, sendError } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');

/**
 * createUser: create user and send otp
 */
const createUser = asyncHandler(async (req, res) => {
  const { email , password , role } = req.body;

  const user = await authService.registerWithEmail({
    email, password, role
  });

  await otpService.generateAndSendOTP(email, 'email_verification');

  sendSuccess(res, {
    message: 'User Created and OTP sent to your email',
    data: { user }
  });
});

/**
 * Login with Email/Password (Direct - No OTP)
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  let isOtpSend;
  const result = await authService.loginWithEmail(email, password);
  console.log(result)
  if (result.valid) {
    isOtpSend = await otpService.generateAndSendOTP(email, 'email_verification');
  }

  sendSuccess(res, {
    message: 'Login successful',
    data: { result, isOtpSend }
  });
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
    
    // If user found and email verified successfully
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

  await authService.changePassword(userId, currentPassword, newPassword);

  sendSuccess(res, {
    message: 'Password changed successfully'
  });
});

/**
 * Request Password Reset
 */
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

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
  logout
};
