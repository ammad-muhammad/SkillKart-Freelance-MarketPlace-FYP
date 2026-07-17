const axios = require('axios');
const config = require('../config');

/**
 * Google reCAPTCHA v3 verification.
 *
 * v3 is score-based (0.0 = almost certainly a bot, 1.0 = almost certainly human)
 * and never shows a challenge. There is no "pass/fail" from Google — only a score
 * we choose a threshold for, so a low score means "suspicious", not "proven bot".
 *
 * Fails OPEN when unconfigured: if RECAPTCHA_SECRET_KEY is unset, verification is
 * skipped. That keeps local dev and any deploy without keys working rather than
 * locking every user out of login. Where it matters, check `configured`.
 */

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/** Google's own error codes, mapped to something a human can act on. */
const ERROR_HINTS = {
  'missing-input-secret': 'RECAPTCHA_SECRET_KEY is not set',
  'invalid-input-secret': 'RECAPTCHA_SECRET_KEY is invalid or is a site key',
  'missing-input-response': 'No captcha token sent by the client',
  'invalid-input-response': 'Captcha token is malformed or already used',
  'bad-request': 'Malformed verification request',
  'timeout-or-duplicate': 'Captcha token expired or was already redeemed'
};

const isConfigured = () => Boolean(config.recaptcha.secretKey);

/**
 * Verifies a v3 token with Google.
 *
 * @param {string} token   - the g-recaptcha-response token from the client
 * @param {object} [opts]
 * @param {string} [opts.action] - expected action name; mismatch = replayed token
 * @param {string} [opts.ip]     - end-user IP, improves Google's scoring
 * @returns {Promise<{ success: boolean, skipped?: boolean, score?: number, action?: string, reason?: string }>}
 */
const verifyToken = async (token, { action, ip } = {}) => {
  if (!isConfigured()) {
    return { success: true, skipped: true, reason: 'recaptcha_not_configured' };
  }

  if (!token) {
    return { success: false, reason: 'missing_token' };
  }

  try {
    const params = new URLSearchParams({ secret: config.recaptcha.secretKey, response: token });
    if (ip) params.append('remoteip', ip);

    const { data } = await axios.post(VERIFY_URL, params, {
      timeout: config.recaptcha.timeoutMs,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!data.success) {
      const codes = data['error-codes'] || [];
      const hint = codes.map((c) => ERROR_HINTS[c] || c).join('; ');
      return { success: false, reason: hint || 'verification_failed', codes };
    }

    // A token minted for a different action is a replay — Google still returns
    // success:true for it, so this must be checked explicitly.
    if (action && data.action !== action) {
      return {
        success: false,
        score: data.score,
        action: data.action,
        reason: `action_mismatch (expected "${action}", got "${data.action}")`
      };
    }

    if (typeof data.score === 'number' && data.score < config.recaptcha.minScore) {
      return {
        success: false,
        score: data.score,
        action: data.action,
        reason: `low_score (${data.score} < ${config.recaptcha.minScore})`
      };
    }

    return { success: true, score: data.score, action: data.action };
  } catch (error) {
    // Google unreachable. Fail open: a captcha outage must not take down login.
    console.error('[reCAPTCHA] verification request failed:', error.message);
    return { success: true, skipped: true, reason: 'verify_unreachable' };
  }
};

module.exports = { verifyToken, isConfigured };
