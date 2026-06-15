const { body, query, param } = require('express-validator');
const { JOB_STATUS, PROPOSAL_STATUS, JOB_CATEGORIES } = require('../utils/constants');

/**
 * Validation rules for job and proposal endpoints
 */

// Create job validation
const createJobValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Job title is required')
    .isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Job description is required')
    .isLength({ min: 50, max: 5000 }).withMessage('Description must be 50-5000 characters'),

  body('budget')
    .optional()
    .isObject().withMessage('Budget must be an object'),

  body('budget.min')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum budget must be positive'),

  body('budget.max')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum budget must be positive')
    .custom((value, { req }) => {
      if (req.body.budget?.min && value < req.body.budget.min) {
        throw new Error('Maximum budget must be greater than minimum budget');
      }
      return true;
    }),

  body('budget.type')
    .optional()
    .isIn(['fixed', 'hourly']).withMessage('Budget type must be fixed or hourly'),

  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array'),

  body('skills.*')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Each skill must be 2-50 characters'),

  body('category')
    .optional()
    .trim()
    .isIn(JOB_CATEGORIES).withMessage(`Category must be one of: ${JOB_CATEGORIES.join(', ')}`),

  body('status')
    .optional()
    .isIn(['draft', 'open']).withMessage('Status must be draft or open'),

  body('experienceLevel')
    .optional()
    .isIn(['entry', 'intermediate', 'expert']).withMessage('Invalid experience level'),

  body('duration')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Duration too long'),

  body('deadline')
    .optional({ values: 'falsy' })
    .isISO8601().withMessage('Invalid deadline format')
    .custom((value) => {
      if (!value) return true;
      const deadline = new Date(value);
      const now = new Date();
      if (deadline <= now) {
        throw new Error('Deadline must be in the future');
      }
      return true;
    }),

  body('attachments')
    .optional()
    .isArray().withMessage('Attachments must be an array'),

  body('attachments.*')
    .isURL().withMessage('Each attachment must be a valid URL')
];

// Update job validation
const updateJobValidation = [
  param('id')
    .notEmpty().withMessage('Job ID is required')
    .isMongoId().withMessage('Invalid job ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 50, max: 5000 }).withMessage('Description must be 50-5000 characters'),

  body('status')
    .optional()
    .isIn(Object.values(JOB_STATUS))
    .withMessage('Invalid job status'),

  body('deadline')
    .optional()
    .isISO8601().withMessage('Invalid deadline format')
];

// Get job validation
const getJobValidation = [
  param('id')
    .notEmpty().withMessage('Job ID is required')
    .isMongoId().withMessage('Invalid job ID')
];

// Delete job validation
const deleteJobValidation = [
  param('id')
    .notEmpty().withMessage('Job ID is required')
    .isMongoId().withMessage('Invalid job ID')
];

// List jobs validation
const listJobsValidation = [
  query('status')
    .optional()
    .isIn(Object.values(JOB_STATUS))
    .withMessage('Invalid status filter'),

  query('category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Category filter too long'),

  query('skills')
    .optional()
    .custom((value) => {
      const skills = value.split(',').map(s => s.trim());
      return skills.every(s => s.length >= 2 && s.length <= 50);
    })
    .withMessage('Invalid skills format'),

  query('experienceLevel')
    .optional()
    .isIn(['entry', 'intermediate', 'expert'])
    .withMessage('Invalid experience level'),

  query('minBudget')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum budget must be positive'),

  query('maxBudget')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum budget must be positive'),

  query('budgetType')
    .optional()
    .isIn(['fixed', 'hourly']).withMessage('Budget type must be fixed or hourly'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'budget', 'deadline', 'title'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Search jobs validation
const searchJobsValidation = [
  query('q')
    .trim()
    .notEmpty().withMessage('Search query is required')
    .isLength({ min: 2, max: 100 }).withMessage('Search query must be 2-100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

// Create proposal validation
const createProposalValidation = [
  body('jobId')
    .notEmpty().withMessage('Job ID is required')
    .isMongoId().withMessage('Invalid job ID'),

  body('coverLetter')
    .trim()
    .notEmpty().withMessage('Cover letter is required')
    .isLength({ min: 100, max: 2000 }).withMessage('Cover letter must be 100-2000 characters'),

  body('proposedRate')
    .notEmpty().withMessage('Proposed rate is required')
    .isFloat({ min: 0 }).withMessage('Proposed rate must be positive'),

  body('estimatedDuration')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Estimated duration too long'),

  body('attachments')
    .optional()
    .isArray().withMessage('Attachments must be an array'),

  body('attachments.*')
    .isURL().withMessage('Each attachment must be a valid URL')
];

// Update proposal validation
const updateProposalValidation = [
  param('id')
    .notEmpty().withMessage('Proposal ID is required')
    .isMongoId().withMessage('Invalid proposal ID'),

  body('coverLetter')
    .optional()
    .trim()
    .isLength({ min: 100, max: 2000 }).withMessage('Cover letter must be 100-2000 characters'),

  body('proposedRate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Proposed rate must be positive'),

  body('estimatedDuration')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Estimated duration too long')
];

// Get proposal validation
const getProposalValidation = [
  param('id')
    .notEmpty().withMessage('Proposal ID is required')
    .isMongoId().withMessage('Invalid proposal ID')
];

// Delete proposal validation
const deleteProposalValidation = [
  param('id')
    .notEmpty().withMessage('Proposal ID is required')
    .isMongoId().withMessage('Invalid proposal ID')
];

// List proposals validation
const listProposalsValidation = [
  query('jobId')
    .optional()
    .isMongoId().withMessage('Invalid job ID'),

  query('status')
    .optional()
    .isIn(Object.values(PROPOSAL_STATUS))
    .withMessage('Invalid status filter'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'proposedRate'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Accept proposal validation
const acceptProposalValidation = [
  param('id')
    .notEmpty().withMessage('Proposal ID is required')
    .isMongoId().withMessage('Invalid proposal ID'),

  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Message must not exceed 500 characters')
];

// Reject proposal validation
const rejectProposalValidation = [
  param('id')
    .notEmpty().withMessage('Proposal ID is required')
    .isMongoId().withMessage('Invalid proposal ID'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
];

// Withdraw proposal validation
const withdrawProposalValidation = [
  param('id')
    .notEmpty().withMessage('Proposal ID is required')
    .isMongoId().withMessage('Invalid proposal ID'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
];

const recommendCategoryValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Title too long'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description too long'),

  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array')
];

// Close job validation
const closeJobValidation = [
  param('id')
    .notEmpty().withMessage('Job ID is required')
    .isMongoId().withMessage('Invalid job ID'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Reason must not exceed 500 characters')
];

// Hire freelancer validation
const hireFreelancerValidation = [
  param('jobId')
    .notEmpty().withMessage('Job ID is required')
    .isMongoId().withMessage('Invalid job ID'),

  param('proposalId')
    .notEmpty().withMessage('Proposal ID is required')
    .isMongoId().withMessage('Invalid proposal ID')
];

// Rate freelancer validation
const rateFreelancerValidation = [
  param('jobId')
    .notEmpty().withMessage('Job ID is required')
    .isMongoId().withMessage('Invalid job ID'),

  body('freelancerId')
    .notEmpty().withMessage('Freelancer ID is required')
    .isMongoId().withMessage('Invalid freelancer ID'),

  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  body('review')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Review must not exceed 1000 characters')
];

module.exports = {
  createJobValidation,
  updateJobValidation,
  getJobValidation,
  deleteJobValidation,
  listJobsValidation,
  searchJobsValidation,
  createProposalValidation,
  updateProposalValidation,
  getProposalValidation,
  deleteProposalValidation,
  listProposalsValidation,
  acceptProposalValidation,
  rejectProposalValidation,
  withdrawProposalValidation,
  closeJobValidation,
  hireFreelancerValidation,
  rateFreelancerValidation,
  recommendCategoryValidation
};
