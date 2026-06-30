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

/**
 * @swagger
 * /api/v1/admin/create-admin:
 *   post:
 *     summary: Create a new admin user (SuperAdmin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Admin user created successfully
 */
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

/**
 * @swagger
 * /api/v1/admin/stats/system:
 *   get:
 *     summary: Get overall system statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 */
router.get('/stats/system',
  adminController.getSystemStats
);

/* ── Taxonomy Graph Admin Operations ─────────────────────────────────── */
const taxCtrl = require('../controllers/taxonomy.controller');

router.get('/taxonomy/nodes',          taxCtrl.listNodes);
router.post('/taxonomy/nodes',         taxCtrl.createNode);
router.patch('/taxonomy/nodes/:id',    taxCtrl.updateNode);
router.post('/taxonomy/relationships', taxCtrl.createRelationship);
router.delete('/taxonomy/relationships', taxCtrl.deleteRelationship);
router.post('/taxonomy/merge',         taxCtrl.mergeNodes);

// Review Queue routes
router.get('/taxonomy/proposals',       taxCtrl.listProposals);
router.post('/taxonomy/proposals/:id/review', taxCtrl.reviewProposal);

module.exports = router;
