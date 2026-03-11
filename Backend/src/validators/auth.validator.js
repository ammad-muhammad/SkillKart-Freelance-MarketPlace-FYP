const { body, query, param } = require('express-validator');
const { REGEX, USER_ROLES } = require('../utils/constants');

/**
 * Validation rules for authentication endpoints
 */

// Register validation (Email/Password)
const registerValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),

  body('role')
    .optional()
    .isIn([USER_ROLES.FREELANCER, USER_ROLES.CLIENT, USER_ROLES.PUBLIC_VIEWER])
    .withMessage('Invalid role. Must be freelancer, client, or publicviewer')
];

// Login validation (Email/Password)
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

// Email validation (for OTP requests)
const emailValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
];

// OTP verification validation
const otpVerificationValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers')
];

// Password reset request validation
const passwordResetRequestValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
];

// Password reset validation
const passwordResetValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number')
];

// Change password validation
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),

  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match')
];

// Role Change validation
const changeRoleValidation = [
  body('role')
    .optional()
    .isIn([USER_ROLES.FREELANCER, USER_ROLES.CLIENT, USER_ROLES.PUBLIC_VIEWER])
    .withMessage('Invalid role. Must be freelancer, client, or publicviewer')
];

// Refresh token validation
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
    .isString().withMessage('Invalid refresh token format')
];

// Email verification validation
const emailVerificationValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers')
];

// OAuth callback validation
const oauthCallbackValidation = [
  query('code')
    .notEmpty().withMessage('Authorization code is required'),

  query('role')
    .optional()
    .isIn([USER_ROLES.FREELANCER, USER_ROLES.CLIENT, USER_ROLES.PUBLIC_VIEWER])
    .withMessage('Invalid role')
];

// SuperAdmin login validation
const superAdminLoginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 4 }).withMessage('Username must be at least 4 characters'),

  body('password')
    .notEmpty().withMessage('Password is required')
];

// Update email validation
const updateEmailValidation = [
  body('newEmail')
    .trim()
    .notEmpty().withMessage('New email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers')
];

// Resend OTP validation
const resendOtpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('purpose')
    .optional()
    .isIn(['email_verification', 'password_reset', 'profile_update', 'email_change'])
    .withMessage('Invalid OTP purpose')
];

module.exports = {
  registerValidation,
  loginValidation,
  emailValidation,
  otpVerificationValidation,
  passwordResetRequestValidation,
  passwordResetValidation,
  changePasswordValidation,
  refreshTokenValidation,
  emailVerificationValidation,
  oauthCallbackValidation,
  superAdminLoginValidation,
  updateEmailValidation,
  resendOtpValidation,
  changeRoleValidation
};
