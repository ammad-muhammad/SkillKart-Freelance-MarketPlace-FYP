const { body } = require('express-validator');

// `attachments` normally only ever contains what /messages/upload just
// returned (a Cloudinary https URL + name + mimeType), but sendMessage never
// enforced that shape — a client could call /messages/send directly with an
// arbitrary attachments array. Without a scheme check, a `javascript:`/`data:`
// URL stored here is a live XSS vector the moment any frontend chat bubble
// renders an attachment as a link/image without re-validating the scheme
// itself.
const sendMessageValidation = [
  body('recipientId')
    .isMongoId().withMessage('Invalid recipient ID'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('Message must be under 5000 characters'),
  body('attachments')
    .optional()
    .isArray({ max: 10 }).withMessage('Attachments must be an array of at most 10 items'),
  body('attachments.*.url')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Attachment URL must be a valid http(s) URL'),
  body('attachments.*.name')
    .optional()
    .isString()
    .isLength({ max: 255 }).withMessage('Attachment name must be under 255 characters'),
  body('attachments.*.mimeType')
    .optional()
    .isString()
    .isLength({ max: 100 })
];

module.exports = {
  sendMessageValidation
};
