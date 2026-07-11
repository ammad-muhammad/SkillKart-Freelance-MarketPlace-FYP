const rateLimit = require('express-rate-limit');

/**
 * Admin panel rate limiters — separate from marketplace limiters.
 * Applied per-IP to prevent brute force attacks.
 */

// Login endpoint: 5 attempts per 15 minutes per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    code: 'RATE_LIMIT_LOGIN',
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

// OTP verification: 3 attempts per 10 minutes per IP
const adminOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    code: 'RATE_LIMIT_OTP',
    message: 'Too many OTP attempts. Please request a new OTP and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

// General admin API: 100 requests per minute per IP
const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    code: 'RATE_LIMIT_API',
    message: 'Too many requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

module.exports = { adminLoginLimiter, adminOtpLimiter, adminApiLimiter };
