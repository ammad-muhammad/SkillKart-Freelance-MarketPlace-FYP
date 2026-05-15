const { body, query, param } = require('express-validator');

/**
 * Validation rules for profile management endpoints
 */

// Update freelancer profile validation
const updateFreelancerProfileValidation = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Bio must not exceed 1000 characters'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Title must be 2-100 characters'),

  body('hourlyRate')
    .optional()
    .isFloat({ min: 0, max: 10000 }).withMessage('Hourly rate must be between 0 and 10000'),

  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array')
    .custom((value) => value.length >= 1).withMessage('At least one skill is required'),

  body('skills.*.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Each skill must be 2-50 characters'),

  body('availability')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'not-available'])
    .withMessage('Invalid availability option'),

  body('portfolio')
    .optional()
    .isArray().withMessage('Portfolio must be an array'),

  body('portfolio.*.title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Portfolio title must not exceed 100 characters'),

  body('portfolio.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Portfolio description must not exceed 500 characters'),

  body('portfolio.*.url')
    .optional({ values: 'falsy' })
    .isURL().withMessage('Invalid portfolio URL'),

  body('education')
    .optional()
    .isArray().withMessage('Education must be an array'),

  body('education.*.institution')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Institution name too long'),

  body('education.*.degree')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Degree name too long'),

  body('education.*.field')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Field of study too long'),

  body('education.*.startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),

  body('education.*.endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),

  body('certifications')
    .optional()
    .isArray().withMessage('Certifications must be an array'),

  body('certifications.*.name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Certification name too long'),

  body('certifications.*.issuer')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Issuer name too long'),

  body('certifications.*.issueDate')
    .optional()
    .isISO8601().withMessage('Invalid issue date format'),

  body('certifications.*.url')
    .optional({ values: 'falsy' })
    .isURL().withMessage('Invalid certification URL'),

  body('languages')
    .optional()
    .isArray().withMessage('Languages must be an array')
    .custom((value) => value.length >= 1).withMessage('At least one language is required'),

  body('languages.*.language')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Language name too long'),

  body('languages.*.proficiency')
    .optional()
    .isIn(['basic', 'conversational', 'fluent', 'native'])
    .withMessage('Invalid proficiency level')
];

// Update client profile validation
const updateClientProfileValidation = [
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Company name must be 2-100 characters'),

  body('companySize')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Company size must not exceed 50 characters'),

  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Industry must not exceed 100 characters'),

  body('website')
    .optional({ values: 'falsy' })
    .isURL().withMessage('Invalid website URL'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),

  body('location')
    .optional()
    .isObject().withMessage('Location must be an object'),

  body('location.country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country name too long'),

  body('location.city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City name too long'),

  body('location.address')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Address too long'),

  body('verificationDocuments')
    .optional()
    .isArray().withMessage('Verification documents must be an array'),

  body('verificationDocuments.*')
    .isURL().withMessage('Each document must be a valid URL'),

  body('budgetRange')
    .optional()
    .isObject().withMessage('Budget range must be an object'),

  body('budgetRange.min')
    .optional()
    .isNumeric().withMessage('Minimum budget must be a number'),

  body('budgetRange.max')
    .optional()
    .isNumeric().withMessage('Maximum budget must be a number'),

  body('notificationSettings')
    .optional()
    .isObject().withMessage('Notification settings must be an object'),

  body('notificationSettings.emailNotifications')
    .optional()
    .isBoolean().withMessage('Email notifications must be a boolean'),

  body('notificationSettings.proposalAlerts')
    .optional()
    .isBoolean().withMessage('Proposal alerts must be a boolean'),

  body('notificationSettings.messageAlerts')
    .optional()
    .isBoolean().withMessage('Message alerts must be a boolean'),

  body('recoveryEmail')
    .optional({ values: 'falsy' })
    .isEmail().withMessage('Invalid recovery email format'),

  body('recoveryPhone')
    .optional({ values: 'falsy' })
    .isLength({ max: 20 }).withMessage('Recovery phone too long'),

  body('languages')
    .optional()
    .isArray().withMessage('Languages must be an array')
    .custom((value) => value.length >= 1).withMessage('At least one language is required'),

  body('languages.*.language')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Language name too long'),

  body('languages.*.proficiency')
    .optional()
    .isIn(['basic', 'conversational', 'fluent', 'native'])
    .withMessage('Invalid proficiency level')
];

// Add portfolio item validation
const addPortfolioItemValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 100 }).withMessage('Title must be 2-100 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

  body('url')
    .optional({ values: 'falsy' })
    .isURL().withMessage('Invalid URL format'),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array'),

  body('images.*')
    .isURL().withMessage('Each image must be a valid URL')
];

// Update portfolio item validation
const updatePortfolioItemValidation = [
  param('itemId')
    .notEmpty().withMessage('Portfolio item ID is required')
    .isMongoId().withMessage('Invalid portfolio item ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Title must be 2-100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),

  body('url')
    .optional({ values: 'falsy' })
    .isURL().withMessage('Invalid URL format'),

  body('images')
    .optional()
    .isArray().withMessage('Images must be an array')
];

// Delete portfolio item validation
const deletePortfolioItemValidation = [
  param('itemId')
    .notEmpty().withMessage('Portfolio item ID is required')
    .isMongoId().withMessage('Invalid portfolio item ID')
];

// Upload profile picture validation
const uploadProfilePictureValidation = [
  body('imageUrl')
    .optional()
    .isURL().withMessage('Invalid image URL')
];

// Upload CV validation
const uploadCVValidation = [
  body('cvUrl')
    .notEmpty().withMessage('CV URL is required')
    .isURL().withMessage('Invalid CV URL'),

  body('fileName')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('File name too long')
];

// Add experience validation
const addExperienceValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Job title is required')
    .isLength({ max: 100 }).withMessage('Title too long'),

  body('company')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ max: 100 }).withMessage('Company name too long'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location too long'),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date format'),

  body('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),

  body('current')
    .optional()
    .isBoolean().withMessage('Current must be a boolean'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description too long')
];

// Update experience validation
const updateExperienceValidation = [
  param('experienceId')
    .notEmpty().withMessage('Experience ID is required')
    .isMongoId().withMessage('Invalid experience ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Title too long'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Company name too long'),

  body('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),

  body('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
];

// Delete experience validation
const deleteExperienceValidation = [
  param('experienceId')
    .notEmpty().withMessage('Experience ID is required')
    .isMongoId().withMessage('Invalid experience ID')
];

// Request OTP for profile update validation
const requestProfileUpdateOTPValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
];

// Verify profile update OTP validation
const verifyProfileUpdateOTPValidation = [
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

// Get profile by user ID validation
const getProfileByUserIdValidation = [
  param('userId')
    .notEmpty().withMessage('User ID is required')
    .isMongoId().withMessage('Invalid user ID format')
];

// Search profiles validation
const searchProfilesValidation = [
  query('skills')
    .optional()
    .custom((value) => {
      const skills = value.split(',').map(s => s.trim());
      return skills.every(s => s.length >= 2 && s.length <= 50);
    })
    .withMessage('Invalid skills format'),

  query('availability')
    .optional()
    .isIn(['full-time', 'part-time', 'contract', 'not-available'])
    .withMessage('Invalid availability'),

  query('minRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum rate must be positive'),

  query('maxRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum rate must be positive'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

module.exports = {
  updateFreelancerProfileValidation,
  updateClientProfileValidation,
  addPortfolioItemValidation,
  updatePortfolioItemValidation,
  deletePortfolioItemValidation,
  uploadProfilePictureValidation,
  uploadCVValidation,
  addExperienceValidation,
  updateExperienceValidation,
  deleteExperienceValidation,
  requestProfileUpdateOTPValidation,
  verifyProfileUpdateOTPValidation,
  getProfileByUserIdValidation,
  searchProfilesValidation
};
