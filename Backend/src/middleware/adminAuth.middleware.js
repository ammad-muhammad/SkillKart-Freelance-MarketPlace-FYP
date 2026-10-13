const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const AdminSession = require('../models/AdminSession');
const AdminAuditLog = require('../models/AdminAuditLog');
const { getAllowedOrigins } = require('../utils/allowedOrigins');

/**
 * CSRF guard for the admin cookie.
 *
 * Because the frontend and the API are on different domains, the admin cookie
 * has to be SameSite=None, so a browser attaches it to cross-site requests.
 * A malicious page could therefore submit an ordinary HTML form (a "simple"
 * request that needs no CORS preflight) to a state-changing admin route and
 * ride the logged-in administrator's session. A mutating request is therefore
 * accepted only if it shows it came from our own client, by ANY of:
 *   - the custom header our admin client sends (a cross-site HTML form cannot
 *     set one, and a cross-site script that adds one triggers a CORS preflight
 *     that only our allow-listed origins pass);
 *   - an Origin header on our CORS allow-list (browsers always send Origin on a
 *     cross-site POST, and a forged one carries the attacker's origin). This
 *     also keeps already-installed admin APKs, which predate the header and
 *     present the fixed WebView origin https://localhost, working;
 *   - an Authorization header (it cannot be attached cross-site either).
 */
const ADMIN_REQUEST_HEADER = 'x-admin-request';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const requireAdminRequestHeader = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.headers.authorization?.startsWith('Bearer ')) return next();
  if (req.headers[ADMIN_REQUEST_HEADER]) return next();
  if (req.headers.origin && getAllowedOrigins().includes(req.headers.origin)) return next();
  return res.status(403).json({
    success: false,
    code: 'ADMIN_REQUEST_HEADER_MISSING',
    message: 'This request was not made by the admin panel.'
  });
};

/**
 * Authenticate admin request.
 * Token is extracted from HTTP-only cookie 'admin_token' or Authorization header.
 * Uses a completely separate JWT secret from the marketplace.
 * Validates: JWT signature, session existence, session active, inactivity timeout.
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // 1. Extract token
    let token = req.cookies?.admin_token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'MISSING_TOKEN',
        message: 'Admin authentication required'
      });
    }

    // 2. Verify JWT — ADMIN_JWT_SECRET only, never marketplace JWT_SECRET
    // Called for its throw-on-invalid side effect only; the decoded payload
    // is unused because the AdminSession lookup below is the identity source.
    try {
      jwt.verify(token, config.adminPanel.jwtSecret, {
        issuer: 'skillkart-admin',
        audience: 'admin-panel'
      });
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired admin token'
      });
    }

    // 3. Compute token hash and look up session
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await AdminSession.findOne({ tokenHash, isActive: true });

    if (!session) {
      return res.status(401).json({
        success: false,
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found or already logged out'
      });
    }

    // 4. Check hard expiry
    if (session.expiresAt < new Date()) {
      await AdminSession.updateOne(
        { _id: session._id },
        { $set: { isActive: false, logoutAt: new Date(), logoutReason: 'expired' } }
      );
      return res.status(401).json({
        success: false,
        code: 'SESSION_EXPIRED',
        message: 'Session has expired. Please log in again.'
      });
    }

    // 5. Check inactivity timeout (30 minutes)
    const INACTIVITY_MS = 30 * 60 * 1000;
    if (new Date() - session.lastActivityAt > INACTIVITY_MS) {
      await AdminSession.updateOne(
        { _id: session._id },
        { $set: { isActive: false, logoutAt: new Date(), logoutReason: 'inactivity' } }
      );
      return res.status(401).json({
        success: false,
        code: 'SESSION_INACTIVITY',
        message: 'Session expired due to inactivity. Please log in again.'
      });
    }

    // 6. Update lastActivityAt non-blocking
    AdminSession.updateOne(
      { _id: session._id },
      { $set: { lastActivityAt: new Date() } }
    ).catch(() => {}); // fire-and-forget

    // 7. Attach admin info to request
    req.admin = {
      email:       session.email,
      sessionId:   session._id,
      role:        session.adminRole || 'super_admin',
      permissions: session.permissions || [],
      ipAddress:   req.ip || req.socket?.remoteAddress
    };

    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * RBAC permission guard — stubbed.
 * When config.adminPanel.useRBAC = false: always passes (single admin mode).
 * When config.adminPanel.useRBAC = true: checks req.admin.permissions array.
 *
 * Usage: router.patch('/users/:id/suspend', authenticateAdmin, requirePermission('users.write'), ...)
 */
const requirePermission = (permission) => (req, res, next) => {
  if (!config.adminPanel.useRBAC) {
    return next();
  }

  if (!req.admin?.permissions?.includes(permission)) {
    // Log unauthorized access attempt
    AdminAuditLog.create({
      adminEmail:  req.admin?.email || 'unknown',
      adminRole:   req.admin?.role  || 'unknown',
      action:      'permission.denied',
      category:    'auth',
      resource:    'Permission',
      ipAddress:   req.ip,
      userAgent:   req.get('User-Agent'),
      notes:       `Required: ${permission}`,
      severity:    'warning'
    }).catch(() => {});

    return res.status(403).json({
      success: false,
      code: 'INSUFFICIENT_PERMISSIONS',
      message: `Permission required: ${permission}`
    });
  }

  next();
};

module.exports = { authenticateAdmin, requirePermission, requireAdminRequestHeader, ADMIN_REQUEST_HEADER };
