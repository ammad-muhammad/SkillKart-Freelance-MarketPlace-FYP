//services/supabase.service
const { getSupabaseAdmin } = require('../config/supabase');
const User = require('../models/User');

/**
 * Create user in Supabase
 */
const createSupabaseUser = async (email, password, metadata = {}) => {
  const admin = getSupabaseAdmin();
  
  if (!admin) {
    throw new Error('Supabase admin not initialized');
  }

  const { data, error } = await admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
  });

  if (error) throw error;
  return data.user;
};

/**
 * Update user in Supabase
 */
const updateSupabaseUser = async (supabaseId, updates) => {
  const admin = getSupabaseAdmin();
  
  if (!admin) {
    throw new Error('Supabase admin not initialized');
  }

  const { data, error } = await admin.updateUserById(supabaseId, updates);
  if (error) throw error;
  return data.user;
};

/**
 * Delete user from Supabase
 */
const deleteSupabaseUser = async (supabaseId) => {
  const admin = getSupabaseAdmin();
  
  if (!admin) {
    throw new Error('Supabase admin not initialized');
  }

  const { error } = await admin.deleteUser(supabaseId);
  if (error) throw error;
  return true;
};

/**
 * Sync MongoDB user to Supabase
 */
const syncUserToSupabase = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.supabaseId) {
    // Update existing Supabase user
    await updateSupabaseUser(user.supabaseId, {
      email: user.email,
      user_metadata: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } else if (user.authProvider === 'email' && user.password) {
    // Create new Supabase user (cannot set password via admin API)
    // Skip for email users as they need to set password themselves
    console.log('Email users must authenticate via Supabase directly');
  }

  user.isSyncedToSupabase = true;
  user.lastSyncedAt = new Date();
  await user.save();

  return user;
};

/**
 * Get Supabase user
 */
const getSupabaseUser = async (supabaseId) => {
  const admin = getSupabaseAdmin();
  
  if (!admin) {
    throw new Error('Supabase admin not initialized');
  }

  const { data, error } = await admin.getUserById(supabaseId);
  if (error) throw error;
  return data.user;
};

/**
 * List Supabase users
 */
const listSupabaseUsers = async (page = 1, perPage = 50) => {
  const admin = getSupabaseAdmin();
  
  if (!admin) {
    throw new Error('Supabase admin not initialized');
  }

  const { data, error } = await admin.listUsers({
    page,
    perPage
  });

  if (error) throw error;
  return data;
};

module.exports = {
  createSupabaseUser,
  updateSupabaseUser,
  deleteSupabaseUser,
  syncUserToSupabase,
  getSupabaseUser,
  listSupabaseUsers
};
