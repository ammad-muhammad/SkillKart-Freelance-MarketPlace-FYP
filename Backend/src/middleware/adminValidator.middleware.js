const { body, param, query, validationResult } = require('express-validator');

/**
 * Central validation schemas for all admin endpoints.
 * Uses express-validator — already a backend dependency.
 */

// Return first validation error as 400 response
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// ─── Auth Schemas ──────────────────────────────────────────────────────────────

const loginSchema = [
  body('email')
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidation
];

const verifyOtpSchema = [
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
    .isNumeric().withMessage('OTP must contain only digits'),
  handleValidation
];

// ─── User Schemas ──────────────────────────────────────────────────────────────

const suspendSchema = [
  body('reason')
    .notEmpty().withMessage('Suspension reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5–500 characters'),
  handleValidation
];

const resetPasswordSchema = [
  body('newPassword')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidation
];

// ─── Wallet Schemas ────────────────────────────────────────────────────────────

const adjustWalletSchema = [
  body('amount')
    .isFloat({ min: -1000000, max: 1000000 }).withMessage('Amount must be between -1,000,000 and 1,000,000')
    .custom(v => Number(v) !== 0).withMessage('Amount cannot be zero'),
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5–500 characters'),
  body('notes')
    .optional()
    .isLength({ max: 1000 }).withMessage('Notes too long'),
  handleValidation
];

const freezeWalletSchema = [
  body('reason')
    .notEmpty().withMessage('Freeze reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5–500 characters'),
  handleValidation
];

// ─── Dispute Schemas ───────────────────────────────────────────────────────────

const resolveDisputeSchema = [
  body('action')
    .notEmpty().withMessage('Action is required')
    .isIn(['release_freelancer', 'refund_client', 'split', 'resume', 'reject'])
    .withMessage('Invalid resolve action'),
  body('notes')
    .notEmpty().withMessage('Resolution notes are required')
    .isLength({ min: 10, max: 2000 }).withMessage('Notes must be 10–2000 characters'),
  // Required (not optional) when action is 'split' — a split resolution with
  // no percentage previously fell through to marking the dispute resolved
  // with zero money moved, leaving real escrow funds stuck.
  body('splitPercentage')
    .if(body('action').equals('split'))
    .notEmpty().withMessage('splitPercentage is required when action is "split"')
    .isFloat({ min: 1, max: 99 }).withMessage('Split percentage must be between 1 and 99'),
  handleValidation
];

// ─── Job/Contract/Profile Edit Schemas ─────────────────────────────────────────
// These sibling admin-panel edit endpoints had no numeric validation at all,
// unlike every other financial admin action in this file (adjustWalletSchema,
// resolveDisputeSchema) — an admin could save a job with a negative/inverted
// budget or a contract with a zero/negative rate, desyncing the numbers shown
// here from the real Milestone/hourlyEscrow amounts those records back.

const editJobSchema = [
  body('budget.min')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Budget min must be a non-negative number'),
  body('budget.max')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Budget max must be a non-negative number'),
  body('deadline')
    .optional({ nullable: true })
    .isISO8601().withMessage('Deadline must be a valid date'),
  body().custom((value) => {
    const min = value?.budget?.min;
    const max = value?.budget?.max;
    if (min != null && max != null && Number(max) < Number(min)) {
      throw new Error('Budget max must be greater than or equal to budget min');
    }
    return true;
  }),
  handleValidation
];

const editContractSchema = [
  body('fixedPrice')
    .optional({ nullable: true })
    .isFloat({ gt: 0 }).withMessage('Fixed price must be greater than 0'),
  body('hourlyRate')
    .optional({ nullable: true })
    .isFloat({ gt: 0 }).withMessage('Hourly rate must be greater than 0'),
  body('weeklyLimit')
    .optional({ nullable: true })
    .isFloat({ gt: 0 }).withMessage('Weekly hour limit must be greater than 0'),
  handleValidation
];

const editProfileSchema = [
  body('hourlyRate')
    .optional({ nullable: true })
    .isFloat({ gt: 0, max: 100000 }).withMessage('Hourly rate must be between 0 and 100,000'),
  body('budgetRange.min')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Budget range min must be non-negative'),
  body('budgetRange.max')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('Budget range max must be non-negative'),
  handleValidation
];

// ─── Payment Schemas ───────────────────────────────────────────────────────────

// refundPayment/releaseEscrow are critical-severity financial actions (per
// their own audit log entries) but, unlike every sibling admin action here,
// had no schema at all — an empty/missing reason silently went through.
const financialActionReasonSchema = [
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5–500 characters'),
  handleValidation
];

// ─── Notification Schemas ──────────────────────────────────────────────────────

const broadcastSchema = [
  body('target')
    .notEmpty().withMessage('Target is required')
    .isIn(['all', 'freelancer', 'client', 'user']).withMessage('Invalid target'),
  body('userId')
    .if(body('target').equals('user'))
    .notEmpty().withMessage('userId is required when target is "user"')
    .isMongoId().withMessage('Invalid userId'),
  body('title')
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
  body('message')
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 2000 }).withMessage('Message must be 10–2000 characters'),
  handleValidation
];

// ─── Settings Schemas ──────────────────────────────────────────────────────────

const updateSettingSchema = [
  param('key')
    .notEmpty().withMessage('Setting key is required'),
  body('value')
    .notEmpty().withMessage('Value is required'),
  handleValidation
];

// ─── Report Schemas ────────────────────────────────────────────────────────────

const resolveReportSchema = [
  body('resolution')
    .notEmpty().withMessage('Resolution notes are required')
    .isLength({ min: 10, max: 2000 }).withMessage('Resolution must be 10–2000 characters'),
  handleValidation
];

const dismissReportSchema = [
  body('reason')
    .notEmpty().withMessage('Dismiss reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5–500 characters'),
  handleValidation
];

// ─── Review Schemas ────────────────────────────────────────────────────────────

const hideReviewSchema = [
  body('reason')
    .notEmpty().withMessage('Hide reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5–500 characters'),
  handleValidation
];

// ─── Withdrawal Schemas ────────────────────────────────────────────────────────

const rejectWithdrawalSchema = [
  body('reason')
    .notEmpty().withMessage('Rejection reason is required')
    .isLength({ min: 5, max: 500 }).withMessage('Reason must be 5–500 characters'),
  handleValidation
];

// ─── Pagination / Query ────────────────────────────────────────────────────────

const paginationSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),
  handleValidation
];

module.exports = {
  loginSchema,
  verifyOtpSchema,
  suspendSchema,
  resetPasswordSchema,
  adjustWalletSchema,
  freezeWalletSchema,
  resolveDisputeSchema,
  financialActionReasonSchema,
  editJobSchema,
  editContractSchema,
  editProfileSchema,
  broadcastSchema,
  updateSettingSchema,
  resolveReportSchema,
  dismissReportSchema,
  hideReviewSchema,
  rejectWithdrawalSchema,
  paginationSchema,
  handleValidation
};
