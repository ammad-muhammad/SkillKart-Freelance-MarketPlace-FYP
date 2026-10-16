/**
 * safeToast — Unified drop-in shim bridging all existing calls across
 * the app into the single global SkillKart Toast notification system.
 */

import { notify } from './notify';

/**
 * Clean up legacy raw container if it existed in DOM
 */
if (typeof document !== 'undefined') {
  try {
    const legacy = document.getElementById('safe-toast-container');
    if (legacy) legacy.remove();
  } catch {
    // ignore
  }
}

/**
 * Show a toast via the unified system.
 * @param {string|Error|object} message
 * @param {'error'|'success'|'info'|'warning'|'loading'} [type='error']
 * @param {number} [duration]
 */
export const showSafeToast = (message, type = 'error', duration) => {
  return notify(message, {
    type,
    ...(typeof duration === 'number' ? { duration } : {}),
  });
};

/**
 * Drop-in shim mirroring react-toastify's `toast.error/success/info/warning`
 * API so all 30+ components and contexts switch with zero breaking changes.
 */
export const safeToast = {
  error: (msg, opts) =>
    notify.error(msg, typeof opts === 'number' ? { duration: opts } : opts),

  success: (msg, opts) =>
    notify.success(msg, typeof opts === 'number' ? { duration: opts } : opts),

  info: (msg, opts) =>
    notify.info(msg, typeof opts === 'number' ? { duration: opts } : opts),

  warning: (msg, opts) =>
    notify.warning(msg, typeof opts === 'number' ? { duration: opts } : opts),

  loading: (msg, opts) =>
    notify.loading(msg, opts),

  promise: (promise, messages, opts) =>
    notify.promise(promise, messages, opts),

  dismiss: (id) =>
    notify.dismiss(id),

  clear: () =>
    notify.clear(),
};

export { notify };
export default showSafeToast;
