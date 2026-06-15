const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate access token
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  const payload = {
    userId: user._id || user.id || 'superadmin',
    email: user.email,
    role: user.role,
    tv: user.tokenVersion || 0, // token version — bumping it logs out all devices
    type: 'access'
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expire,
    issuer: 'freelance-platform',
    audience: 'freelance-platform-users'
  });
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @returns {String} Refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    userId: user._id || user.id || 'superadmin',
    email: user.email,
    tv: user.tokenVersion || 0,
    type: 'refresh'
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
    issuer: 'freelance-platform',
    audience: 'freelance-platform-users'
  });
};

/**
 * Verify access token
 * @param {String} token - JWT token
 * @returns {Object} Decoded token
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: 'freelance-platform',
      audience: 'freelance-platform-users'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {String} token - Refresh token
 * @returns {Object} Decoded token
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'freelance-platform',
      audience: 'freelance-platform-users'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {String} token - JWT token
 * @returns {Object|null} Decoded token or null
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Generate tokens pair
 * @param {Object} user - User object
 * @returns {Object} Object with accessToken and refreshToken
 */
const generateTokenPair = (user) => {
  return {
    accessToken: generateToken(user),
    refreshToken: generateRefreshToken(user)
  };
};

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
};

/**
 * Check if token is expired
 * @param {String} token - JWT token
 * @returns {Boolean} True if expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

/**
 * Get token expiration time
 * @param {String} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
  generateTokenPair,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiration
};
