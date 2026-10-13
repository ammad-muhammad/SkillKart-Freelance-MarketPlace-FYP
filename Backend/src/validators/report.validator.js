const { body } = require('express-validator');

// What a user can report. 'message' exists in the Report schema but is not
// offered here yet: reporting a chat message needs a participant check on the
// conversation, so it is left for when the chat UI gets a report action.
const REPORTABLE_ITEMS = ['profile', 'job', 'gig', 'review'];
const REPORT_CATEGORIES = ['spam', 'abuse', 'fraud', 'harassment', 'inappropriate', 'other'];

const createReportValidation = [
  body('itemType')
    .isIn(REPORTABLE_ITEMS).withMessage(`You can report a ${REPORTABLE_ITEMS.join(', ')}`),
  body('itemId')
    .isMongoId().withMessage('Invalid item'),
  body('category')
    .isIn(REPORT_CATEGORIES).withMessage('Choose a reason for the report'),
  body('description')
    .isString().withMessage('Please describe the problem')
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
];

module.exports = { createReportValidation, REPORTABLE_ITEMS, REPORT_CATEGORIES };
