const express = require('express');
const router = express.Router();
const freelancerController = require('../controllers/freelancer.controller');
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

// Search freelancers (public)
router.get('/search',
  optionalAuth,
  searchProfilesValidation,
  validate,
  freelancerController.searchFreelancers
);

// Get freelancer by ID (public)
router.get('/:id',
  optionalAuth,
  freelancerController.getFreelancerById
);

// Get statistics
router.get('/stats/overview',
  optionalAuth,
  freelancerController.getStats
);

/**
 * Protected routes (Freelancers only)
 */

// Get own profile
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

// Submit onboarding profile (Final Step)
router.post('/profile/submit',
  authenticate,
  requireRole('freelancer'),
  updateFreelancerProfileValidation,
  validate,
  freelancerController.submitOnboardingProfile
);

// Parse CV
router.post('/parse-cv',
  authenticate,
  requireRole('freelancer'),
  uploadSingle('resume'),
  cvController.parseCV
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

module.exports = router;
