/**
 * Normalises an axios error into a single human-readable message + the raw
 * field errors. Understands the SkillKart backend response shapes:
 *
 *   { success:false, message:"...", errors:[ { field, message, value } ] }   (express-validator)
 *   { success:false, message:"...", errors:{ skillTestRequired:true, ... } }  (custom gates)
 *   { success:false, message:"..." }                                          (plain)
 *
 * For validation responses it prefers the FIRST field message (most specific),
 * falling back to the top-level message.
 *
 * @param {object} error  an axios error (or anything with .response)
 * @returns {{ message: string, fieldErrors: object|null, status: number|null }}
 */
export function extractApiError(error) {
  // No response → network/timeout.
  if (!error?.response) {
    const isTimeout = error?.code === 'ECONNABORTED';
    return {
      message: isTimeout
        ? 'The request timed out. Please try again.'
        : 'Network error — please check your connection and try again.',
      fieldErrors: null,
      status: null,
    };
  }

  const { status, data } = error.response;
  const topMessage = data?.message;
  const errs = data?.errors;

  // express-validator array → use the first field message, and build a map.
  if (Array.isArray(errs) && errs.length > 0) {
    const fieldErrors = {};
    for (const e of errs) {
      if (e?.field && e?.message && !fieldErrors[e.field]) fieldErrors[e.field] = e.message;
    }
    return {
      message: errs[0]?.message || topMessage || 'Please check your input and try again.',
      fieldErrors,
      status,
    };
  }

  // Custom object errors (e.g. skill-gating) — keep the top message.
  return {
    message: topMessage || defaultForStatus(status),
    fieldErrors: errs && typeof errs === 'object' ? errs : null,
    status,
  };
}

function defaultForStatus(status) {
  switch (status) {
    case 400: return 'Bad request — please check your input.';
    case 401: return 'Your session has expired. Please log in again.';
    case 403: return 'You don’t have permission to do that.';
    case 404: return 'The requested resource was not found.';
    case 422: return 'Please check your input and try again.';
    case 429: return 'Too many requests — please slow down and try again.';
    case 500: return 'Something went wrong on our end. Please try again later.';
    default: return 'An unexpected error occurred. Please try again.';
  }
}
