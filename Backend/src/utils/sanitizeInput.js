const sanitizeHtml = require('sanitize-html');

/**
 * Strip ALL HTML tags/attributes from a string, keeping plain text only.
 * These fields (job descriptions, cover letters, bios) are never rendered as
 * HTML today, but stripping tags at write-time removes the stored-XSS risk
 * outright rather than relying on every future renderer to escape correctly.
 * @param {*} value
 * @returns {*} the sanitized string, or the original value unchanged if it
 *   isn't a string (so callers can pass through optional/undefined fields).
 */
const stripHtml = (value) => {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
};

module.exports = { stripHtml };
