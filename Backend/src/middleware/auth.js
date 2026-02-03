const supabase = require('../config/supabase');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Verify Supabase JWT and attach user to request
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'No token provided');
  }

  const token = authHeader.substring(7);

  try {
    // Verify token with Supabase
    const {
      data: { user: supabaseUser },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      throw new ApiError(401, 'Invalid or expired token');
    }

    // Find user in MongoDB
    const user = await User.findOne({ supabaseId: supabaseUser.id });

    if (!user) {
      throw new ApiError(404, 'User not found in database');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Account is deactivated');
    }

    // Attach user to request
    req.user = user;
    req.supabaseUser = supabaseUser;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Authentication failed');
  }
});

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser(token);

    if (supabaseUser) {
      const user = await User.findOne({ supabaseId: supabaseUser.id });
      if (user && user.isActive) {
        req.user = user;
        req.supabaseUser = supabaseUser;
      }
    }
  } catch (error) {
    // Silently continue without user
  }

  next();
});

module.exports = { authenticate, optionalAuth };
