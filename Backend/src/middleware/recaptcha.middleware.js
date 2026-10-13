const rateLimit = require('express-rate-limit');
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
// The Capacitor mobile app's WebView always presents this fixed origin
// (androidScheme/iosScheme: "https" in capacitor.config.json — nothing real
// is ever hosted at "localhost"). Google reCAPTCHA v3 is a browser-page
// product: its script/iframe is unreliable inside an embedded WebView and
// frequently fails to mint a token there, which would otherwise hard-lock
// every mobile app user out of login/register. authLimiter + account
// lockout remain as the real anti-abuse gate for this origin.
const MOBILE_APP_ORIGIN = 'https://localhost';

// The Origin header is set by the client, so a script (not a browser) can claim
// to be the mobile app and skip reCAPTCHA. That cannot be closed — the real
// app has no secret that a script could not copy — so the exemption is made
// expensive instead: every request that uses it counts against this much
// tighter per-IP budget, shared by all four reCAPTCHA-protected endpoints
// (register, login, contact, newsletter). A real user of the app needs a handful
// of these per quarter-hour; a bot needs thousands.
const exemptedOriginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this app. Please try again later.' },
});

const verifyRecaptcha = (action) => async (req, res, next) => {
  if (!isConfigured()) return next();
  if (req.headers.origin === MOBILE_APP_ORIGIN) return exemptedOriginLimiter(req, res, next);

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
