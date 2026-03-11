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
    firstName: firstName || "",
    lastName: lastName || "",
    role: role || 'publicviewer',
    authProvider: 'email',
    isOnBoardingCompleted: false,
    isEmailVerified: false
  });

  await user.save();

  return user;
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


  return { user: user.id, valid: true };
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


  const tokens = generateTokenPair(user);
  return { success: true, user: user.toAuthJSON(), tokens };
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

/**
 * Authenticate with Supabase OAuth
 * Handles Google, GitHub, LinkedIn login
 */
const authenticateWithSupabase = async (supabaseAccessToken) => {
  // Decode Supabase JWT
  let payload;
  try {
    payload = JSON.parse(
      Buffer.from(supabaseAccessToken.split('.')[1], 'base64').toString()
    );
  } catch (error) {
    throw new AuthenticationError('Invalid Supabase token');
  }

  const { sub: supabaseId, email, user_metadata, app_metadata } = payload;
  const provider = (app_metadata?.provider || 'email').toLowerCase();

  console.log('🔐 Supabase OAuth:', provider, '-', email);

  // Find user by supabaseId or email
  let user = await User.findOne({ $or: [{ supabaseId }, { email }] });

  if (!user) {
    // Create new user
    user = new User({
      email,
      firstName: user_metadata?.full_name?.split(' ')[0] || user_metadata?.name?.split(' ')[0] || '',
      lastName: user_metadata?.full_name?.split(' ').slice(1).join(' ') || user_metadata?.name?.split(' ').slice(1).join(' ') || '',
      profilePicture: user_metadata?.avatar_url || user_metadata?.picture,
      supabaseId,
      authProvider: provider,
      googleId: provider === 'google' ? user_metadata?.provider_id || user_metadata?.sub : undefined,
      githubId: provider === 'github' ? user_metadata?.provider_id || user_metadata?.sub : undefined,
      linkedinId: provider === 'linkedin' ? user_metadata?.provider_id || user_metadata?.sub : undefined,
      role: 'publicviewer',
      isOnBoardingCompleted: false,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isSyncedToSupabase: true,
      lastSyncedAt: new Date()
    });

    await user.save();
    console.log('✅ New user created via', provider, ':', email);
  } else {
    // Update existing user
    user.supabaseId = supabaseId;
    user.profilePicture = user_metadata?.avatar_url || user_metadata?.picture || user.profilePicture;
    user.isEmailVerified = true;
    user.isSyncedToSupabase = true;
    user.lastSyncedAt = new Date();

    // Update provider ID if not set
    if (provider === 'google' && !user.googleId) {
      user.googleId = user_metadata?.provider_id || user_metadata?.sub;
    } else if (provider === 'github' && !user.githubId) {
      user.githubId = user_metadata?.provider_id || user_metadata?.sub;
    } else if (provider === 'linkedin' && !user.linkedinId) {
      user.linkedinId = user_metadata?.provider_id || user_metadata?.sub;
    }

    await user.save();
    console.log('✅ User updated:', email);
  }

  // Generate tokens using your existing function
  const tokens = generateTokenPair(user);

  return { 
    user: user.toAuthJSON(), 
    tokens 
  };
};


module.exports = {
  registerWithEmail,
  loginWithEmail,
  loginSuperAdmin,
  refreshAccessToken,
  changePassword,
  resetPassword,
  verifyEmail,
  createOrUpdateFromOAuth,
  authenticateWithSupabase
};
