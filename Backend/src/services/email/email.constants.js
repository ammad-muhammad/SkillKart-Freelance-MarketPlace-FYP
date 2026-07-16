/**
 * Email subsystem constants.
 * Central home for provider names, statuses, template names and retry defaults
 * so no magic strings are scattered across the codebase.
 */

// Registered provider identifiers (must match keys used in email.registry.js)
const PROVIDERS = Object.freeze({
  SMTP: 'smtp',
  RESEND: 'resend',
});

// EmailLog.status enum values
const EMAIL_STATUS = Object.freeze({
  SENT: 'sent',
  FAILED: 'failed',
  QUEUED: 'queued',
  SKIPPED: 'skipped',
});

// Template identifiers used by the renderer
const TEMPLATES = Object.freeze({
  OTP: 'otp',
  WELCOME: 'welcome',
  PASSWORD_RESET: 'passwordReset',
  LOGIN_ALERT: 'loginAlert',
  PASSWORD_CHANGE_ALERT: 'passwordChangeAlert',
});

// Retry-with-backoff defaults (see retry.util.js)
const RETRY_DEFAULTS = Object.freeze({
  maxRetries: 3,
  baseDelay: 1000, // ms
  maxDelay: 10000, // ms
});

// HTTP status codes that are safe to retry (transient / server-side)
const RETRYABLE_STATUS_CODES = Object.freeze([408, 429, 500, 502, 503, 504]);

// HTTP status codes that must NOT be retried (permanent client errors)
const NON_RETRYABLE_STATUS_CODES = Object.freeze([400, 401, 403, 404, 422]);

// Node network error codes worth retrying
const RETRYABLE_ERROR_CODES = Object.freeze([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'ESOCKET',
  'ECONNECTION',
  'ETIMEOUT',
]);

module.exports = {
  PROVIDERS,
  EMAIL_STATUS,
  TEMPLATES,
  RETRY_DEFAULTS,
  RETRYABLE_STATUS_CODES,
  NON_RETRYABLE_STATUS_CODES,
  RETRYABLE_ERROR_CODES,
};
