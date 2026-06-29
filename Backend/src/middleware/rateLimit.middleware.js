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
const apiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });
const strictLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10 });

module.exports = { createRateLimiter, authLimiter, apiLimiter, strictLimiter };
