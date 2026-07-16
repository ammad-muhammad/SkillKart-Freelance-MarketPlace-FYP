/**
 * Email Service — public API façade over the multi-provider email system.
 *
 * PUBLIC API IS FROZEN. The 6 exported functions keep identical names and
 * signatures so the 5 consumer files never change:
 *   sendEmail(to, subject, html, text)
 *   sendOTPEmail(to, otp, purpose)
 *   sendWelcomeEmail(to, name)
 *   sendPasswordResetEmail(to, otp)
 *   sendLoginAlertEmail(to, details)
 *   sendPasswordChangeAlertEmail(to, details)
 *
 * Internally, sending now flows through: template renderer → feature-flag /
 * sandbox checks → provider (from factory) wrapped in retry → metrics →
 * EmailLog audit trail.
 */
const config = require('../config');
const EmailLog = require('../models/EmailLog');
const { ensureProvider, getEmailConfig } = require('./email/email.factory');
const { render } = require('./email/templates/renderer');
const { withRetry, extractStatusCode } = require('./email/retry.util');
const metrics = require('./email/email.metrics');
const { EMAIL_STATUS, TEMPLATES } = require('./email/email.constants');

const { maskEmail } = metrics;

/**
 * Persist a send attempt. Fire-and-forget: logging must never affect the send
 * outcome (nor throw into the caller).
 */
function logEmail(fields) {
  EmailLog.create({ sentAt: new Date(), ...fields }).catch(() => {});
}

/**
 * Structured console line for a send attempt.
 */
function logLine({ provider, template, to, status, duration, error, retryable, retryCount }) {
  const icon = status === EMAIL_STATUS.SENT ? '✅ Sent' : status === EMAIL_STATUS.SKIPPED ? '⏭️  Skipped' : '❌ Failed';
  const parts = [
    `Provider: ${provider || 'n/a'}`,
    `Template: ${template || 'generic'}`,
    `To: ${maskEmail(to)}`,
    `Status: ${icon}`,
  ];
  if (typeof duration === 'number') parts.push(`Duration: ${duration}ms`);
  if (retryCount) parts.push(`Retries: ${retryCount}`);
  if (error) parts.push(`Error: ${error}`);
  if (retryable !== undefined) parts.push(`Retryable: ${retryable}`);
  console.log(`📧 [Email] ${parts.join(' | ')}`);
}

/**
 * Core send routine used by every public helper.
 *
 * @param {object} params
 * @param {string} params.to        recipient
 * @param {string} params.subject
 * @param {string} params.html
 * @param {string} [params.text]
 * @param {string} [params.template] template name (for logs/metrics only)
 * @param {object} [params.metadata]
 * @param {string} [params.triggeredBy]
 * @returns {Promise<object>} provider send result (or a skip descriptor)
 */
async function deliver({ to, subject, html, text = '', template = null, metadata = null, triggeredBy = 'system' }) {
  const emailConfig = getEmailConfig() || {};

  // ── EMAIL_ENABLED: log + skip delivery, never touch the provider ──
  if (emailConfig.enabled === false) {
    logLine({ template, to, status: EMAIL_STATUS.SKIPPED, provider: emailConfig.provider });
    metrics.recordSkipped({ to, subject, template });
    logEmail({
      to,
      subject,
      template,
      status: EMAIL_STATUS.SKIPPED,
      provider: emailConfig.provider,
      metadata,
      triggeredBy,
      errorMessage: 'EMAIL_ENABLED=false',
    });
    return { skipped: true, reason: 'EMAIL_ENABLED=false' };
  }

  // ── EMAIL_SANDBOX: redirect recipient, preserve original ──
  const originalRecipient = to;
  const sandboxActive = emailConfig.sandbox === true && emailConfig.sandboxRecipient;
  const effectiveTo = sandboxActive ? emailConfig.sandboxRecipient : to;

  const provider = await ensureProvider();
  const started = Date.now();

  try {
    const { result, retryCount } = await withRetry(
      () => provider.send({ to: effectiveTo, subject, html, text }),
      {
        onRetry: ({ attempt, delay, error }) =>
          console.warn(
            `📧 [Email] Retry ${attempt} for ${maskEmail(effectiveTo)} in ${delay}ms (${error.message})`
          ),
      }
    );

    const duration = Date.now() - started;

    metrics.recordSuccess({
      to: effectiveTo,
      subject,
      template,
      provider: provider.name,
      duration,
      retryCount,
    });

    logLine({
      provider: provider.name,
      template,
      to: effectiveTo,
      status: EMAIL_STATUS.SENT,
      duration,
      retryCount,
    });

    logEmail({
      to: effectiveTo,
      subject,
      template,
      status: EMAIL_STATUS.SENT,
      provider: provider.name,
      duration,
      retryCount,
      messageId: result?.messageId || null,
      requestId: result?.requestId || null,
      metadata,
      triggeredBy,
      sandbox: !!sandboxActive,
      originalRecipient: sandboxActive ? originalRecipient : undefined,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - started;
    const statusCode = extractStatusCode(error);

    metrics.recordFailure({
      to: effectiveTo,
      subject,
      template,
      provider: provider.name,
      error,
    });

    logLine({
      provider: provider.name,
      template,
      to: effectiveTo,
      status: EMAIL_STATUS.FAILED,
      duration,
      error: error.message,
    });

    logEmail({
      to: effectiveTo,
      subject,
      template,
      status: EMAIL_STATUS.FAILED,
      provider: provider.name,
      duration,
      errorMessage: error.message,
      errorCode: statusCode ? String(statusCode) : (error.code || undefined),
      metadata,
      triggeredBy,
      sandbox: !!sandboxActive,
      originalRecipient: sandboxActive ? originalRecipient : undefined,
    });

    // Preserve the original public contract: a generic error, no secrets.
    throw new Error('Failed to send email');
  }
}

/**
 * Generic send. Public signature unchanged: (to, subject, html, text).
 */
const sendEmail = async (to, subject, html, text = '') => {
  return deliver({ to, subject, html, text });
};

/**
 * Send OTP email. (to, otp, purpose)
 */
const sendOTPEmail = async (to, otp, purpose) => {
  const { subject, html, text } = render(TEMPLATES.OTP, { otp, purpose });
  return deliver({ to, subject, html, text, template: TEMPLATES.OTP });
};

/**
 * Send welcome email. (to, name)
 */
const sendWelcomeEmail = async (to, name) => {
  const { subject, html, text } = render(TEMPLATES.WELCOME, {
    name,
    frontendUrl: config.frontend.url,
  });
  return deliver({ to, subject, html, text, template: TEMPLATES.WELCOME });
};

/**
 * Send password reset email. (to, otp)
 */
const sendPasswordResetEmail = async (to, otp) => {
  const { subject, html, text } = render(TEMPLATES.PASSWORD_RESET, { otp });
  return deliver({ to, subject, html, text, template: TEMPLATES.PASSWORD_RESET });
};

/**
 * Send login alert email. (to, details)
 */
const sendLoginAlertEmail = async (to, details) => {
  const { subject, html, text } = render(TEMPLATES.LOGIN_ALERT, {
    ...details,
    frontendUrl: config.frontend.url,
  });
  return deliver({ to, subject, html, text, template: TEMPLATES.LOGIN_ALERT });
};

/**
 * Send password change alert email. (to, details)
 */
const sendPasswordChangeAlertEmail = async (to, details) => {
  const { subject, html, text } = render(TEMPLATES.PASSWORD_CHANGE_ALERT, { ...details });
  return deliver({ to, subject, html, text, template: TEMPLATES.PASSWORD_CHANGE_ALERT });
};

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendLoginAlertEmail,
  sendPasswordChangeAlertEmail,
};
