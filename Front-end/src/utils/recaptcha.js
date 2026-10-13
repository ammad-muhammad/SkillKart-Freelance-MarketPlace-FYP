import { log, warn } from './logger';

/**
 * Google reCAPTCHA v3 client.
 *
 * v3 is invisible — no checkbox, no challenge. It scores the session in the
 * background and we mint a short-lived token per protected action.
 *
 * The script is loaded lazily on first use rather than in index.html: it's ~300KB
 * of third-party JS plus a persistent badge, and most visitors never submit a
 * protected form. No key configured = no script, no badge, no token.
 *
 * Tokens are single-use and expire in ~2 minutes, so one must be minted per
 * submit — never cached and reused.
 */

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const SCRIPT_ID = 'recaptcha-v3';

let loaderPromise = null;

export const isRecaptchaEnabled = () => Boolean(SITE_KEY);

/** Injects the reCAPTCHA script once; subsequent calls await the same promise. */
const loadScript = () => {
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    if (document.getElementById(SCRIPT_ID)) return resolve();

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loaderPromise = null; // allow a retry on the next attempt
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
};

/**
 * Mints a token for one action.
 *
 * Resolves to null — never throws — when reCAPTCHA is unconfigured or the script
 * is blocked (ad blockers, offline, network policies). The backend fails open in
 * the same way, so a captcha problem can't lock users out of the app.
 *
 * @param {string} action - must match the backend's verifyRecaptcha(action)
 * @returns {Promise<string|null>}
 */
export const getRecaptchaToken = async (action) => {
  if (!SITE_KEY) return null;

  try {
    await loadScript();
    await new Promise((resolve) => window.grecaptcha.ready(resolve));
    const token = await window.grecaptcha.execute(SITE_KEY, { action });
    log(`[reCAPTCHA] token minted for "${action}"`);
    return token;
  } catch (err) {
    warn('[reCAPTCHA] token unavailable, submitting without it:', err.message);
    return null;
  }
};

/**
 * The v3 badge is required by Google's terms unless you disclose reCAPTCHA in
 * your UI text. Call this to hide it only if such a disclosure exists.
 */
export const hideRecaptchaBadge = () => {
  const style = document.createElement('style');
  style.textContent = '.grecaptcha-badge { visibility: hidden; }';
  document.head.appendChild(style);
};
