const { verifyToken, isConfigured } = require('../services/recaptcha.service');

/**
 * Google reCAPTCHA v3 gate for abuse-prone endpoints.
 *
 * The client sends a token (header `x-recaptcha-token`, or `recaptchaToken` in
 * the body). Tokens are single-use and expire after ~2 minutes.
 *
 * No-ops when RECAPTCHA_SECRET_KEY is unset, so adding this to a route is safe
 * before keys exist — see recaptcha.service.js for the fail-open rationale.
 *
 * @param {string} action - expected v3 action, must match the client's
 *                          executeRecaptcha(action) call or the token is rejected
 *                          as a replay.
 */
const verifyRecaptcha = (action) => async (req, res, next) => {
  if (!isConfigured()) return next();

  const token =
    req.headers['x-recaptcha-token'] ||
    req.body?.recaptchaToken ||
    req.body?.['g-recaptcha-response'];

  const result = await verifyToken(token, { action, ip: req.ip });

  if (!result.success) {
    console.warn(`[reCAPTCHA] blocked ${req.method} ${req.originalUrl}: ${result.reason}`);
    return res.status(403).json({
      success: false,
      code: 'RECAPTCHA_FAILED',
      // Deliberately vague: telling a bot its score or the threshold helps it tune.
      message: 'Security verification failed. Please refresh the page and try again.'
    });
  }

  // Expose the score so handlers can add friction (e.g. force OTP) without blocking.
  req.recaptcha = { score: result.score, action: result.action, skipped: result.skipped };
  return next();
};

module.exports = { verifyRecaptcha };
