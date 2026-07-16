/**
 * Provider-agnostic retry-with-exponential-backoff.
 *
 * Retries transient failures (network errors, timeouts, HTTP 429/5xx) and
 * bails immediately on permanent client errors (auth, invalid recipient,
 * malformed request). Honours a `Retry-After` header when present.
 */
const {
  RETRY_DEFAULTS,
  RETRYABLE_STATUS_CODES,
  NON_RETRYABLE_STATUS_CODES,
  RETRYABLE_ERROR_CODES,
} = require('./email.constants');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract an HTTP-ish status code from a variety of error shapes.
 */
function extractStatusCode(error) {
  return (
    error?.statusCode ||
    error?.status ||
    error?.response?.status ||
    error?.responseCode || // nodemailer SMTP reply code
    null
  );
}

/**
 * Extract a Retry-After delay (ms) from an error's headers, if any.
 */
function extractRetryAfterMs(error) {
  const headers = error?.response?.headers || error?.headers;
  if (!headers) return null;
  const raw =
    (typeof headers.get === 'function' && headers.get('retry-after')) ||
    headers['retry-after'] ||
    headers['Retry-After'];
  if (!raw) return null;
  const seconds = Number(raw);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const dateMs = Date.parse(raw);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

/**
 * Decide whether an error is worth retrying.
 */
function isRetryable(error) {
  const code = extractStatusCode(error);

  if (code) {
    const numeric = Number(code);
    if (RETRYABLE_STATUS_CODES.includes(numeric)) return true;
    if (NON_RETRYABLE_STATUS_CODES.includes(numeric)) return false;
    // SMTP: 4xx = transient, 5xx = permanent. HTTP: other codes -> not retryable.
    if (numeric >= 400 && numeric < 500) {
      // nodemailer transient reply codes are 4xx.
      return error?.responseCode ? true : false;
    }
    if (numeric >= 500 && numeric < 600) return true;
  }

  // Network-level errors carry a `code` string.
  if (error?.code && RETRYABLE_ERROR_CODES.includes(error.code)) return true;

  return false;
}

/**
 * Run `fn` with retries.
 * @param {Function} fn  async function to execute
 * @param {object} [options] { maxRetries, baseDelay, maxDelay, onRetry }
 * @returns {Promise<{ result: any, retryCount: number }>}
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = RETRY_DEFAULTS.maxRetries,
    baseDelay = RETRY_DEFAULTS.baseDelay,
    maxDelay = RETRY_DEFAULTS.maxDelay,
    onRetry,
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { result, retryCount: attempt };
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === maxRetries) throw error;

      const retryAfter = extractRetryAfterMs(error);
      const backoff = Math.min(baseDelay * 2 ** attempt, maxDelay);
      const delay = retryAfter != null ? Math.min(retryAfter, maxDelay) : backoff;

      if (typeof onRetry === 'function') {
        onRetry({ attempt: attempt + 1, delay, error });
      }
      await sleep(delay);
    }
  }
  throw lastError;
}

module.exports = { withRetry, isRetryable, extractStatusCode, extractRetryAfterMs };
