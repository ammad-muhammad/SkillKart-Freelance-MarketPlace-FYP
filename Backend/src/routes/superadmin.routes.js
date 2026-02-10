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

// SuperAdmin dashboard
router.get('/dashboard', (req, res) => {
  res.json({
    message: 'SuperAdmin dashboard',
    user: req.user
  });
});

// System health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

module.exports = router;
