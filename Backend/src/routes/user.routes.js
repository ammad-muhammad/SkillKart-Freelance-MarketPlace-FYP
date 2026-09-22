const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requireHigherRole } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  getUserByIdValidation,
  createUserValidation,
  updateUserValidation,
  deleteUserValidation,
  blockUserValidation,
  unblockUserValidation,
  updateUserRoleValidation,
  listUsersValidation,
  searchUsersValidation
} = require('../validators/user.validator');

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * User management routes (Admin/SuperAdmin only)
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List all users (Admin/SuperAdmin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 */
router.get('/',
  requireRole('admin', 'superadmin'),
  listUsersValidation,
  validate,
  userController.listUsers
);

// Search users
router.get('/search',
  requireRole('admin', 'superadmin'),
  searchUsersValidation,
  validate,
  userController.searchUsers
);

// Get user statistics
router.get('/stats',
  requireRole('admin', 'superadmin'),
  userController.getUserStats
);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user details by ID (Admin/SuperAdmin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 */
router.get('/:id',
  requireRole('admin', 'superadmin'),
  getUserByIdValidation,
  validate,
  userController.getUserById
);

// Create user
router.post('/',
  requireRole('admin', 'superadmin'),
  requireHigherRole,
  createUserValidation,
  validate,
  userController.createUser
);

// Update user
router.put('/:id',
  requireRole('admin', 'superadmin'),
  requireHigherRole,
  updateUserValidation,
  validate,
  userController.updateUser
);

// Delete user
router.delete('/:id',
  requireRole('superadmin'),
  deleteUserValidation,
  validate,
  userController.deleteUser
);

// Block user
router.put('/:id/block',
  requireRole('admin', 'superadmin'),
  requireHigherRole,
  blockUserValidation,
  validate,
  userController.blockUser
);

// Unblock user
router.put('/:id/unblock',
  requireRole('admin', 'superadmin'),
  requireHigherRole,
  unblockUserValidation,
  validate,
  userController.unblockUser
);

// Update user role
router.put('/:id/role',
  requireRole('admin', 'superadmin'),
  requireHigherRole,
  updateUserRoleValidation,
  validate,
  userController.updateUserRole
);

module.exports = router;
