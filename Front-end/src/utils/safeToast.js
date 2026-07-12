/**
 * safeToast — a tiny, dependency-free toast.
 *
 * Why this exists: react-toastify@9 renders an undefined internal component
 * under React 19 ("Element type is invalid"), which crashes the tree whenever a
 * toast fires. Rather than gamble the whole app on that library for critical
 * notices (like "AI is out of service"), we render a plain DOM node ourselves.
 * It cannot throw during React render, so it can never crash the app.
 */

const CONTAINER_ID = 'safe-toast-container';
const seen = new Map(); // message -> last shown timestamp (de-dup)

const ensureContainer = () => {
  let el = document.getElementById(CONTAINER_ID);
  if (el) return el;
  el = document.createElement('div');
  el.id = CONTAINER_ID;
  Object.assign(el.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: '99999',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: 'min(92vw, 380px)',
    pointerEvents: 'none',
  });
  document.body.appendChild(el);
  return el;
};

const COLORS = {
  error:   { bg: '#dc2626', bar: '#991b1b' },
  success: { bg: '#059669', bar: '#047857' },
  info:    { bg: '#2563eb', bar: '#1d4ed8' },
  warning: { bg: '#d97706', bar: '#b45309' },
};

/**
 * Show a toast.
 * @param {string} message
 * @param {'error'|'success'|'info'|'warning'} type
 * @param {number} duration ms before auto-dismiss
 */
export const showSafeToast = (message, type = 'error', duration = 5000) => {
  try {
    if (!message || typeof document === 'undefined') return;

    // De-dup identical messages within 3s.
    const now = Date.now();
    if (seen.get(message) && now - seen.get(message) < 3000) return;
    seen.set(message, now);

    const container = ensureContainer();
    const color = COLORS[type] || COLORS.error;

    const toast = document.createElement('div');
    Object.assign(toast.style, {
      pointerEvents: 'auto',
      background: color.bg,
      color: '#fff',
      padding: '12px 16px',
      borderLeft: `4px solid ${color.bar}`,
      borderRadius: '10px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
      font: '600 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      opacity: '0',
      transform: 'translateX(20px)',
      transition: 'opacity .25s ease, transform .25s ease',
      cursor: 'pointer',
      wordBreak: 'break-word',
    });
    toast.textContent = message;
    toast.setAttribute('role', 'alert');

    const remove = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    };
    toast.addEventListener('click', remove);

    container.appendChild(toast);
    // enter animation
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });

    if (duration > 0) setTimeout(remove, duration);
  } catch {
    // A toast must never break the caller. Swallow anything unexpected.
  }
};

// Drop-in shim mirroring react-toastify's `toast.error/success/info/warning`
// API, so components can switch to a crash-proof toast with a one-line change.
export const safeToast = {
  error:   (msg, opts) => showSafeToast(msg, 'error', opts?.autoClose ?? 5000),
  success: (msg, opts) => showSafeToast(msg, 'success', opts?.autoClose ?? 4000),
  info:    (msg, opts) => showSafeToast(msg, 'info', opts?.autoClose ?? 4000),
  warning: (msg, opts) => showSafeToast(msg, 'warning', opts?.autoClose ?? 4500),
};

export default showSafeToast;
