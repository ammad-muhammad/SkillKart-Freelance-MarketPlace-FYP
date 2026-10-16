/**
 * Toast Message Formatter
 * Normalizes raw error/success messages, objects, and exceptions into a
 * clean, concise { title, message, fullText, type, dedupeKey } shape.
 *
 * Rules:
 * - Strip stack traces, HTML tags, "undefined", "[object Object]"
 * - Map raw verbose strings to short, elegant titles
 * - Collapse repeated save messages into a single "Changes saved" key
 * - Handle auth, validation, network, and system error wording
 */

export function cleanRawMessage(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') {
    let s = raw.trim();
    // Remove stack traces
    s = s.split(/\n\s*at\s+/)[0];
    // Remove HTML tags
    s = s.replace(/<[^>]*>?/gm, '');
    // Replace ugly JSON/object indicators
    if (s === '[object Object]' || s === 'undefined' || s === 'null') {
      return '';
    }
    return s.trim();
  }
  if (raw instanceof Error) {
    return cleanRawMessage(raw.message);
  }
  if (typeof raw === 'object') {
    if (raw.message && typeof raw.message === 'string') {
      return cleanRawMessage(raw.message);
    }
    if (raw.error && typeof raw.error === 'string') {
      return cleanRawMessage(raw.error);
    }
    // express-validator array
    if (Array.isArray(raw.errors) && raw.errors.length > 0) {
      const first = raw.errors[0];
      return cleanRawMessage(first?.message || first?.msg || first);
    }
    try {
      const str = JSON.stringify(raw);
      if (str !== '{}') return str;
    } catch {
      // ignore serialization errors
    }
  }
  return String(raw).trim();
}

/**
 * Format any raw message and options into a structured toast payload.
 *
 * @param {any} raw
 * @param {'success'|'error'|'warning'|'info'|'loading'} [defaultType='info']
 * @param {object} [options={}]
 * @returns {{ title: string, message: string, fullText: string, type: string, dedupeKey: string }}
 */
export function formatToastPayload(raw, defaultType = 'info', options = {}) {
  let cleaned = cleanRawMessage(raw);
  const type = options.type || defaultType || 'info';
  let title = options.title || '';
  let message = options.message || '';
  let isSaveToast = false;

  if (!cleaned && !title) {
    switch (type) {
      case 'success': cleaned = 'Action completed successfully.'; break;
      case 'error':   cleaned = 'An unexpected error occurred.'; break;
      case 'warning': cleaned = 'Please check your information.'; break;
      case 'loading': cleaned = 'Please wait...'; break;
      default:        cleaned = 'Notification'; break;
    }
  }

  const lower = cleaned.toLowerCase();

  // 1) SAVE / UPDATE PATTERNS
  if (
    lower.includes('all changes saved') ||
    lower.includes('saved to database') ||
    lower.includes('saved successfully') ||
    lower.includes('changes saved') ||
    lower === 'saved' ||
    lower === 'saved.'
  ) {
    title = 'Changes saved';
    message = '';
    isSaveToast = true;
  } else if (lower.includes('security settings updated')) {
    title = 'Security settings updated';
    message = '';
    isSaveToast = true;
  } else if (lower.includes('password updated') || lower.includes('password has been updated')) {
    title = 'Password updated';
    message = '';
    isSaveToast = true;
  } else if (lower.includes('email address updated') || lower.includes('recovery email updated')) {
    title = 'Email updated';
    message = '';
    isSaveToast = true;
  } else if (lower.includes('profile updated') || lower.includes('profile saved')) {
    title = 'Profile updated';
    message = '';
    isSaveToast = true;
  } else if (lower.includes('work delivered successfully')) {
    title = 'Work delivered';
    message = 'The client has been notified to review.';
  } else if (lower.includes('verification code sent') || lower.includes('confirmation code sent')) {
    title = 'Verification code sent';
    message = 'Please check your email for the code.';
  } else if (lower.includes('proposal withdrawn')) {
    title = 'Proposal withdrawn';
    message = '';
  } else if (lower.includes('proposal revised') || lower.includes('proposal updated')) {
    title = 'Proposal updated';
    message = '';
  } else if (lower.includes('account deactivated')) {
    title = 'Account deactivated';
    message = 'Your account has been deactivated.';
  } else if (lower.includes('stripe account successfully connected')) {
    title = 'Stripe connected';
    message = 'Your Stripe payout account is now active.';

  // 2) AUTH & CREDENTIAL PATTERNS
  } else if (
    lower.includes('invalid credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('wrong password') ||
    lower.includes('user not found') ||
    lower.includes('incorrect password')
  ) {
    title = 'Login failed';
    message = cleaned;
  } else if (lower.includes('session expired') || lower.includes('logged out from another tab')) {
    title = 'Session expired';
    message = 'Please log in again to continue.';
  } else if (lower.includes('email not verified') || lower.includes('please verify your email')) {
    title = 'Email unverified';
    message = cleaned;
  } else if (lower.includes('account locked') || lower.includes('account suspended') || lower.includes('blocked')) {
    title = 'Account notice';
    message = cleaned;

  // 3) VALIDATION PATTERNS
  } else if (
    lower.includes('must be at least') ||
    lower.includes('is required') ||
    lower.includes('please enter') ||
    lower.includes('enter a valid') ||
    lower.includes('invalid or expired otp') ||
    lower.includes('passwords do not match')
  ) {
    title = options.title || 'Check your input';
    message = cleaned;

  // 4) NETWORK & SERVICE OUTAGE PATTERNS
  } else if (
    lower.includes('network error') ||
    lower.includes('failed to fetch') ||
    lower.includes('econnaborted') ||
    lower.includes('timeout') ||
    lower.includes('offline')
  ) {
    title = 'Connection issue';
    message = 'Please check your connection and try again.';
  } else if (lower.includes('out of service') || lower.includes('currently unavailable')) {
    title = 'Service unavailable';
    message = cleaned;

  // 5) GENERIC FALLBACK TITLES
  } else if (!title) {
    if (type === 'success') {
      title = 'Success';
      message = cleaned;
    } else if (type === 'error') {
      title = 'Something went wrong';
      message = cleaned !== 'Action failed' && cleaned !== 'Failed' ? cleaned : 'Please try again later.';
    } else if (type === 'warning') {
      title = 'Notice';
      message = cleaned;
    } else if (type === 'info') {
      title = 'Information';
      message = cleaned;
    } else if (type === 'loading') {
      title = 'Please wait...';
      message = cleaned !== 'Please wait...' ? cleaned : '';
    }
  } else {
    // Custom title was provided
    message = message || (cleaned !== title ? cleaned : '');
  }

  // Deduplication key
  const dedupeKey = options.id || options.dedupeKey || (
    isSaveToast
      ? 'save-toast'
      : `${type}:${title.toLowerCase()}:${(message || cleaned).toLowerCase()}`
  );

  const fullText = message ? `${title}: ${message}` : title;

  return {
    title,
    message,
    fullText,
    type,
    dedupeKey,
  };
}
