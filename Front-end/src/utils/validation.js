/**
 * Shared client-side validation helpers that MIRROR the backend
 * express-validator rules, so the user gets immediate, matching feedback
 * instead of a round-trip rejection.
 */

// Password: min 8 + at least one lowercase, uppercase, and digit (matches
// Backend/src/validators/auth.validator.js).
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/** @returns {string|null} an error message, or null when valid. */
export function validatePassword(pw) {
  if (!pw) return 'Password is required';
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!PASSWORD_RE.test(pw)) return 'Password must include an uppercase letter, a lowercase letter, and a number';
  return null;
}

/** Name fields: 2–50 characters. @returns {string|null} */
export function validateName(value, label = 'This field') {
  const v = (value || '').trim();
  if (v && (v.length < 2 || v.length > 50)) return `${label} must be 2–50 characters`;
  return null;
}

export function validateEmail(email) {
  const v = (email || '').trim();
  if (!v) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
  return null;
}

/**
 * Length range check. @returns {string|null}
 */
export function validateLength(value, { min = 0, max = Infinity, label = 'This field', required = true } = {}) {
  const v = (value || '').trim();
  if (!v) return required ? `${label} is required` : null;
  if (v.length < min) return `${label} must be at least ${min} characters`;
  if (v.length > max) return `${label} must be at most ${max} characters`;
  return null;
}
