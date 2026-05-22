const express = require('express');
const router = express.Router();
const freelancerController = require('../controllers/freelancer.controller');
const authController = require('../controllers/auth.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  updateFreelancerProfileValidation,
  addPortfolioItemValidation,
  updatePortfolioItemValidation,
  deletePortfolioItemValidation,
  searchProfilesValidation
} = require('../validators/profile.validator');
const cvController = require('../controllers/cv.controller');
const { uploadSingle } = require('../middleware/upload.middleware');


/**
 * Public routes
 */

/**
 * @swagger
 * /api/v1/freelancers/search:
 *   get:
 *     summary: Search for freelancers
 *     tags: [Freelancers]
 *     parameters:
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Comma-separated list of skills
 *     responses:
 *       200:
 *         description: List of freelancers retrieved
 */
router.get('/search',
  optionalAuth,
  searchProfilesValidation,
  validate,
  freelancerController.searchFreelancers
);



/**
 * @swagger
 * /api/v1/freelancers/stats/overview:
 *   get:
 *     summary: Get freelancer overview statistics
 *     tags: [Freelancers]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats/overview',
  optionalAuth,
  freelancerController.getStats
);

/**
 * Protected routes (Freelancers only)
 */

/**
 * @swagger
 * /api/v1/freelancers/profile/me:
 *   get:
 *     summary: Get my freelancer profile
 *     tags: [Freelancers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get('/check-username',
  authenticate,
  requireRole('freelancer'),
  authController.checkUsername
);

router.get('/profile/me',
  authenticate,
  requireRole('freelancer'),
  freelancerController.getProfile
);

// Update profile
router.put('/profile/me',
  authenticate,
  requireRole('freelancer'),
  updateFreelancerProfileValidation,
  validate,
  freelancerController.updateProfile
);

/**
 * @swagger
 * /api/v1/freelancers/profile/submit:
 *   post:
 *     summary: Submit onboarding profile
 *     tags: [Freelancers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile submitted successfully
 */
router.post('/profile/submit',
  authenticate,
  requireRole('freelancer'),
  updateFreelancerProfileValidation,
  validate,
  freelancerController.submitOnboardingProfile
);

/**
 * @swagger
 * /api/v1/freelancers/parse-cv:
 *   post:
 *     summary: Parse CV using AI
 *     tags: [Freelancers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: CV parsed successfully
 */
router.post('/parse-cv',
  authenticate,
  requireRole('freelancer'),
  uploadSingle('resume'),
  cvController.parseCV
);

// Upload profile picture
router.post('/profile/avatar',
  authenticate,
  requireRole('freelancer'),
  uploadSingle('avatar'),
  freelancerController.uploadAvatar
);

router.post('/portfolio/media',
  authenticate,
  requireRole('freelancer'),
  uploadSingle('image'),
  freelancerController.uploadPortfolioMedia
);

// Portfolio management
router.post('/portfolio',
  authenticate,
  requireRole('freelancer'),
  addPortfolioItemValidation,
  validate,
  freelancerController.addPortfolioItem
);

router.put('/portfolio/:itemId',
  authenticate,
  requireRole('freelancer'),
  updatePortfolioItemValidation,
  validate,
  freelancerController.updatePortfolioItem
);

router.delete('/portfolio/:itemId',
  authenticate,
  requireRole('freelancer'),
  deletePortfolioItemValidation,
  validate,
  freelancerController.deletePortfolioItem
);

// Saved jobs
router.get('/saved-jobs',
  authenticate,
  requireRole('freelancer'),
  freelancerController.getSavedJobs
);

router.post('/saved-jobs/:jobId',
  authenticate,
  requireRole('freelancer'),
  freelancerController.toggleSavedJob
);

/**
 * @swagger
 * /api/v1/freelancers/{id}:
 *   get:
 *     summary: Get freelancer by ID
 *     tags: [Freelancers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Freelancer retrieved successfully
 */
router.get('/:id',
  optionalAuth,
  freelancerController.getFreelancerById
);

module.exports = router;
