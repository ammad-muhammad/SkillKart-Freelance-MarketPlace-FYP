const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Sync user from Supabase to MongoDB
 * POST /api/auth/sync
 */
const syncUser = asyncHandler(async (req, res) => {
  const { supabaseId, email, authProvider } = req.body;

  const user = await authService.syncUser(supabaseId, email, authProvider);

  res.status(200).json(
    new ApiResponse(200, user, 'User synced successfully')
  );
});

/**
 * Select user role
 * POST /api/auth/role
 */
const selectRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const userId = req.user._id;

  const user = await authService.setUserRole(userId, role);

  res.status(200).json(
    new ApiResponse(200, user, 'Role selected successfully')
  );
});

/**
 * Get current user
 * GET /api/auth/me
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await req.user.populate('profile');

  res.status(200).json(
    new ApiResponse(200, user, 'User retrieved successfully')
  );
});

module.exports = {
  syncUser,
  selectRole,
  getCurrentUser,
};
