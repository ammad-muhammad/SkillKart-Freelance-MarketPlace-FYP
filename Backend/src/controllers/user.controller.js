const User = require('../models/User');
const { sendSuccess, sendCreated, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError } = require('../utils/apiError');

/**
 * Get user by ID
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const user = await User.findById(id)
    .select('-password')
    .populate('freelancerProfile')
    .populate('clientProfile');
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  sendSuccess(res, {
    message: 'User retrieved successfully',
    data: { user }
  });
});

/**
 * List users with pagination
 */
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { role, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  const query = {};
  if (role) query.role = role;
  if (status === 'active') query.isActive = true;
  if (status === 'blocked') query.isBlocked = true;
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } }
    ];
  }
  
  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password')
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  sendPaginated(res, {
    data: users,
    page,
    limit,
    total,
    message: 'Users retrieved successfully'
  });
});

/**
 * Create user (Admin only)
 */
const createUser = asyncHandler(async (req, res) => {
  const userData = req.body;
  
  const user = new User(userData);
  await user.save();
  
  sendCreated(res, 'User created successfully', { user: user.toAuthJSON() });
});

/**
 * Update user
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  Object.assign(user, updates);
  await user.save();
  
  sendSuccess(res, {
    message: 'User updated successfully',
    data: { user: user.toAuthJSON() }
  });
});

/**
 * Delete user
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  await User.deleteOne({ _id: id });
  
  sendSuccess(res, {
    message: 'User deleted successfully'
  });
});

/**
 * Block user
 */
const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  user.isBlocked = true;
  user.blockedReason = reason;
  user.blockedBy = req.user._id;
  user.blockedAt = new Date();
  await user.save();
  
  sendSuccess(res, {
    message: 'User blocked successfully'
  });
});

/**
 * Unblock user
 */
const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  user.isBlocked = false;
  user.blockedReason = null;
  user.blockedBy = null;
  user.blockedAt = null;
  await user.save();
  
  sendSuccess(res, {
    message: 'User unblocked successfully'
  });
});

/**
 * Update user role
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  user.role = role;
  await user.save();
  
  sendSuccess(res, {
    message: 'User role updated successfully',
    data: { user: user.toAuthJSON() }
  });
});

/**
 * Search users
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q, page: pageNum = 1, limit: limitNum = 10 } = req.query;
  const page = parseInt(pageNum);
  const limit = parseInt(limitNum);
  const skip = (page - 1) * limit;
  
  const query = {
    $or: [
      { email: { $regex: q, $options: 'i' } },
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } }
    ]
  };
  
  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password')
    .skip(skip)
    .limit(limit)
    .lean();
  
  sendPaginated(res, { data: users, page, limit, total });
});

/**
 * Get user statistics
 */
const getUserStats = asyncHandler(async (req, res) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        blocked: { $sum: { $cond: ['$isBlocked', 1, 0] } },
        verified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } }
      }
    }
  ]);
  
  const roleStats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);
  
  sendSuccess(res, {
    message: 'User statistics retrieved',
    data: {
      overview: stats[0] || { total: 0, active: 0, blocked: 0, verified: 0 },
      byRole: roleStats
    }
  });
});

module.exports = {
  getUserById,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
  updateUserRole,
  searchUsers,
  getUserStats
};
