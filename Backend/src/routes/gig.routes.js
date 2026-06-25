const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gig.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.get('/', gigController.listGigs);

// Owner routes (must be before /:id)
router.get('/my-gigs',
  authenticate,
  requireRole('freelancer'),
  gigController.listMyGigs
);

// Public single gig detail
router.get('/:id', gigController.getGigById);

// Order a gig (client buys a tier → creates a job that enters the escrow flow)
router.post('/:id/order',
  authenticate,
  requireRole('client'),
  gigController.createGigOrder
);

// Protected routes (Freelancers)
router.post('/', 
  authenticate, 
  requireRole('freelancer'), 
  gigController.createGig
);

router.put('/:id', 
  authenticate, 
  requireRole('freelancer'), 
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
