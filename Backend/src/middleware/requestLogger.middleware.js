const ApiLog = require('../models/ApiLog');
const ErrorLog = require('../models/ErrorLog');

/**
 * Observability middleware. Persists a lightweight record of every API request
 * to ApiLog, so the admin Monitoring page has real data. Fire-and-forget — never
 * blocks or fails the request.
 *
 * Skips health checks, the swagger UI, and the admin log-reading endpoints
 * themselves (so browsing the logs doesn't spam new logs).
 */
const SKIP = [/^\/health$/, /^\/api\/v1\/docs/, /\/admin-panel\/monitoring/];

const apiLogger = (req, res, next) => {
  // Only record the API surface; ignore static/docs/health noise.
  if (!req.originalUrl.startsWith('/api/') && !req.originalUrl.startsWith('/webhooks/')) return next();
  if (SKIP.some(rx => rx.test(req.originalUrl))) return next();

  const start = Date.now();
  res.on('finish', () => {
    ApiLog.create({
      method: req.method,
      path: (req.originalUrl || req.url).split('?')[0].slice(0, 300),
      statusCode: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip || req.socket?.remoteAddress,
      userId: req.user?._id || undefined,
      userAgent: req.get('User-Agent'),
      requestSize: Number(req.headers['content-length']) || undefined,
      responseSize: Number(res.getHeader('content-length')) || undefined
    }).catch(() => { /* logging must never break requests */ });
  });

  next();
};

/**
 * Writes an ErrorLog entry from the global error handler. Call BEFORE sending the
 * error response. Non-blocking.
 */
const logError = (err, req) => {
  const status = err.statusCode || err.status || 500;
  ErrorLog.create({
    message: (err.message || 'Unknown error').slice(0, 1000),
    stack: err.stack,
    type: err.name === 'ValidationError' ? 'validationError' : 'requestError',
    route: req?.originalUrl?.split('?')[0]?.slice(0, 300),
    method: req?.method,
    statusCode: status,
    userId: req?.user?._id || undefined,
    ip: req?.ip || req?.socket?.remoteAddress,
    userAgent: req?.get?.('User-Agent')
  }).catch(() => {});
};

/**
 * Records a process-level fatal (unhandledRejection / uncaughtException).
 */
const logFatal = (err, type) => {
  ErrorLog.create({
    message: (err?.message || String(err)).slice(0, 1000),
    stack: err?.stack,
    type,
    statusCode: 500
  }).catch(() => {});
};

module.exports = { apiLogger, logError, logFatal };
