const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');
const validateRequest = require('../middleware/validateRequest');
const {
  createClientProfileSchema,
  createFreelancerProfileSchema,
} = require('../validators/profile.validator');

router.use(authenticate);

// Create profiles
router.post(
  '/client',
  roleGuard('client'),
  validateRequest(createClientProfileSchema),
  profileController.createClientProfile
);

router.post(
  '/freelancer',
  roleGuard('freelancer'),
  validateRequest(createFreelancerProfileSchema),
  profileController.createFreelancerProfile
);

// Own profile
router.get('/me', profileController.getMyProfile);
router.put('/me', profileController.updateMyProfile);

// Public profile
router.get('/:userId', profileController.getProfileById);

module.exports = router;
