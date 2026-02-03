const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const { syncUserSchema, selectRoleSchema } = require('../validators/auth.validator');

// Public routes
router.post('/sync', validateRequest(syncUserSchema), authController.syncUser);

// Protected routes
router.use(authenticate);
router.post('/role', validateRequest(selectRoleSchema), authController.selectRole);
router.get('/me', authController.getCurrentUser);

module.exports = router;
