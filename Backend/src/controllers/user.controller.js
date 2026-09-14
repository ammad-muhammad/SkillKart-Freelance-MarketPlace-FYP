const User = require('../models/User');
const { sendSuccess, sendCreated, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const { asyncHandler, parsePagination } = require('../utils/helpers');
const { NotFoundError, BadRequestError } = require('../utils/apiError');
const { USER_ROLES } = require('../utils/constants');

// These endpoints are admin-only (already gated by requireRole upstream), so
// this is defense-in-depth rather than a live public-facing exposure — still
// worth escaping so an admin's search input can't cause pathological regex
// backtracking against the User collection.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Roles this marketplace-facing controller may assign. Deliberately excludes
// 'superadmin' — that role has no real User document at all (see
// auth.middleware.js's userId==='superadmin' synthetic-user short-circuit);
// letting any admin/superadmin-role caller set it here would let them mint a
// second, fully-functional superadmin account with a real _id. Mirrors the
// isolated admin-panel's own ADMIN_ASSIGNABLE_ROLES (adminPanel/users.controller.js).
const ASSIGNABLE_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.CONTENT_EDITOR,
  USER_ROLES.FREELANCER,
  USER_ROLES.CLIENT,
  USER_ROLES.PUBLIC_VIEWER
];

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
    const safeSearch = escapeRegex(search);
    query.$or = [
      { email: { $regex: safeSearch, $options: 'i' } },
      { firstName: { $regex: safeSearch, $options: 'i' } },
      { lastName: { $regex: safeSearch, $options: 'i' } }
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
  const { email, password, firstName, lastName, role, phone, isActive } = req.body;

  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new BadRequestError('Invalid or non-assignable role');
  }

  const user = new User({ email, password, firstName, lastName, role, phone, isActive });
  await user.save();

  sendCreated(res, 'User created successfully', { user: user.toAuthJSON() });
});

/**
 * Update user
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.body.role !== undefined && !ASSIGNABLE_ROLES.includes(req.body.role)) {
    throw new BadRequestError('Invalid or non-assignable role');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Explicit whitelist — matches updateUserValidation's own field set exactly.
  // Anything else in req.body (permissions, tokenVersion, isBlocked, wallet
  // fields, ...) is silently ignored rather than mass-assigned onto the doc.
  const ALLOWED_FIELDS = ['firstName', 'lastName', 'phone', 'profilePicture', 'role'];
  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  }
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

  // Soft delete only — matches the admin-panel's own deleteUser. The old
  // hard-delete here only ever cleaned up the user's own Job/Profile/
  // Proposal docs, never Contract/Milestone/Payment/Review/Message/
  // TimeLog/Withdrawal/Gig — leaving those with dangling references that
  // crash the first time anything populates the deleted user (e.g.
  // contract.controller.js immediately reads `contract.clientId._id` after
  // populate). A hard delete can't be made safe without a full cascade
  // across every one of those collections for both client and freelancer
  // roles; soft-deleting avoids the whole class of orphan-reference bugs by
  // never actually removing the referenced document.
  user.deletedAt = new Date();
  user.deletedBy = req.user?.email || 'superadmin';
  user.isActive = false;
  user.isBlocked = true;
  await user.save();

  sendSuccess(res, {
    message: 'User soft-deleted — account deactivated, data preserved'
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

  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new BadRequestError('Invalid or non-assignable role');
  }

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
  const page = Math.max(parseInt(pageNum) || 1, 1);
  const limit = Math.min(Math.max(parseInt(limitNum) || 10, 1), 100);
  const skip = (page - 1) * limit;
  
  const safeQ = escapeRegex(q);
  const query = {
    $or: [
      { email: { $regex: safeQ, $options: 'i' } },
      { firstName: { $regex: safeQ, $options: 'i' } },
      { lastName: { $regex: safeQ, $options: 'i' } }
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
