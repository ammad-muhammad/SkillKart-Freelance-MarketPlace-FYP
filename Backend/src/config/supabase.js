const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

let supabaseClient = null;

/**
 * Initialize Supabase client
 * This is a singleton - only one instance is created
 */
const initSupabase = () => {
  if (!supabaseClient) {
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      console.warn('⚠️  Supabase credentials not configured');
      return null;
    }

    supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✓ Supabase client initialized');
  }

  return supabaseClient;
};

/**
 * Get Supabase client instance
 */
const getSupabaseClient = () => {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
};

/**
 * Get Supabase admin client for user management
 */
const getSupabaseAdmin = () => {
  const client = getSupabaseClient();
  return client ? client.auth.admin : null;
};

module.exports = {
  initSupabase,
  getSupabaseClient,
  getSupabaseAdmin
};
