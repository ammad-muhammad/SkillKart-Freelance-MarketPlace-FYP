const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateToken, generateRefreshToken, verifyRefreshToken, decodeToken } = require('../utils/jwt');
const { AuthenticationError, NotFoundError } = require('../utils/apiError');
const bcrypt = require('bcryptjs');
const FreelancerProfile = require('../models/FreelancerProfile');
const ClientProfile = require('../models/ClientProfile');
const { sendLoginAlertEmail, sendPasswordChangeAlertEmail } = require('./email.service');
const { getSupabaseClient } = require('../config/supabase');
const { USER_ROLES } = require('../utils/constants');

// Self-registration must never be able to grant a privileged role — the route
// validator already restricts this, but this whitelist is a second,
// unconditional guard so no caller of registerWithEmail (present or future)
// can create anything above a plain marketplace account.
const SELF_REGISTERABLE_ROLES = [USER_ROLES.FREELANCER, USER_ROLES.CLIENT, USER_ROLES.PUBLIC_VIEWER];

/**
 * Issue a brand-new access/refresh token pair for a fresh login (not a
 * refresh-rotation — see rotateRefreshToken for that) and persist a
 * RefreshToken record so the refresh token can be tracked/rotated/revoked.
 * Starts a new rotation family.
 */
const issueTokenPair = async (user) => {
  const accessToken = generateToken(user);
  const familyId = crypto.randomUUID();
  const { refreshTokenStr } = await mintChildToken(familyId, user);

  return { accessToken, refreshToken: refreshTokenStr };
};

/**
 * Mint a new refresh token as a child of the given family, persisting its
 * RefreshToken record. Does not touch any other record — callers decide
 * whether/how to mark a parent as replaced.
 */
const mintChildToken = async (familyId, user) => {
  const jti = crypto.randomUUID();
  const refreshTokenStr = generateRefreshToken(user, jti);
  const { exp } = decodeToken(refreshTokenStr);

  await RefreshToken.create({
    jti,
    userId: String(user._id || user.id || 'superadmin'),
    familyId,
    expiresAt: new Date(exp * 1000)
  });

  return { jti, refreshTokenStr };
};

/**
 * Rotate a refresh token: mint a new one in the same family, mark the old
 * record as replaced (not just revoked — see RefreshToken.js's
 * `replacedByJti` doc comment for why the distinction matters for reuse
 * detection).
 */
const rotateRefreshToken = async (tokenRecord, user) => {
  const { jti, refreshTokenStr } = await mintChildToken(tokenRecord.familyId, user);

  tokenRecord.revokedAt = new Date();
  tokenRecord.replacedByJti = jti;
  await tokenRecord.save();

  return refreshTokenStr;
};

// A near-simultaneous second refresh call using the same (just-rotated) token
// is a normal race — multiple tabs restored at once, a scheduled refresh and
// a 401-triggered refresh landing together, a client retry — not necessarily
// theft. Only escalate to the full theft response once a rotated token is
// reused well after the fact, when a genuine race is implausible.
const REUSE_GRACE_MS = 10_000;

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
    role: SELF_REGISTERABLE_ROLES.includes(role) ? role : USER_ROLES.PUBLIC_VIEWER,
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

  const tokens = await issueTokenPair(superAdminUser);
  return { user: superAdminUser, tokens };
};

/**
 * Refresh access token. Rotates the refresh token on every successful use —
 * the caller must persist the NEW refresh token and discard the old one
 * (using the old one again after this call is treated as token theft, see
 * below). Returns { accessToken, refreshToken }.
 */
const refreshAccessToken = async (refreshTokenStr) => {
  const decoded = verifyRefreshToken(refreshTokenStr);

  // A refresh token minted before this rotation feature existed carries no
  // `jti` and was never recorded — it can't be tracked, so it's rejected
  // rather than silently trusted. This is a one-time inconvenience for
  // sessions active at deploy time (they simply have to log in again), in
  // exchange for actually being able to detect and respond to token theft.
  if (!decoded.jti) {
    throw new AuthenticationError('Session expired. Please log in again.');
  }

  const tokenRecord = await RefreshToken.findOne({ jti: decoded.jti });
  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw new AuthenticationError('Session expired. Please log in again.');
  }

  if (tokenRecord.revokedAt) {
    const wasRotatedForward = !!tokenRecord.replacedByJti;
    const withinGraceWindow = wasRotatedForward && (Date.now() - tokenRecord.revokedAt.getTime()) < REUSE_GRACE_MS;

    // A rotated-forward token reused within the grace window is treated as a
    // benign race (two tabs restored together, a scheduled refresh and a
    // 401-triggered refresh landing at the same moment, a client retry) —
    // fall through and mint another child of the same family instead of
    // punishing it. Anything else (reused well after rotation, or a token
    // that was revoked by an explicit logout, not rotation) is not
    // explainable by a race and is treated as before.
    if (!withinGraceWindow) {
      // Replaying a token that was already rotated forward (as opposed to one
      // that was revoked by an explicit logout) means a second copy of this
      // exact refresh token is in play well outside any plausible race
      // window — a strong signal it was stolen. Kill every token in the
      // family and force a real re-login rather than trusting either copy.
      if (wasRotatedForward) {
        await RefreshToken.updateMany(
          { familyId: tokenRecord.familyId, revokedAt: null },
          { revokedAt: new Date() }
        );
        if (tokenRecord.userId !== 'superadmin') {
          await User.updateOne({ _id: tokenRecord.userId }, { $inc: { tokenVersion: 1 } }).catch(() => {});
        }
      }
      throw new AuthenticationError('Session expired. Please log in again.');
    }
  }

  if (decoded.userId === 'superadmin') {
    const superAdminUser = { _id: 'superadmin', email: decoded.email, role: 'superadmin' };
    const accessToken = generateToken(superAdminUser);
    const refreshToken = await rotateRefreshToken(tokenRecord, superAdminUser);
    return { accessToken, refreshToken };
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive || user.isBlocked) {
    throw new AuthenticationError('Invalid refresh token');
  }
  // Reject refresh tokens minted before a "log out all devices" / password change.
  if ((decoded.tv || 0) !== (user.tokenVersion || 0)) {
    throw new AuthenticationError('Session expired. Please log in again.');
  }

  const accessToken = generateToken(user);
  const refreshToken = await rotateRefreshToken(tokenRecord, user);
  return { accessToken, refreshToken };
};

/**
 * Revoke a single refresh token (logout on this device only). Silently a
 * no-op for an already-invalid/unrecognized token — logout must never fail.
 */
const revokeRefreshToken = async (refreshTokenStr) => {
  if (!refreshTokenStr) return;
  try {
    const decoded = decodeToken(refreshTokenStr);
    if (!decoded?.jti) return;
    await RefreshToken.updateOne({ jti: decoded.jti, revokedAt: null }, { revokedAt: new Date() });
  } catch {
    // best-effort only
  }
};

/**
 * Revoke every refresh token issued to a user (logout from all devices).
 */
const revokeAllRefreshTokens = async (userId) => {
  await RefreshToken.updateMany({ userId: String(userId), revokedAt: null }, { revokedAt: new Date() });
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
  // Invalidate every token issued before this change — a password change is
  // exactly the moment a stolen access/refresh token should stop working.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
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
  // Invalidate every token issued before this reset, same as changePassword.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
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


  const tokens = await issueTokenPair(user);
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
    if (profilePicture && !user.profilePicture) user.profilePicture = profilePicture;
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
  // Verify the token against Supabase's own auth server — this checks the
  // signature/issuer/expiry server-side. Never trust a client-decoded JWT
  // payload here: without this call, anyone can hand-craft an unsigned
  // token claiming to be any email and get real access/refresh tokens back.
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new AuthenticationError('Supabase authentication is not configured');
  }

  const { data, error } = await supabase.auth.getUser(supabaseAccessToken);
  if (error || !data?.user) {
    throw new AuthenticationError('Invalid or expired Supabase token');
  }

  const { id: supabaseId, email, user_metadata, app_metadata } = data.user;
  const provider = (app_metadata?.provider || 'email').toLowerCase();

  console.log('🔐 Supabase OAuth:', provider, '-', email);

  const { uploadFromUrl } = require('./upload.service');

  // Find user by supabaseId or email
  let user = await User.findOne({ $or: [{ supabaseId }, { email }] });

  // Function to mirror avatar if it's from Google
  const mirrorAvatar = async (rawUrl) => {
    if (rawUrl && rawUrl.includes('googleusercontent.com')) {
      console.log('🔄 Mirroring Google avatar to Cloudinary...');
      const mirrored = await uploadFromUrl(rawUrl, 'profile-pictures');
      return mirrored ? mirrored.secure_url : rawUrl;
    }
    return rawUrl;
  };

  if (!user) {
    const rawAvatar = user_metadata?.avatar_url || user_metadata?.picture;
    const finalAvatar = await mirrorAvatar(rawAvatar);

    // Create new user
    user = new User({
      email,
      firstName: user_metadata?.full_name?.split(' ')[0] || user_metadata?.name?.split(' ')[0] || '',
      lastName: user_metadata?.full_name?.split(' ').slice(1).join(' ') || user_metadata?.name?.split(' ').slice(1).join(' ') || '',
      profilePicture: finalAvatar,
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
    
    // Mirror avatar if it's currently a Google URL or missing
    const currentAvatar = user.profilePicture;
    const incomingAvatar = user_metadata?.avatar_url || user_metadata?.picture;
    
    if (!currentAvatar || currentAvatar.includes('googleusercontent.com')) {
      user.profilePicture = await mirrorAvatar(incomingAvatar || currentAvatar);
    }

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

  const tokens = await issueTokenPair(user);

  return { 
    user: user.toAuthJSON(), 
    tokens 
  };
};


/**
 * Handle Login Alert Email
 */
const handleLoginAlert = async (user, method, reqDetails = {}) => {
  try {
    const { ip, userAgent } = reqDetails;
    
    const targetId = user.id || user._id;
    if (!targetId) {
      console.warn('⚠️ handleLoginAlert: No User ID provided');
      return;
    }

    // 1. Fetch Profile based on role
    let profile = null;
    if (user.role === 'freelancer') {
      profile = await FreelancerProfile.findOne({ userId: targetId });
    } else if (user.role === 'client') {
      profile = await ClientProfile.findOne({ userId: targetId });
    }

    // 2. Strict Check: Only send if explicitly true (defaults to true if profile exists but setting missing)
    const laEnabled = profile?.securitySettings?.loginAlerts === true || 
                     (profile && profile.securitySettings?.loginAlerts === undefined);

    if (laEnabled) {
      const uap = require('ua-parser-js');
      const parser = new uap(userAgent);
      const ua = parser.getResult();
      
      const details = {
        time: new Date().toLocaleString('en-US', { 
          timeZone: 'UTC',
          dateStyle: 'full', 
          timeStyle: 'long' 
        }) + ' UTC',
        method: method,
        browser: `${ua.browser.name || 'Unknown Browser'} ${ua.browser.version || ''}`,
        device: `${ua.os.name || 'Unknown OS'} ${ua.device.model || ''}`,
        ip: ip || 'Unknown IP'
      };

      // Send email (async - don't await)
      sendLoginAlertEmail(user.email, details)
        .then(() => console.log(`🚀 Login alert email sent to ${user.email}`))
        .catch(err => console.error(`❌ Failed to send login alert:`, err.message));
    }
  } catch (error) {
    console.error('⚠️ handleLoginAlert error:', error.message);
  }
};

/**
 * Handle Password Change Alert Email
 */
const handlePasswordChangeAlert = async (user, reqDetails = {}) => {
  try {
    const { ip, userAgent } = reqDetails;
    
    // Only applies to email/password users
    if (user.authProvider !== 'email') return;

    const targetId = user.id || user._id;
    if (!targetId) return;

    // 1. Fetch Profile based on role
    let profile = null;
    if (user.role === 'freelancer') {
      profile = await FreelancerProfile.findOne({ userId: targetId });
    } else if (user.role === 'client') {
      profile = await ClientProfile.findOne({ userId: targetId });
    }

    // 2. Strict Check: Only send if explicitly true (defaults to true if profile exists but setting missing)
    const paEnabled = profile?.securitySettings?.passwordChangeAlerts === true ||
                     (profile && profile.securitySettings?.passwordChangeAlerts === undefined);

    if (paEnabled) {
      const uap = require('ua-parser-js');
      const parser = new uap(userAgent);
      const ua = parser.getResult();
      
      const details = {
        time: new Date().toLocaleString('en-US', { 
          timeZone: 'UTC',
          dateStyle: 'full', 
          timeStyle: 'long' 
        }) + ' UTC',
        browser: `${ua.browser.name || 'Unknown Browser'} ${ua.browser.version || ''}`,
        device: `${ua.os.name || 'Unknown OS'} ${ua.device.model || ''}`,
        ip: ip || 'Unknown IP'
      };

      // Send email (async)
      sendPasswordChangeAlertEmail(user.email, details)
        .then(() => console.log(`🚀 Password change alert email sent to ${user.email}`))
        .catch(err => console.error(`❌ Failed to send password change alert:`, err.message));
    }
  } catch (error) {
    console.error('⚠️ handlePasswordChangeAlert error:', error.message);
  }
};

/**
 * Check if 2FA is enabled for a user
 */
const checkTwoFactorEnabled = async (userId, role) => {
  let profile = null;
  if (role === 'freelancer') {
    profile = await FreelancerProfile.findOne({ userId });
  } else if (role === 'client') {
    profile = await ClientProfile.findOne({ userId });
  }
  
  // Default to true for email/password users if profile exists, otherwise respect setting
  return profile?.securitySettings?.twoFactorEnabled !== false;
};

module.exports = {
  registerWithEmail,
  loginWithEmail,
  loginSuperAdmin,
  issueTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  changePassword,
  resetPassword,
  verifyEmail,
  createOrUpdateFromOAuth,
  authenticateWithSupabase,
  handleLoginAlert,
  handlePasswordChangeAlert,
  checkTwoFactorEnabled
};
