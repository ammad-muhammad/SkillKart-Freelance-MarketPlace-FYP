const { body, param } = require('express-validator');

/**
 * Validation rules for contract endpoints. Both of these freeze escrow
 * (a pending cancellation/dispute blocks next-milestone funding and
 * auto-release) — a bare non-empty check let a single space through with no
 * real explanation for the other party or the admin queue.
 */

const requestCancellationValidation = [
  param('id')
    .isMongoId().withMessage('Invalid contract ID'),
  body('reason')
    .trim()
    .notEmpty().withMessage('Cancellation reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5-500 characters')
];

const raiseDisputeValidation = [
  param('id')
    .isMongoId().withMessage('Invalid contract ID'),
  body('reason')
    .trim()
    .notEmpty().withMessage('Dispute reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5-500 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must be under 2000 characters')
];

module.exports = {
  requestCancellationValidation,
  raiseDisputeValidation
};
