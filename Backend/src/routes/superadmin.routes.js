const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

/**
 * All routes require SuperAdmin authentication
 */
router.use(authenticate);
router.use(requireRole('superadmin'));

/**
 * SuperAdmin-only routes
 */

/**
 * @swagger
 * /api/v1/superadmin/dashboard:
 *   get:
 *     summary: Get SuperAdmin dashboard data
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved
 */
router.get('/dashboard', (req, res) => {
  res.json({
    message: 'SuperAdmin dashboard',
    user: req.user
  });
});

/**
 * @swagger
 * /api/v1/superadmin/health:
 *   get:
 *     summary: System-wide health check (SuperAdmin only)
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health data retrieved
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

module.exports = router;
