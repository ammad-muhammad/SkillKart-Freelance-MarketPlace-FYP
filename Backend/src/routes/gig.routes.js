const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gig.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createGigValidation, updateGigValidation } = require('../validators/gig.validator');
const { orderGigValidation, cancelGigOrderValidation } = require('../validators/gigOrder.validator');
const upload = { single: uploadSingle };

// Public routes
router.get('/', gigController.listGigs);

// Owner routes (must be before /:id)
router.get('/my-gigs',
  authenticate,
  requireRole('freelancer'),
  gigController.listMyGigs
);

// Public single gig detail — optionalAuth so a logged-in owner (or admin)
// can view their own draft/paused gig; the controller enforces that check.
router.get('/:id', optionalAuth, gigController.getGigById);

// Order a gig (client buys a tier + states their requirements → creates a
// 'pending_payment' job that goes live once the 50% deposit is paid)
router.post('/:id/order',
  authenticate,
  requireRole('client'),
  orderGigValidation,
  validate,
  gigController.createGigOrder
);

// Cancel a gig order the client hasn't paid for yet
router.post('/orders/:jobId/cancel',
  authenticate,
  requireRole('client'),
  cancelGigOrderValidation,
  validate,
  gigController.cancelGigOrder
);

// Protected routes (Freelancers)
router.post('/',
  authenticate,
  requireRole('freelancer'),
  createGigValidation,
  validate,
  gigController.createGig
);

router.put('/:id',
  authenticate,
  requireRole('freelancer'),
  updateGigValidation,
  validate,
  gigController.updateGig
);

router.delete('/:id', 
  authenticate, 
  requireRole('freelancer'), 
  gigController.deleteGig
);

router.patch('/:id/status', 
  authenticate, 
  requireRole('freelancer'), 
  gigController.toggleStatus
);

router.post('/upload/banner',
  authenticate,
  requireRole('freelancer'),
  upload.single('banner'),
  gigController.uploadBanner
);

module.exports = router;
