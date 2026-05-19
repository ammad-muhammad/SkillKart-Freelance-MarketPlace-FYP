const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');
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

/**
 * @swagger
 * /api/v1/clients/profile/me:
 *   get:
 *     summary: Get my client profile
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get('/profile/me',
  requireRole('client'),
  clientController.getProfile
);

/**
 * @swagger
 * /api/v1/clients/profile/me:
 *   put:
 *     summary: Update my client profile
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
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

// Upload profile picture
router.post('/upload/avatar',
  requireRole('client'),
  uploadSingle('avatar'),
  clientController.uploadAvatar
);

// Upload company logo
router.post('/upload/logo',
  requireRole('client'),
  uploadSingle('logo'),
  clientController.uploadCompanyLogo
);

/**
 * Onboarding flow routes
 */

/**
 * @swagger
 * /api/v1/clients/onboarding/draft:
 *   get:
 *     summary: Get onboarding draft
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Draft retrieved successfully
 *   post:
 *     summary: Save onboarding draft
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Draft saved successfully
 */
router.get('/onboarding/draft',
  requireRole('client'),
  clientController.getDraft
);

router.post('/onboarding/draft',
  requireRole('client'),
  clientController.saveDraft
);

/**
 * @swagger
 * /api/v1/clients/onboarding/submit:
 *   post:
 *     summary: Submit onboarding profile
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding completed successfully
 */
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

router.post('/saved-freelancers', clientController.toggleSavedFreelancer);
router.get('/saved-freelancers', clientController.getSavedFreelancers);

// AI-assisted Industry recommendation route
router.post('/ai/recommend-industry', requireRole('client'), clientController.recommendIndustry);

module.exports = router;
