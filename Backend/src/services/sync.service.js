const User = require('../models/User');
const { syncUserToSupabase } = require('./supabase.service');

/**
 * Sync user from Supabase to MongoDB
 */
const syncFromSupabase = async (supabaseUser) => {
  const { id, email, user_metadata, email_confirmed_at } = supabaseUser;

  let user = await User.findOne({ supabaseId: id });

  if (!user) {
    user = await User.findOne({ email });
  }

  if (user) {
    // Update existing user. Deliberately NEVER touch `role` here — it must
    // stay under the backend's own RBAC control. `user_metadata` (unlike
    // `app_metadata`) is writable by the end user themselves via Supabase's
    // standard client SDK (`supabase.auth.updateUser`), so trusting a role
    // out of it would let any user self-grant admin/superadmin.
    user.supabaseId = id;
    user.email = email;
    user.firstName = user_metadata?.firstName || user.firstName;
    user.lastName = user_metadata?.lastName || user.lastName;
    user.profilePicture = user_metadata?.avatar_url || user.profilePicture;
    user.isEmailVerified = !!email_confirmed_at;
    user.emailVerifiedAt = email_confirmed_at ? new Date(email_confirmed_at) : user.emailVerifiedAt;
    user.isSyncedToSupabase = true;
    user.lastSyncedAt = new Date();
  } else {
    // Create new user — always the safe baseline role, never caller-supplied.
    user = new User({
      supabaseId: id,
      email,
      firstName: user_metadata?.firstName,
      lastName: user_metadata?.lastName,
      profilePicture: user_metadata?.avatar_url,
      role: 'publicviewer',
      authProvider: supabaseUser.app_metadata?.provider || 'supabase',
      isEmailVerified: !!email_confirmed_at,
      emailVerifiedAt: email_confirmed_at ? new Date(email_confirmed_at) : null,
      isSyncedToSupabase: true,
      lastSyncedAt: new Date()
    });
  }

  await user.save();
  return user;
};

/**
 * Sync user from MongoDB to Supabase
 */
const syncToSupabase = async (userId) => {
  return await syncUserToSupabase(userId);
};

/**
 * Sync all users
 */
const syncAllUsers = async () => {
  const users = await User.find({ 
    isSyncedToSupabase: { $ne: true },
    authProvider: { $ne: 'email' } // Skip email users
  });

  const results = {
    total: users.length,
    synced: 0,
    failed: 0,
    errors: []
  };

  for (const user of users) {
    try {
      await syncToSupabase(user._id);
      results.synced++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        userId: user._id,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * Handle Supabase webhook
 */
const handleSupabaseWebhook = async (event, data) => {
  switch (event) {
    case 'user.created':
    case 'user.updated':
      return await syncFromSupabase(data.user);
    
    case 'user.deleted':
      await User.deleteOne({ supabaseId: data.user.id });
      return { deleted: true };
    
    default:
      console.log('Unknown Supabase event:', event);
      return null;
  }
};

module.exports = {
  syncFromSupabase,
  syncToSupabase,
  syncAllUsers,
  handleSupabaseWebhook
};
