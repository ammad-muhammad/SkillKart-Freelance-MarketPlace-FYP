const User = require('../models/User');
const { generateTokenPair } = require('../utils/jwt');
const { AuthenticationError, NotFoundError } = require('../utils/apiError');
const bcrypt = require('bcryptjs');

/**
 * Register new user with email/password
 */
const registerWithEmail = async (userData) => {
  const { email, password, firstName, lastName, role } = userData;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AuthenticationError('Email already registered');
  }

  const user = new User({
    email,
    password,
    firstName,
    lastName,
    role: role || 'publicviewer',
    authProvider: 'email',
    isEmailVerified: false
  });

  await user.save();
  
  // return user;
  const tokens = generateTokenPair(user);
  return { user: user.toAuthJSON(), tokens };
};

/**
 * Login with email/password
 */
const loginWithEmail = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }

  if (user.isLocked()) {
    throw new AuthenticationError('Account is locked. Please try again later.');
  }

  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    await user.incLoginAttempts();
    throw new AuthenticationError('Invalid credentials');
  }

  if (!user.isActive) {
    throw new AuthenticationError('Account is inactive');
  }

  if (user.isBlocked) {
    throw new AuthenticationError('Account has been blocked');
  }

  await user.resetLoginAttempts();
  user.lastLogin = new Date();
  await user.save();

  const tokens = generateTokenPair(user);
  return { user: user.toAuthJSON(), tokens };
};

/**
 * Login SuperAdmin
 */
const loginSuperAdmin = async (username, password, encryptedCredentials) => {
  const { verifySuperAdminCredentials } = require('./encryption.service');
  
  const isValid = await verifySuperAdminCredentials(username, password, encryptedCredentials);
  
  if (!isValid) {
    throw new AuthenticationError('Invalid SuperAdmin credentials');
  }

  const superAdminUser = {
    _id: 'superadmin',
    email: username,
    role: 'superadmin'
  };

  const tokens = generateTokenPair(superAdminUser);
  return { user: superAdminUser, tokens };
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshToken) => {
  const { verifyRefreshToken, generateToken } = require('../utils/jwt');
  
  const decoded = verifyRefreshToken(refreshToken);
  
  if (decoded.userId === 'superadmin') {
    return generateToken({ _id: 'superadmin', email: decoded.email, role: 'superadmin' });
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive || user.isBlocked) {
    throw new AuthenticationError('Invalid refresh token');
  }

  return generateToken(user);
};

/**
 * Change password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new NotFoundError('User not found');

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) throw new AuthenticationError('Current password is incorrect');

  user.password = newPassword;
  user.lastPasswordChange = new Date();
  await user.save();

  return true;
};

/**
 * Reset password with OTP
 */
const resetPassword = async (email, newPassword) => {
  const user = await User.findOne({ email });
  if (!user) throw new NotFoundError('User not found');

  user.password = newPassword;
  user.lastPasswordChange = new Date();
  await user.save();

  return true;
};

/**
 * Verify email
 */
const verifyEmail = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new NotFoundError('User not found');

  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  await user.save();

  return user;
};

/**
 * Create user from OAuth provider (Supabase)
 */
const createOrUpdateFromOAuth = async (oauthData) => {
  const { provider, providerId, email, firstName, lastName, profilePicture } = oauthData;

  let user = await User.findOne({ email });

  if (user) {
    user.authProvider = provider;
    user.oauthId = providerId;
    if (profilePicture) user.profilePicture = profilePicture;
    user.isEmailVerified = true;
    user.emailVerifiedAt = user.emailVerifiedAt || new Date();
    await user.save();
  } else {
    user = new User({
      email,
      firstName,
      lastName,
      profilePicture,
      authProvider: provider,
      oauthId: providerId,
      role: 'publicviewer',
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });
    await user.save();
  }

  return user;
};

module.exports = {
  registerWithEmail,
  loginWithEmail,
  loginSuperAdmin,
  refreshAccessToken,
  changePassword,
  resetPassword,
  verifyEmail,
  createOrUpdateFromOAuth
};
