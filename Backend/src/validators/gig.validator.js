const { body } = require('express-validator');

/**
 * Validation rules for gig endpoints
 */

const pricingTierValidation = (tier, required) => {
  const priceChain = body(`pricing.${tier}.price`);
  return [
    (required ? priceChain.notEmpty().withMessage(`${tier} price is required`) : priceChain.optional({ values: 'falsy' }))
      .isFloat({ gt: 0 }).withMessage(`${tier} price must be greater than 0`),

    body(`pricing.${tier}.deliveryTime`)
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage(`${tier} delivery time too long`),

    body(`pricing.${tier}.revisions`)
      .optional({ values: 'falsy' })
      .isInt({ min: 0, max: 100 }).withMessage(`${tier} revisions must be a whole number between 0 and 100`),

    body(`pricing.${tier}.features`)
      .optional()
      .isArray().withMessage(`${tier} features must be an array`),

    body(`pricing.${tier}.features.*`)
      .trim()
      .isLength({ min: 1, max: 200 }).withMessage(`Each ${tier} feature must be 1-200 characters`)
  ];
};

const faqValidation = [
  body('faqs')
    .optional()
    .isArray().withMessage('FAQs must be an array'),

  body('faqs.*.question')
    .trim()
    .notEmpty().withMessage('Each FAQ needs a question')
    .isLength({ max: 200 }).withMessage('FAQ question too long'),

  body('faqs.*.answer')
    .trim()
    .notEmpty().withMessage('Each FAQ needs an answer')
    .isLength({ max: 1000 }).withMessage('FAQ answer too long')
];

// Create gig validation
const createGigValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Gig title is required')
    .isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),

  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Short description too long'),

  body('fullDescription')
    .trim()
    .notEmpty().withMessage('Full description is required')
    .isLength({ min: 50, max: 5000 }).withMessage('Full description must be 50-5000 characters'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ max: 50 }).withMessage('Category too long'),

  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Subcategory too long'),

  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array'),

  body('skills.*')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Each skill must be 2-50 characters'),

  ...pricingTierValidation('basic', true),
  ...pricingTierValidation('standard', false),
  ...pricingTierValidation('premium', false),
  ...faqValidation
];

// Update gig validation — same rules, but every field (including the
// required-on-create basic price) is optional since this is a partial update.
const updateGigValidation = [
  body('title')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),

  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Short description too long'),

  body('fullDescription')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 50, max: 5000 }).withMessage('Full description must be 50-5000 characters'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Category too long'),

  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Subcategory too long'),

  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array'),

  body('skills.*')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Each skill must be 2-50 characters'),

  ...pricingTierValidation('basic', false),
  ...pricingTierValidation('standard', false),
  ...pricingTierValidation('premium', false),
  ...faqValidation
];

module.exports = {
  createGigValidation,
  updateGigValidation
};
