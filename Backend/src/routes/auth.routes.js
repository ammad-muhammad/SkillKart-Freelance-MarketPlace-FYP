const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { verifyRecaptcha } = require('../middleware/recaptcha.middleware');
const {
  registerValidation,
  loginValidation,
  emailValidation,
  otpVerificationValidation,
  passwordResetValidation,
  changePasswordValidation,
  refreshTokenValidation,
  superAdminLoginValidation,
  resendOtpValidation,
  changeRoleValidation,
  confirmChangePasswordValidation
} = require('../validators/auth.validator');

/**
 * Public routes
 */

/**
 * @swagger
 * /api/v1/auth/register/user:
 *   post:
 *     summary: Register a new user and send OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [freelancer, client]
 *     responses:
 *       201:
 *         description: User created and OTP sent
 */
router.post('/register/user',
  authLimiter,
  verifyRecaptcha('register'),
  emailValidation,
  validate,
  authController.createUser
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful, OTP sent to email
 *       401:
 *         description: Invalid credentials
 */
router.post('/login',
  authLimiter,
  verifyRecaptcha('login'),
  loginValidation,
  validate,
  authController.login
);

/**
 * @swagger
 * /api/v1/auth/otp/verify:
 *   post:
 *     summary: Verify OTP and get tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post('/otp/verify',
  authLimiter,
  otpVerificationValidation,
  validate,
  authController.verifyOtp
);

/**
 * @swagger
 * /api/v1/auth/superadmin/login:
 *   post:
 *     summary: SuperAdmin login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: SuperAdmin login successful
 */
router.post('/superadmin/login',
  authLimiter,
  superAdminLoginValidation,
  validate,
  authController.superAdminLogin
);

/**
 * @swagger
 * /api/v1/auth/password/reset/request:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to email
 */
router.post('/password/reset/request',
  authLimiter,
  emailValidation,
  validate,
  authController.requestPasswordReset
);

/**
 * @swagger
 * /api/v1/auth/password/reset:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/password/reset',
  authLimiter,
  passwordResetValidation,
  validate,
  authController.resetPassword
);

/**
 * @swagger
 * /api/v1/auth/email/verify:
 *   post:
 *     summary: Verify email with OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post('/email/verify',
  authLimiter,
  otpVerificationValidation,
  validate,
  authController.verifyEmail
);

/**
 * @swagger
 * /api/v1/auth/otp/resend:
 *   post:
 *     summary: Resend verification OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *               purpose:
 *                 type: string
 *                 enum: [email_verification, password_reset]
 *     responses:
 *       200:
 *         description: OTP resent successfully
 */
router.post('/otp/resend',
  authLimiter,
  resendOtpValidation,
  validate,
  authController.resendOTP
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post('/refresh',
  refreshTokenValidation,
  validate,
  authController.refreshToken
);

/**
 * Protected routes
 */

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 */
router.get('/me',
  authenticate,
  authController.getCurrentUser
);

router.get('/check-username',
  authenticate,
  authController.checkUsername
);

router.put('/me',
  authenticate,
  authController.updateMe
);

// Change Role
router.put('/role/change',
  authenticate,
  changeRoleValidation,
  validate,
  authController.updateRole
);

// Change password (Step 1: Request OTP)
router.post('/password/change',
  authenticate,
  changePasswordValidation,
  validate,
  authController.changePassword
);

// Confirm change password (Step 2: Verify OTP)
router.post('/password/change/confirm',
  authenticate,
  confirmChangePasswordValidation,
  validate,
  authController.confirmChangePassword
);

// Logout
router.post('/logout',
  authenticate,
  authController.logout
);

router.post('/logout-all',
  authenticate,
  authController.logoutAllDevices
);

// Email Change
router.post('/email/change/request',
  authenticate,
  authController.requestEmailChange
);

router.post('/email/change/confirm',
  authenticate,
  authController.confirmEmailChange
);

// Recovery Email Change
router.post('/recovery-email/change/request',
  authenticate,
  authController.requestRecoveryEmailChange
);

router.post('/recovery-email/change/confirm',
  authenticate,
  authController.confirmRecoveryEmailChange
);

router.post('/supabase-auth', 
  authController.supabaseAuth
);

// Account Deactivation
router.post('/deactivate/request',
  authenticate,
  authController.requestDeactivation
);

router.post('/deactivate/confirm',
  authenticate,
  authController.confirmDeactivation
);

// Permanent Account Deletion (OTP-gated, cascades data cleanup)
router.post('/delete/request',
  authenticate,
  authController.requestDeletion
);

router.post('/delete/confirm',
  authenticate,
  authController.confirmDeletion
);

module.exports = router;
