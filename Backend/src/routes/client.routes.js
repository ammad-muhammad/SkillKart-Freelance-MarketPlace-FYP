const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  updateClientProfileValidation
} = require('../validators/profile.validator');

/**
 * All routes require authentication
 */
router.use(authenticate);

/**
 * Client profile routes
 */

// Get own profile
router.get('/profile/me',
  requireRole('client'),
  clientController.getProfile
);

// Update profile
router.put('/profile/me',
  requireRole('client'),
  updateClientProfileValidation,
  validate,
  clientController.updateProfile
);

// Submit verification documents
router.post('/verification/submit',
  requireRole('client'),
  clientController.submitVerification
);

/**
 * Onboarding flow routes
 */

// Get onboarding draft
router.get('/onboarding/draft',
  requireRole('client'),
  clientController.getDraft
);

// Save onboarding draft
router.post('/onboarding/draft',
  requireRole('client'),
  clientController.saveDraft
);

// Final onboarding submission
router.post('/onboarding/submit',
  requireRole('client'),
  clientController.submitOnboardingProfile
);

// Get client by ID (Admin only)
router.get('/:id',
  requireRole('admin', 'superadmin'),
  clientController.getClientById
);

/**
 * Admin routes - Verification management
 */

// Approve verification
router.post('/:id/verification/approve',
  requireRole('admin', 'superadmin'),
  clientController.approveVerification
);

// Reject verification
router.post('/:id/verification/reject',
  requireRole('admin', 'superadmin'),
  clientController.rejectVerification
);

// Get statistics
router.get('/stats/overview',
  requireRole('admin', 'superadmin'),
  clientController.getStats
);

module.exports = router;
