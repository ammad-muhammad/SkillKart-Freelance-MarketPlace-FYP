const User = require('../models/User');
const { sendSuccess } = require('../utils/apiResponse');
const { asyncHandler } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');

/**
 * Create admin user
 */
const createAdmin = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  const admin = new User({
    email,
    password,
    firstName,
    lastName,
    role: 'admin',
    createdBy: req.user._id,
    isActive: true,
    isEmailVerified: true
  });
  
  await admin.save();
  
  sendSuccess(res, {
    statusCode: 201,
    message: 'Admin created successfully',
    data: { admin: admin.toAuthJSON() }
  });
});

/**
 * Reset user password (Admin)
 */
const resetUserPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  user.password = newPassword;
  user.lastPasswordChange = new Date();
  // Same rule as the self-service change/reset paths (auth.service.js) — a
  // password reset must invalidate any already-issued tokens (e.g. a stolen
  // session this reset is meant to kill), or they'd remain valid regardless.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  
  sendSuccess(res, {
    message: 'Password reset successfully'
  });
});

/**
 * Get system statistics
 */
const getSystemStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const blockedUsers = await User.countDocuments({ isBlocked: true });
  
  const usersByRole = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);
  
  sendSuccess(res, {
    message: 'System statistics retrieved',
    data: {
      users: { total: totalUsers, active: activeUsers, blocked: blockedUsers },
      byRole: usersByRole
    }
  });
});

module.exports = {
  createAdmin,
  resetUserPassword,
  getSystemStats
};
