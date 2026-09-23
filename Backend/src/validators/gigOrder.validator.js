const { body, param } = require('express-validator');

const REQUIREMENTS_MIN = 30;
const REQUIREMENTS_MAX = 5000;
const MAX_REFERENCE_LINKS = 5;

/**
 * Rules for a `requirements: { description, referenceLinks }` body field.
 * `required` — package orders must say what they need (min 30 chars); a
 * custom offer's own description is already the agreed scope, so the notes
 * a client adds when accepting one are optional (but still length-checked
 * if given).
 */
const requirementsRules = (required) => [
  required
    ? body('requirements.description')
      .isString().withMessage('Tell the freelancer what you need')
      .trim()
      .isLength({ min: REQUIREMENTS_MIN, max: REQUIREMENTS_MAX })
      .withMessage(`Requirements must be ${REQUIREMENTS_MIN}-${REQUIREMENTS_MAX} characters`)
    : body('requirements.description')
      .optional({ values: 'falsy' })
      .isString()
      .trim()
      .isLength({ max: REQUIREMENTS_MAX })
      .withMessage(`Notes must be under ${REQUIREMENTS_MAX} characters`),

  body('requirements.referenceLinks')
    .optional()
    .isArray({ max: MAX_REFERENCE_LINKS })
    .withMessage(`Add at most ${MAX_REFERENCE_LINKS} reference links`),

  // Only http(s) — these are rendered as clickable links on both sides.
  body('requirements.referenceLinks.*')
    .isString()
    .trim()
    .isLength({ max: 500 }).withMessage('Reference link is too long')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Each reference link must be a full http(s) URL, e.g. https://example.com'),
];

const orderGigValidation = [
  param('id').isMongoId().withMessage('Invalid gig ID'),
  body('tier')
    .optional()
    .isIn(['basic', 'standard', 'premium']).withMessage('Invalid pricing tier'),
  ...requirementsRules(true),
];

const cancelGigOrderValidation = [
  param('jobId').isMongoId().withMessage('Invalid order ID'),
];

module.exports = {
  REQUIREMENTS_MIN,
  requirementsRules,
  orderGigValidation,
  cancelGigOrderValidation,
};
