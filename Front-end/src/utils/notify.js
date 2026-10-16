import { formatToastPayload } from './toastMessageFormatter';

/**
 * Global Toast Notification System
 * - Max 3 visible toasts.
 * - Deduplication with repeat count badge within 3 seconds.
 * - Hover & focus pause.
 * - Escape key dismissal of latest toast.
 * - Promise toast helper.
 * - Single source of truth.
 */

const MAX_VISIBLE_TOASTS = 3;
const DEDUPE_WINDOW_MS = 3000;

const DEFAULT_DURATIONS = {
  success: 3000,
  info:    4000,
  warning: 5000,
  error:   6000,
  loading: 0,
};

let toastCounter = 0;
let subscribers = new Set();
let activeToasts = [];
let toastQueue = [];

// Track recent toasts for deduplication: dedupeKey -> { id, timestamp }
const recentToasts = new Map();

function emit() {
  const snapshot = [...activeToasts];
  subscribers.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (err) {
      console.error('Toast subscriber error:', err);
    }
  });
}

function processQueue() {
  while (activeToasts.length < MAX_VISIBLE_TOASTS && toastQueue.length > 0) {
    const next = toastQueue.shift();
    activeToasts.push(next);
    startToastTimer(next);
  }
  emit();
}

function startToastTimer(toast) {
  if (toast.duration <= 0) return; // Indefinite (loading)

  clearToastTimer(toast);
  toast.startTime = Date.now();
  toast.remaining = toast.duration;

  toast.timerId = setTimeout(() => {
    dismissToast(toast.id);
  }, toast.remaining);
}

function clearToastTimer(toast) {
  if (toast.timerId) {
    clearTimeout(toast.timerId);
    toast.timerId = null;
  }
}

export function pauseToast(id) {
  const toast = activeToasts.find((t) => t.id === id);
  if (!toast || toast.duration <= 0 || toast.isPaused) return;

  clearToastTimer(toast);
  const elapsed = Date.now() - (toast.startTime || Date.now());
  toast.remaining = Math.max(500, (toast.remaining || toast.duration) - elapsed);
  toast.isPaused = true;
  emit();
}

export function resumeToast(id) {
  const toast = activeToasts.find((t) => t.id === id);
  if (!toast || toast.duration <= 0 || !toast.isPaused) return;

  toast.isPaused = false;
  toast.startTime = Date.now();
  toast.timerId = setTimeout(() => {
    dismissToast(toast.id);
  }, toast.remaining);
  emit();
}

export function dismissToast(id) {
  const idx = activeToasts.findIndex((t) => t.id === id);
  if (idx !== -1) {
    const toast = activeToasts[idx];
    clearToastTimer(toast);
    toast.isExiting = true;
    emit();

    setTimeout(() => {
      activeToasts = activeToasts.filter((t) => t.id !== id);
      processQueue();
    }, 180);
    return;
  }

  // Also remove from queue if present
  toastQueue = toastQueue.filter((t) => t.id !== id);
  emit();
}

export function clearAllToasts() {
  activeToasts.forEach(clearToastTimer);
  activeToasts = [];
  toastQueue = [];
  recentToasts.clear();
  emit();
}

/**
 * Main dispatch function
 */
export function notify(rawMessage, options = {}) {
  const type = options.type || 'info';
  const { title, message, fullText, dedupeKey } = formatToastPayload(rawMessage, type, options);

  const duration = typeof options.duration === 'number'
    ? options.duration
    : (DEFAULT_DURATIONS[type] ?? 4000);

  const now = Date.now();

  // Deduplication check: if identical within 3s, increment count & refresh timer
  const recent = recentToasts.get(dedupeKey);
  if (recent && now - recent.timestamp < DEDUPE_WINDOW_MS) {
    const existing = activeToasts.find((t) => t.id === recent.id);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.duration = duration;
      existing.remaining = duration;
      existing.startTime = now;
      startToastTimer(existing);
      recentToasts.set(dedupeKey, { id: existing.id, timestamp: now });
      emit();
      return existing.id;
    }
  }

  toastCounter += 1;
  const id = options.id || `toast-${Date.now()}-${toastCounter}`;

  const toastItem = {
    id,
    dedupeKey,
    type,
    title,
    message,
    fullText,
    action: options.action || null, // { label: string, onClick: () => void }
    duration,
    remaining: duration,
    count: 1,
    isPaused: false,
    isExiting: false,
    createdAt: now,
  };

  recentToasts.set(dedupeKey, { id, timestamp: now });

  if (activeToasts.length >= MAX_VISIBLE_TOASTS) {
    // Dismiss oldest active toast to make room, or queue
    const oldest = activeToasts[0];
    dismissToast(oldest.id);
  }

  activeToasts.push(toastItem);
  startToastTimer(toastItem);
  emit();

  return id;
}

notify.success = (msg, opts) => notify(msg, { ...opts, type: 'success' });
notify.error = (msg, opts) => notify(msg, { ...opts, type: 'error' });
notify.warning = (msg, opts) => notify(msg, { ...opts, type: 'warning' });
notify.info = (msg, opts) => notify(msg, { ...opts, type: 'info' });
notify.loading = (msg, opts) => notify(msg, { ...opts, type: 'loading', duration: 0 });

notify.promise = function (promise, messages = {}, opts = {}) {
  const id = notify.loading(messages.loading || 'Loading...', opts);

  return promise
    .then((result) => {
      const successMsg = typeof messages.success === 'function'
        ? messages.success(result)
        : (messages.success || 'Completed successfully');

      dismissToast(id);
      notify.success(successMsg, { ...opts, id });
      return result;
    })
    .catch((err) => {
      const errorMsg = typeof messages.error === 'function'
        ? messages.error(err)
        : (messages.error || err?.message || 'Operation failed');

      dismissToast(id);
      notify.error(errorMsg, { ...opts, id });
      throw err;
    });
};

notify.dismiss = (id) => dismissToast(id);
notify.clear = () => clearAllToasts();

export function subscribeToasts(callback) {
  subscribers.add(callback);
  callback([...activeToasts]);
  return () => subscribers.delete(callback);
}

// Global Escape listener to dismiss latest active toast
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeToasts.length > 0) {
      const latest = activeToasts[activeToasts.length - 1];
      if (latest) dismissToast(latest.id);
    }
  });
}

export default notify;
