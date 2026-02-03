const ApiError = require('../utils/ApiError');

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!req.user.role) {
      throw new ApiError(403, 'Please complete your profile setup');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, `Access denied. Required role: ${allowedRoles.join(' or ')}`);
    }

    next();
  };
};

/**
 * Ensure profile is complete
 */
const requireCompleteProfile = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (!req.user.isProfileComplete) {
    throw new ApiError(403, 'Please complete your profile before accessing this resource');
  }

  next();
};

module.exports = { roleGuard, requireCompleteProfile };
