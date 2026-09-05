const { body, query, param } = require('express-validator');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

/**
 * Validation rules for user management endpoints
 */

// Get user by ID validation
const getUserByIdValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format')
];

// Create user validation (Admin)
const createUserValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),

  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format'),

  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

// Update user validation
const updateUserValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format'),

  body('profilePicture')
    .optional()
    .isURL().withMessage('Invalid profile picture URL'),

  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role')
];

// Delete user validation
const deleteUserValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format')
];

// Block user validation
const blockUserValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
];

// Unblock user validation
const unblockUserValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format')
];

// Update user role validation
const updateUserRoleValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role')
];

// List users validation
const listUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role filter'),

  query('status')
    .optional()
    .isIn(['active', 'inactive', 'blocked'])
    .withMessage('Invalid status filter'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query too long'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'email', 'firstName', 'lastName', 'role'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Assign permissions validation
const assignPermissionsValidation = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format'),

  body('permissions')
    .isArray().withMessage('Permissions must be an array')
    .notEmpty().withMessage('Permissions array cannot be empty'),

  body('permissions.*')
    .isString().withMessage('Each permission must be a string')
    .trim()
    .notEmpty().withMessage('Permission cannot be empty')
];

// Bulk update users validation
const bulkUpdateUsersValidation = [
  body('userIds')
    .isArray({ min: 1 }).withMessage('User IDs must be a non-empty array'),

  body('userIds.*')
    .isMongoId().withMessage('Invalid user ID format'),

  body('updates')
    .notEmpty().withMessage('Updates object is required')
    .isObject().withMessage('Updates must be an object'),

  body('updates.isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),

  body('updates.role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role')
];

// Export users validation
const exportUsersValidation = [
  query('format')
    .optional()
    .isIn(['csv', 'json', 'xlsx'])
    .withMessage('Format must be csv, json, or xlsx'),

  query('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role filter'),

  query('status')
    .optional()
    .isIn(['active', 'inactive', 'blocked'])
    .withMessage('Invalid status filter')
];

// Import users validation
const importUsersValidation = [
  body('users')
    .isArray({ min: 1 }).withMessage('Users must be a non-empty array'),

  body('users.*.email')
    .isEmail().withMessage('Invalid email format'),

  body('users.*.firstName')
    .trim()
    .notEmpty().withMessage('First name is required'),

  body('users.*.lastName')
    .trim()
    .notEmpty().withMessage('Last name is required'),

  body('users.*.role')
    .isIn(Object.values(USER_ROLES))
    .withMessage('Invalid role')
];

// Get user statistics validation
const getUserStatsValidation = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),

  query('groupBy')
    .optional()
    .isIn(['role', 'status', 'authProvider', 'createdAt'])
    .withMessage('Invalid groupBy field')
];

// Search users validation
const searchUsersValidation = [
  query('q')
    .trim()
    .notEmpty().withMessage('Search query is required')
    .isLength({ min: 2, max: 100 }).withMessage('Search query must be 2-100 characters'),

  query('fields')
    .optional()
    .isIn(['email', 'name', 'all'])
    .withMessage('Invalid search fields'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

// Admin reset-any-user's-password validation — this route previously had no
// validator at all, so an admin could set another user's password to an
// empty string or a single character, bypassing every complexity rule
// registration/self-service reset enforce.
const resetUserPasswordValidation = [
  param('id')
    .isMongoId().withMessage('Invalid user ID format'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number')
];

module.exports = {
  getUserByIdValidation,
  createUserValidation,
  resetUserPasswordValidation,
  updateUserValidation,
  deleteUserValidation,
  blockUserValidation,
  unblockUserValidation,
  updateUserRoleValidation,
  listUsersValidation,
  assignPermissionsValidation,
  bulkUpdateUsersValidation,
  exportUsersValidation,
  importUsersValidation,
  getUserStatsValidation,
  searchUsersValidation
};
