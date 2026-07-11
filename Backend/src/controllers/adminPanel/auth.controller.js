const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config');
const AdminSession = require('../../models/AdminSession');
const SystemSettings = require('../../models/SystemSettings');
const { auditLogAuth, auditLog } = require('../../utils/adminAudit');

// In-memory OTP store for admin (avoids polluting user OTP model)
// Structure: { [email]: { otpHash, expiresAt, attempts, createdAt } }
const adminOtpStore = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const parseDuration = (str) => {
  // Parses '30m', '1h', '7d' into milliseconds
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return 30 * 60 * 1000; // default 30 min
  const val = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'd') return val * 24 * 60 * 60 * 1000;
  return 30 * 60 * 1000;
};

// Seed SystemSettings defaults if they don't exist
const seedDefaultSettings = async () => {
  try {
    for (const setting of SystemSettings.DEFAULT_SETTINGS) {
      await SystemSettings.findOneAndUpdate(
        { key: setting.key },
        { $setOnInsert: setting },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error('[AdminAuth] Settings seed failed:', err.message);
  }
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Step 1: Validate email + password, send OTP
 */
const login = async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress;
  const ua = req.get('User-Agent');

  try {
    const { email, password } = req.body;

    // Check email
    if (email?.toLowerCase() !== config.adminPanel.email?.toLowerCase()) {
      auditLogAuth(email, ip, ua, {
        action: 'login.failed',
        category: 'auth',
        resource: 'AdminSession',
        notes: 'Invalid email',
        severity: 'warning'
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, config.adminPanel.passwordHash);
    if (!validPassword) {
      auditLogAuth(email, ip, ua, {
        action: 'login.failed',
        category: 'auth',
        resource: 'AdminSession',
        notes: 'Invalid password',
        severity: 'warning'
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate OTP
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiryMs = parseDuration(config.adminPanel.otpExpiry);

    adminOtpStore.set(email.toLowerCase(), {
      otpHash,
      expiresAt: new Date(Date.now() + expiryMs),
      attempts: 0,
      createdAt: new Date()
    });

    // Send OTP email
    try {
      const { sendEmail } = require('../../services/email.service');
      await sendEmail(
        email,
        'SkillKart Admin — Your OTP Code',
        `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f1f5f9; border-radius: 12px;">
            <h2 style="color: #3b82f6; margin-bottom: 8px;">Admin Panel Login</h2>
            <p style="color: #94a3b8; margin-bottom: 24px;">Your one-time password (OTP) for SkillKart Admin Panel:</p>
            <div style="background: #1e293b; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #3b82f6;">${otp}</span>
            </div>
            <p style="color: #94a3b8; margin-top: 20px; font-size: 14px;">
              This OTP expires in ${config.adminPanel.otpExpiry}. Do not share it with anyone.
            </p>
            <p style="color: #ef4444; font-size: 12px;">
              IP: ${ip} | Time: ${new Date().toUTCString()}
            </p>
          </div>
        `
      );
    } catch (emailErr) {
      console.error('[AdminAuth] OTP email failed:', emailErr.message);
      // In development, log OTP to console
      if (config.env === 'development') {
        console.log(`[AdminAuth DEV] OTP for ${email}: ${otp}`);
      }
    }

    auditLogAuth(email, ip, ua, {
      action: 'otp.sent',
      category: 'auth',
      resource: 'AdminSession',
      notes: 'OTP generated and sent',
      severity: 'info'
    });

    return res.status(200).json({
      success: true,
      message: 'OTP sent to admin email. Enter the code to complete login.'
    });

  } catch (err) {
    console.error('[AdminAuth] Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
};

/**
 * POST /auth/verify-otp
 * Step 2: Verify OTP, create session, issue admin_token cookie
 */
const verifyOtp = async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress;
  const ua = req.get('User-Agent');
  const email = config.adminPanel.email?.toLowerCase();

  try {
    const { otp } = req.body;

    const stored = adminOtpStore.get(email);

    if (!stored) {
      return res.status(401).json({
        success: false,
        code: 'OTP_NOT_FOUND',
        message: 'No pending OTP. Please request a new one by logging in.'
      });
    }

    // Check max attempts
    if (stored.attempts >= config.adminPanel.maxOtpAttempts) {
      adminOtpStore.delete(email);
      auditLogAuth(email, ip, ua, {
        action: 'otp.failed',
        category: 'auth',
        resource: 'AdminSession',
        notes: `OTP locked after ${config.adminPanel.maxOtpAttempts} failed attempts`,
        severity: 'warning'
      });
      return res.status(429).json({
        success: false,
        code: 'OTP_MAX_ATTEMPTS',
        message: 'Too many failed OTP attempts. Please log in again.'
      });
    }

    // Check expiry
    if (new Date() > stored.expiresAt) {
      adminOtpStore.delete(email);
      return res.status(401).json({
        success: false,
        code: 'OTP_EXPIRED',
        message: 'OTP has expired. Please log in again.'
      });
    }

    // Verify OTP
    const inputHash = hashOtp(otp);
    if (inputHash !== stored.otpHash) {
      stored.attempts += 1;
      const remaining = config.adminPanel.maxOtpAttempts - stored.attempts;

      auditLogAuth(email, ip, ua, {
        action: 'otp.failed',
        category: 'auth',
        resource: 'AdminSession',
        notes: `Invalid OTP. Attempts: ${stored.attempts}/${config.adminPanel.maxOtpAttempts}`,
        severity: 'warning'
      });

      return res.status(401).json({
        success: false,
        code: 'OTP_INVALID',
        message: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        attemptsRemaining: remaining
      });
    }

    // OTP verified — remove from store (single-use)
    adminOtpStore.delete(email);

    // Create JWT
    const sessionTimeoutMs = parseDuration(config.adminPanel.sessionTimeout);
    const expiresAt = new Date(Date.now() + sessionTimeoutMs);

    const payload = {
      email,
      role: 'super_admin',
      type: 'admin'
    };

    const token = jwt.sign(payload, config.adminPanel.jwtSecret, {
      expiresIn: config.adminPanel.sessionTimeout,
      issuer:   'skillkart-admin',
      audience: 'admin-panel'
    });

    // Store hashed token in session
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const session = await AdminSession.create({
      email,
      tokenHash,
      ipAddress: ip,
      userAgent: ua,
      loginAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt,
      isActive: true,
      adminRole: 'super_admin',
      permissions: []
    });

    // Seed system settings if first login
    await seedDefaultSettings();

    // Set HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure:   config.env === 'production',
      sameSite: 'strict',
      maxAge:   sessionTimeoutMs,
      path:     '/'
    };

    res.cookie('admin_token', token, cookieOptions);

    auditLogAuth(email, ip, ua, {
      action: 'login',
      category: 'auth',
      resource: 'AdminSession',
      resourceId: session._id,
      notes: 'Successful admin login',
      severity: 'info'
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      admin: {
        email,
        role: 'super_admin',
        loginAt: session.loginAt,
        expiresAt: session.expiresAt
      }
    });

  } catch (err) {
    console.error('[AdminAuth] OTP verify error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/**
 * POST /auth/logout
 * Invalidate current admin session and clear cookie
 */
const logout = async (req, res) => {
  try {
    await AdminSession.updateOne(
      { _id: req.admin.sessionId },
      { $set: { isActive: false, logoutAt: new Date(), logoutReason: 'manual' } }
    );

    auditLog(req, {
      action: 'logout',
      category: 'auth',
      resource: 'AdminSession',
      resourceId: req.admin.sessionId,
      notes: 'Admin logged out',
      severity: 'info'
    });

    res.clearCookie('admin_token', { path: '/', httpOnly: true, sameSite: 'strict' });

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[AdminAuth] Logout error:', err);
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

/**
 * GET /auth/session
 * Return current session info (used by frontend to restore state)
 */
const getSession = async (req, res) => {
  try {
    const session = await AdminSession.findById(req.admin.sessionId).lean();

    if (!session) {
      return res.status(401).json({ success: false, message: 'Session not found' });
    }

    return res.status(200).json({
      success: true,
      session: {
        email:          session.email,
        role:           session.adminRole,
        permissions:    session.permissions,
        loginAt:        session.loginAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt:      session.expiresAt,
        ipAddress:      session.ipAddress
      }
    });
  } catch (err) {
    console.error('[AdminAuth] Session error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get session' });
  }
};

/**
 * GET /auth/sessions
 * Return all session history for the admin email
 */
const getSessionHistory = async (req, res) => {
  try {
    const sessions = await AdminSession.find({ email: req.admin.email })
      .sort({ loginAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      sessions: sessions.map(s => ({
        id:             s._id,
        loginAt:        s.loginAt,
        lastActivityAt: s.lastActivityAt,
        logoutAt:       s.logoutAt,
        logoutReason:   s.logoutReason,
        isActive:       s.isActive,
        ipAddress:      s.ipAddress,
        userAgent:      s.userAgent
      }))
    });
  } catch (err) {
    console.error('[AdminAuth] Session history error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get sessions' });
  }
};

/**
 * POST /auth/force-logout/:sessionId
 * Force-invalidate any specific session
 */
const forceLogout = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const updated = await AdminSession.updateOne(
      { _id: sessionId },
      { $set: { isActive: false, logoutAt: new Date(), logoutReason: 'forced' } }
    );

    if (updated.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    auditLog(req, {
      action: 'session.forced_logout',
      category: 'auth',
      resource: 'AdminSession',
      resourceId: sessionId,
      notes: 'Admin session force-invalidated',
      severity: 'warning'
    });

    return res.status(200).json({ success: true, message: 'Session invalidated' });
  } catch (err) {
    console.error('[AdminAuth] Force logout error:', err);
    return res.status(500).json({ success: false, message: 'Failed to force logout' });
  }
};

module.exports = { login, verifyOtp, logout, getSession, getSessionHistory, forceLogout };
