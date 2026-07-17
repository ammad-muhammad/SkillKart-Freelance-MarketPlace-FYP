const config = require('../config');
const { getProvider } = require('../config/email');
const templates = require('./email/templates');
const { sendWithRetry } = require('./email/email.retry');
const metrics = require('./email/email.metrics');
const EmailLog = require('../models/EmailLog');

/**
 * Public email API.
 *
 * Callers stay provider-agnostic: which transport is active (SMTP / Gmail API) is
 * decided by EMAIL_PROVIDER and resolved in config/email.js. Nothing below knows
 * or cares. The exported signatures are a stable contract — do not change them.
 */

// Record every send attempt so the admin Monitoring → Email tab has real data.
// Fire-and-forget; logging must never affect the send outcome.
const logEmail = (entry) => {
  EmailLog.create({ ...entry, sentAt: new Date() }).catch(() => {});
};

/**
 * Send email
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 * @param {string} [text]
 * @param {object} [options] - { template, triggeredBy, attachments, from }
 */
const sendEmail = async (to, subject, html, text = '', options = {}) => {
  const { template, triggeredBy, attachments, from } = options;

  if (!config.email.enabled) {
    metrics.recordSkipped();
    logEmail({ to, subject, template, triggeredBy, status: 'queued', errorMessage: 'EMAIL_ENABLED=false' });
    return { skipped: true, reason: 'email_disabled' };
  }

  // Sandbox redirects everything to one inbox so staging can't mail real users.
  const recipient = config.email.sandbox ? config.email.sandboxRecipient : to;
  const finalSubject = config.email.sandbox ? `[SANDBOX → ${to}] ${subject}` : subject;

  const provider = getProvider();
  const startedAt = Date.now();

  try {
    const { result, attempts } = await sendWithRetry(
      () => provider.send({ to: recipient, subject: finalSubject, html, text, attachments, from }),
      { provider: provider.name }
    );

    const durationMs = Date.now() - startedAt;
    metrics.recordSent(provider.name, durationMs);
    logEmail({
      to, subject, template, triggeredBy,
      status: 'sent', provider: provider.name, durationMs, attempts
    });
    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    metrics.recordFailed(provider.name, durationMs, error.message);
    console.error(`Email send error [${provider.name}]:`, error.message);
    logEmail({
      to, subject, template, triggeredBy,
      status: 'failed', provider: provider.name, durationMs,
      attempts: error.attempts || 1, errorMessage: error.message
    });

    // Preserve the original error. Retry classification and callers need the
    // status/code; the old code replaced it with a bare string and lost both.
    const wrapped = new Error(`Failed to send email: ${error.message}`);
    wrapped.cause = error;
    wrapped.code = error.code;
    wrapped.statusCode = error.statusCode || error.status;
    wrapped.provider = provider.name;
    throw wrapped;
  }
};

/** Renders a template and sends it. */
const sendTemplate = (to, name, data, options = {}) => {
  const { subject, html, text } = templates.render(name, data);
  return sendEmail(to, subject, html, text || '', { ...options, template: name });
};

/**
 * Send OTP email
 */
const sendOTPEmail = async (to, otp, purpose) => sendTemplate(to, 'otp', { otp, purpose });

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (to, name) => sendTemplate(to, 'welcome', { name });

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (to, otp) => sendTemplate(to, 'password-reset', { otp });

/**
 * Send login alert email
 */
const sendLoginAlertEmail = async (to, details) => sendTemplate(to, 'login-alert', details);

/**
 * Send password change alert email
 */
const sendPasswordChangeAlertEmail = async (to, details) =>
  sendTemplate(to, 'password-change-alert', details);

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendLoginAlertEmail,
  sendPasswordChangeAlertEmail,
  getEmailMetrics: metrics.getMetrics
};
