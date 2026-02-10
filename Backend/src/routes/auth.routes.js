const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const {
  registerValidation,
  loginValidation,
  emailValidation,
  otpVerificationValidation,
  passwordResetValidation,
  changePasswordValidation,
  refreshTokenValidation,
  superAdminLoginValidation,
  resendOtpValidation
} = require('../validators/auth.validator');

/**
 * Public routes
 */

// Two-step registration
router.post('/register/step1',
  authLimiter,
  emailValidation,
  validate,
  authController.registerStep1
);

router.post('/register/step2',
  authLimiter,
  otpVerificationValidation,
  validate,
  authController.registerStep2
);

// Two-step login
router.post('/login/step1',
  authLimiter,
  emailValidation,
  validate,
  authController.loginStep1
);

router.post('/login/step2',
  authLimiter,
  otpVerificationValidation,
  validate,
  authController.loginStep2
);

// Direct login (no OTP)
router.post('/login',
  authLimiter,
  loginValidation,
  validate,
  authController.login
);

// SuperAdmin login
router.post('/superadmin/login',
  authLimiter,
  superAdminLoginValidation,
  validate,
  authController.superAdminLogin
);

// Password reset
router.post('/password/reset/request',
  authLimiter,
  emailValidation,
  validate,
  authController.requestPasswordReset
);

router.post('/password/reset',
  authLimiter,
  passwordResetValidation,
  validate,
  authController.resetPassword
);

// Email verification
router.post('/email/verify',
  authLimiter,
  otpVerificationValidation,
  validate,
  authController.verifyEmail
);

// Resend OTP
router.post('/otp/resend',
  authLimiter,
  resendOtpValidation,
  validate,
  authController.resendOTP
);

// Refresh token
router.post('/refresh',
  refreshTokenValidation,
  validate,
  authController.refreshToken
);

/**
 * Protected routes
 */

// Get current user
router.get('/me',
  authenticate,
  authController.getCurrentUser
);

// Change password
router.post('/password/change',
  authenticate,
  changePasswordValidation,
  validate,
  authController.changePassword
);

// Logout
router.post('/logout',
  authenticate,
  authController.logout
);

module.exports = router;
