/**
 * Template dispatcher. Maps template names to pure template modules.
 * Each template is `(variables) => { subject, html, text }`.
 */
const { TEMPLATES } = require('../email.constants');

const templates = {
  [TEMPLATES.OTP]: require('./otp.template'),
  [TEMPLATES.WELCOME]: require('./welcome.template'),
  [TEMPLATES.PASSWORD_RESET]: require('./passwordReset.template'),
  [TEMPLATES.LOGIN_ALERT]: require('./loginAlert.template'),
  [TEMPLATES.PASSWORD_CHANGE_ALERT]: require('./passwordChangeAlert.template'),
};

/**
 * Render a named template.
 * @param {string} templateName  one of TEMPLATES.*
 * @param {object} variables
 * @returns {{ subject: string, html: string, text: string }}
 */
function render(templateName, variables = {}) {
  const template = templates[templateName];
  if (!template) {
    const available = Object.keys(templates).join(', ');
    throw new Error(`Unknown template: "${templateName}". Available: ${available}`);
  }
  return template(variables);
}

module.exports = { render };
