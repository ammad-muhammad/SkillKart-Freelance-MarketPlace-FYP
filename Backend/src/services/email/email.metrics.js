/**
 * In-process email counters for the admin Monitoring page.
 *
 * Deliberately in-memory and cheap: EmailLog (Mongo) remains the durable record.
 * These reset on restart and are per-instance.
 */
const metrics = {
  sent: 0,
  failed: 0,
  retries: 0,
  skipped: 0,
  totalDurationMs: 0,
  byProvider: {},
  lastError: null,
  lastSentAt: null
};

const providerBucket = (provider) => {
  if (!metrics.byProvider[provider]) {
    metrics.byProvider[provider] = { sent: 0, failed: 0, retries: 0, totalDurationMs: 0 };
  }
  return metrics.byProvider[provider];
};

const recordSent = (provider, durationMs) => {
  metrics.sent += 1;
  metrics.totalDurationMs += durationMs;
  metrics.lastSentAt = new Date();
  const bucket = providerBucket(provider);
  bucket.sent += 1;
  bucket.totalDurationMs += durationMs;
};

const recordFailed = (provider, durationMs, error) => {
  metrics.failed += 1;
  metrics.totalDurationMs += durationMs;
  metrics.lastError = { message: error, provider, at: new Date() };
  const bucket = providerBucket(provider);
  bucket.failed += 1;
  bucket.totalDurationMs += durationMs;
};

const recordRetry = (provider) => {
  metrics.retries += 1;
  providerBucket(provider).retries += 1;
};

const recordSkipped = () => {
  metrics.skipped += 1;
};

const getMetrics = () => {
  const attempts = metrics.sent + metrics.failed;
  return {
    ...metrics,
    avgDurationMs: attempts ? Math.round(metrics.totalDurationMs / attempts) : 0,
    successRate: attempts ? Number(((metrics.sent / attempts) * 100).toFixed(2)) : null
  };
};

const resetMetrics = () => {
  metrics.sent = 0;
  metrics.failed = 0;
  metrics.retries = 0;
  metrics.skipped = 0;
  metrics.totalDurationMs = 0;
  metrics.byProvider = {};
  metrics.lastError = null;
  metrics.lastSentAt = null;
};

module.exports = {
  recordSent,
  recordFailed,
  recordRetry,
  recordSkipped,
  getMetrics,
  resetMetrics
};
