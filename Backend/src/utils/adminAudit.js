const AdminAuditLog = require('../models/AdminAuditLog');

/**
 * Non-blocking audit log writer.
 * Called at the end of every admin controller action.
 *
 * @param {object} req - Express request (must have req.admin populated by authenticateAdmin)
 * @param {object} opts
 * @param {string} opts.action        - e.g. 'user.suspend', 'otp.failed', 'export.csv'
 * @param {string} opts.category      - enum: auth|user|job|contract|dispute|payment|wallet|withdrawal|review|report|notification|settings|chat|analytics|monitoring|export
 * @param {string} opts.resource      - e.g. 'User', 'Contract', 'Payment'
 * @param {*}      [opts.resourceId]  - MongoDB ObjectId
 * @param {*}      [opts.previousValue]
 * @param {*}      [opts.newValue]
 * @param {string} [opts.notes]
 * @param {string} [opts.severity]    - 'info' | 'warning' | 'critical'  (default: 'info')
 */
const auditLog = (req, {
  action,
  category,
  resource,
  resourceId,
  previousValue,
  newValue,
  notes,
  severity = 'info'
}) => {
  // Fire-and-forget — never await this, never block the response
  AdminAuditLog.create({
    adminEmail:    req.admin?.email    || 'system',
    adminRole:     req.admin?.role     || 'super_admin',
    action,
    category,
    resource,
    resourceId,
    previousValue,
    newValue,
    ipAddress:     req.ip || req.socket?.remoteAddress,
    userAgent:     req.get('User-Agent'),
    notes,
    severity
  }).catch(err => {
    // Log but never crash the main request
    console.error('[AuditLog] Failed to write audit log:', err.message);
  });
};

/**
 * Special variant for auth actions (before req.admin is populated)
 * Used in auth controller before session is created.
 */
const auditLogAuth = (email, ipAddress, userAgent, {
  action,
  category = 'auth',
  resource,
  resourceId,
  previousValue,
  newValue,
  notes,
  severity = 'info'
}) => {
  AdminAuditLog.create({
    adminEmail:  email || 'unknown',
    adminRole:   'super_admin',
    action,
    category,
    resource,
    resourceId,
    previousValue,
    newValue,
    ipAddress,
    userAgent,
    notes,
    severity
  }).catch(err => {
    console.error('[AuditLog] Failed to write auth audit log:', err.message);
  });
};

module.exports = { auditLog, auditLogAuth };
