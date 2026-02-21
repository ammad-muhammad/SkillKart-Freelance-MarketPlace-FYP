const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/apiError');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedError('No authentication token provided');
    }

    let token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (!token) throw new UnauthorizedError('Invalid token format');

    const decoded = verifyToken(token);

    if (decoded.userId === 'superadmin') {
      req.user = { _id: 'superadmin', id: 'superadmin', email: decoded.email, role: 'superadmin', isSuperAdmin: true };
      return next();
    }

    const user = await User.findById(decoded.userId).select('-password').lean();
    if (!user) throw new UnauthorizedError('User not found');
    if (!user.isActive) throw new UnauthorizedError('Account is inactive');
    if (user.isBlocked) throw new UnauthorizedError('Account has been blocked');
    if (user.lockUntil && user.lockUntil > Date.now()) throw new UnauthorizedError('Account is temporarily locked');

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    let token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (!token) return next();

    try {
      const decoded = verifyToken(token);
      if (decoded.userId === 'superadmin') {
        req.user = { _id: 'superadmin', id: 'superadmin', email: decoded.email, role: 'superadmin', isSuperAdmin: true };
        return next();
      }

      const user = await User.findById(decoded.userId).select('-password').lean();
      if (user && user.isActive && !user.isBlocked) {
        req.user = user;
        req.userId = user._id;
      }
    } catch (error) {
      // Ignore errors for optional auth
    }
    next();
  } catch (error) {
    next();
  }
};

const verifyOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const resourceUserId = req.params[paramName] || req.body[paramName];
      if (!resourceUserId) throw new Error(`Parameter '${paramName}' not found`);
      if (req.user.role === 'superadmin' || req.user.role === 'admin') return next();
      if (req.user._id.toString() !== resourceUserId.toString()) {
        throw new UnauthorizedError('You do not have permission to access this resource');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

const requireEmailVerified = (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    if (req.user.role === 'superadmin') return next();
    if (!req.user.isEmailVerified) throw new UnauthorizedError('Email verification required');
    next();
  } catch (error) {
    next(error);
  }
};

const requireFreshAuth = (maxAgeMinutes = 15) => {
  return (req, res, next) => {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      if (!req.user.lastLogin) throw new UnauthorizedError('Fresh authentication required');

      const age = Date.now() - new Date(req.user.lastLogin).getTime();
      if (age > maxAgeMinutes * 60 * 1000) {
        throw new UnauthorizedError('Fresh authentication required. Please log in again.');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { authenticate, optionalAuth, verifyOwnership, requireEmailVerified, requireFreshAuth };
