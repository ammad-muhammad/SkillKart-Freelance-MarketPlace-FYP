const { sleep } = require('../../utils/helpers');
const metrics = require('./email.metrics');

const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];
const RETRYABLE_CODES = [
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET', 'ECONNECTION',
  'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN', 'EPIPE', 'ETIMEOUT'
];
// Nodemailer surfaces these for auth/recipient rejection — retrying just repeats them.
const FATAL_SMTP_CODES = ['EAUTH', 'EENVELOPE'];

const statusOf = (error) =>
  error.status || error.statusCode || error.code || error.response?.status;

// Nodemailer puts the SMTP reply code on `responseCode`. Kept separate from HTTP
// status because the ranges mean opposite things: SMTP 4yz is "try again later",
// HTTP 4xx is "your request is wrong, retrying won't help".
const smtpReplyOf = (error) => error.responseCode;

/**
 * Decides whether a failed send is worth another attempt.
 *
 * Retry: transient network/timeout, 429, and 5xx.
 * Never retry: bad credentials (invalid_grant), auth failures, invalid recipients,
 * malformed requests — these fail identically every time, and hammering an OAuth
 * endpoint with a dead refresh token can get the account rate-limited.
 */
const isRetryable = (error) => {
  if (!error) return false;

  const message = String(error.message || '').toLowerCase();
  const oauthError = String(error.response?.data?.error || '').toLowerCase();
  if (
    oauthError === 'invalid_grant' ||
    oauthError === 'invalid_client' ||
    message.includes('invalid_grant') ||
    message.includes('invalid_client') ||
    message.includes('missing required config')
  ) {
    return false;
  }

  if (FATAL_SMTP_CODES.includes(error.code)) return false;

  // SMTP reply codes, checked first: 4yz transient (retry), 5yz permanent (don't).
  const smtpReply = parseInt(smtpReplyOf(error), 10);
  if (!Number.isNaN(smtpReply)) {
    return smtpReply >= 400 && smtpReply < 500;
  }

  const status = statusOf(error);

  if (typeof status === 'string' && RETRYABLE_CODES.includes(status)) return true;

  const numeric = typeof status === 'number' ? status : parseInt(status, 10);
  if (!Number.isNaN(numeric)) {
    if (RETRYABLE_STATUS.includes(numeric)) return true;
    // HTTP 4xx (malformed request, bad auth, invalid recipient) fails identically
    // on every retry — only the explicit codes above (408/429) are worth repeating.
    if (numeric >= 400 && numeric < 500) return false;
    if (numeric >= 500 && numeric < 600) return true;
    return false;
  }

  // Unrecognized shape: assume transport-level noise only if it smells like one.
  return message.includes('timeout') || message.includes('socket') || message.includes('network');
};

/**
 * Runs fn with exponential backoff + jitter, but only for retryable failures.
 * Wraps the shared sleep() from utils/helpers; the fixed-delay retry() there has no
 * error classification, which matters here (see isRetryable).
 */
const sendWithRetry = async (fn, { retries = 3, baseDelay = 500, provider = 'unknown' } = {}) => {
  let attempt = 0;

   
  while (true) {
    try {
      const result = await fn();
      return { result, attempts: attempt + 1 };
    } catch (error) {
      attempt += 1;
      const exhausted = attempt > retries;
      if (exhausted || !isRetryable(error)) {
        error.attempts = attempt;
        throw error;
      }
      metrics.recordRetry(provider);
      const backoff = baseDelay * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * baseDelay);
      await sleep(backoff + jitter);
    }
  }
};

module.exports = { sendWithRetry, isRetryable };
