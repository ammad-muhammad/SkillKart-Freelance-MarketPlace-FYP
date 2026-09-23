const { body, param } = require('express-validator');
const { requirementsRules } = require('./gigOrder.validator');

const createOfferValidation = [
  body('conversationId')
    .isMongoId().withMessage('Invalid conversation'),
  body('gigId')
    .optional({ values: 'falsy' })
    .isMongoId().withMessage('Invalid gig'),
  body('title')
    .isString().withMessage('Offer title is required')
    .trim()
    .isLength({ min: 5, max: 100 }).withMessage('Offer title must be 5-100 characters'),
  body('description')
    .isString().withMessage('Describe what the offer includes')
    .trim()
    .isLength({ min: 30, max: 3000 }).withMessage('Offer description must be 30-3000 characters'),
  body('price')
    .isFloat({ min: 5, max: 10000000 }).withMessage('Price must be between Rs. 5 and Rs. 10,000,000')
    .toFloat(),
  body('deliveryDays')
    .isInt({ min: 1, max: 365 }).withMessage('Delivery time must be 1-365 days')
    .toInt(),
  body('revisions')
    .optional({ values: 'null' })
    .isInt({ min: 0, max: 20 }).withMessage('Revisions must be a whole number between 0 and 20')
    .toInt(),
];

const offerIdValidation = [
  param('id').isMongoId().withMessage('Invalid offer ID'),
];

const acceptOfferValidation = [
  ...offerIdValidation,
  ...requirementsRules(false),
];

module.exports = {
  createOfferValidation,
  offerIdValidation,
  acceptOfferValidation,
};
