const User = require('../models/User');
const { BadRequestError, ConflictError } = require('./apiError');

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

const normalizeUsername = (username) => {
  if (typeof username !== 'string') return '';
  return username.trim().toLowerCase();
};

const validateUsernameFormat = (username) => {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    throw new BadRequestError('Username is required');
  }
  if (!USERNAME_REGEX.test(normalized)) {
    throw new BadRequestError(
      'Username must be 3–30 characters and contain only letters, numbers, and underscores'
    );
  }
  return normalized;
};

const isUsernameTaken = async (username, excludeUserId) => {
  const normalized = validateUsernameFormat(username);
  const query = { username: normalized };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const existing = await User.findOne(query);
  return !!existing;
};

/**
 * Update the user's username if changed. Returns true when saved.
 */
const applyUsernameUpdate = async (user, newUsername) => {
  const normalized = validateUsernameFormat(newUsername);
  const current = normalizeUsername(user.username || '');
  if (normalized === current) {
    return false;
  }

  if (await isUsernameTaken(normalized, user._id)) {
    throw new ConflictError('Username already taken');
  }

  user.username = normalized;
  return true;
};

module.exports = {
  normalizeUsername,
  validateUsernameFormat,
  isUsernameTaken,
  applyUsernameUpdate
};
