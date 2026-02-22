const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createUserValidation } = require('../validators/user.validator');

/**
 * All routes require authentication and admin role
 */
router.use(authenticate);
router.use(requireRole('admin', 'superadmin'));

/**
 * Admin management routes
 */

// Create admin user (SuperAdmin only)
router.post('/create-admin',
  requireRole('superadmin'),
  createUserValidation,
  validate,
  adminController.createAdmin
);

// Reset any user's password
router.put('/users/:id/password',
  adminController.resetUserPassword
);

// Get system statistics
router.get('/stats/system',
  adminController.getSystemStats
);

module.exports = router;
