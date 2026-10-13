const rateLimit = require('express-rate-limit');

const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  };
  return rateLimit({ ...defaults, ...options });
};

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
});
// OTP verify/resend are confirmation steps *within* an already-initiated
// register/login/reset flow — a mistyped code or a resend shouldn't burn the
// same 5-request budget as authLimiter, or a normal flow (register, resend,
// verify) locks the user out of logging in from the same IP for 15 minutes.
// The real anti-spam control for resend is the per-email cooldown in
// otp.service.js's resendOTP; this is just a coarse per-IP backstop.
const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many OTP requests from this IP, please try again later.'
});
const apiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });
const strictLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10 });

module.exports = { createRateLimiter, authLimiter, otpLimiter, apiLimiter, strictLimiter };
