/**
 * Lightweight in-memory email metrics tracker (no external deps).
 * Powers a potential admin dashboard endpoint (GET /admin/email/metrics).
 * Resets on process restart — this is observability, not persistence.
 */
const state = {
  totalSent: 0,
  totalFailed: 0,
  totalSkipped: 0,
  totalDuration: 0,
  totalRetries: 0,
  lastSuccess: null, // { to, subject, template, provider, timestamp }
  lastFailure: null, // { to, subject, template, provider, error, timestamp }
  provider: null,
  startedAt: new Date().toISOString(),
};

/** Mask a recipient for safe logging/metrics: user@example.com -> u***@example.com */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const head = local.slice(0, 1);
  return `${head}***@${domain}`;
}

function setProvider(name) {
  state.provider = name;
}

function recordSuccess({ to, subject, template, provider, duration = 0, retryCount = 0 }) {
  state.totalSent += 1;
  state.totalDuration += duration;
  state.totalRetries += retryCount;
  state.lastSuccess = {
    to: maskEmail(to),
    subject,
    template,
    provider,
    duration,
    timestamp: new Date().toISOString(),
  };
}

function recordFailure({ to, subject, template, provider, error, retryCount = 0 }) {
  state.totalFailed += 1;
  state.totalRetries += retryCount;
  state.lastFailure = {
    to: maskEmail(to),
    subject,
    template,
    provider,
    error: typeof error === 'string' ? error : error?.message,
    timestamp: new Date().toISOString(),
  };
}

function recordSkipped({ to, subject, template }) {
  state.totalSkipped += 1;
}

/** @returns {object} a frozen snapshot (safe to serialise for an endpoint) */
function getSnapshot() {
  const averageDuration = state.totalSent
    ? Math.round(state.totalDuration / state.totalSent)
    : 0;
  return Object.freeze({
    provider: state.provider,
    totalSent: state.totalSent,
    totalFailed: state.totalFailed,
    totalSkipped: state.totalSkipped,
    totalRetries: state.totalRetries,
    averageDuration,
    lastSuccess: state.lastSuccess,
    lastFailure: state.lastFailure,
    startedAt: state.startedAt,
  });
}

function reset() {
  state.totalSent = 0;
  state.totalFailed = 0;
  state.totalSkipped = 0;
  state.totalDuration = 0;
  state.totalRetries = 0;
  state.lastSuccess = null;
  state.lastFailure = null;
}

module.exports = {
  setProvider,
  recordSuccess,
  recordFailure,
  recordSkipped,
  getSnapshot,
  reset,
  maskEmail,
};
