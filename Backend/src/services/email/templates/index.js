const otp = require('./otp.template');
const welcome = require('./welcome.template');
const passwordReset = require('./passwordReset.template');
const loginAlert = require('./loginAlert.template');
const passwordChangeAlert = require('./passwordChangeAlert.template');

/**
 * Templates are provider-agnostic: they return { subject, html } and know nothing
 * about how the message is transported.
 */
const templates = {
  otp,
  welcome,
  'password-reset': passwordReset,
  'login-alert': loginAlert,
  'password-change-alert': passwordChangeAlert
};

/**
 * @param {string} name - key in `templates`
 * @param {object} data - template variables
 * @returns {{ subject: string, html: string }}
 */
const render = (name, data = {}) => {
  const template = templates[name];
  if (!template) {
    throw new Error(`Unknown email template "${name}". Known: ${Object.keys(templates).join(', ')}`);
  }
  return template.render(data);
};

module.exports = { render, templates };
