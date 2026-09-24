import { paymentsAPI } from '../api/payments';

// Must match Backend/src/validators/gigOrder.validator.js.
export const REQUIREMENTS_MIN = 30;
export const REQUIREMENTS_MAX = 5000;
export const MAX_REFERENCE_LINKS = 5;

/**
 * A gig tier's delivery time is free text ("3", "2 days", "1 week"), so only
 * a bare number gets "day(s)" appended — otherwise "2 days" became "2 days days".
 */
export const formatDeliveryTime = (value) => {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if (/^\d+(\.\d+)?$/.test(v)) return `${v} day${Number(v) === 1 ? '' : 's'}`;
  return v;
};

/** The backend's message for a failed call — the first field error for a validation failure. */
export const apiErrorMessage = (err, fallback) =>
  err?.response?.data?.errors?.[0]?.message || err?.response?.data?.message || fallback;

/**
 * Split the "one link per line" textarea into a clean list and report the
 * first problem, so the modal can block submit with the same rules the
 * backend enforces.
 * @returns {{ links: string[], error: string | null }}
 */
export function parseReferenceLinks(text) {
  const links = [...new Set(String(text || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];
  if (links.length > MAX_REFERENCE_LINKS) {
    return { links, error: `Add at most ${MAX_REFERENCE_LINKS} reference links.` };
  }
  const bad = links.find((l) => {
    try {
      const u = new URL(l);
      return !['http:', 'https:'].includes(u.protocol);
    } catch {
      return true;
    }
  });
  if (bad) return { links, error: `"${bad}" isn't a full link — it should start with https://` };
  return { links, error: null };
}

/**
 * Pay the 50% deposit for a gig order (package order or accepted custom
 * offer). Pays straight from the wallet when the balance covers it;
 * otherwise redirects to Stripe Checkout (or the simulated checkout in dummy
 * mode). `paymentsAPI.startDeposit` suppresses the global error toast, so
 * callers get the backend's message back to show themselves.
 *
 * @returns {Promise<{ outcome: 'wallet' | 'redirect' | 'failed', message?: string }>}
 */
export async function payGigOrderDeposit(jobId) {
  const fallback = 'Could not start the payment. You can pay from My Projects.';
  try {
    const { data } = await paymentsAPI.startDeposit(jobId);
    if (data?.data?.walletPaid) return { outcome: 'wallet' };
    const url = data?.data?.checkoutUrl;
    if (url) {
      window.location.assign(url);
      return { outcome: 'redirect' };
    }
    return { outcome: 'failed', message: fallback };
  } catch (err) {
    return { outcome: 'failed', message: apiErrorMessage(err, fallback) };
  }
}
