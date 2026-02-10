const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  createJobValidation,
  updateJobValidation,
  getJobValidation,
  deleteJobValidation,
  listJobsValidation,
  searchJobsValidation,
  closeJobValidation
} = require('../validators/job.validator');

/**
 * Public routes
 */

// Search jobs (public)
router.get('/search',
  optionalAuth,
  searchJobsValidation,
  validate,
  jobController.searchJobs
);

// List jobs (public - only open jobs)
router.get('/',
  optionalAuth,
  listJobsValidation,
  validate,
  jobController.listJobs
);

// Get job by ID (public)
router.get('/:id',
  optionalAuth,
  getJobValidation,
  validate,
  jobController.getJobById
);

/**
 * Protected routes (Clients)
 */

// Create job
router.post('/',
  authenticate,
  requireRole('client'),
  createJobValidation,
  validate,
  jobController.createJob
);

// Update job
router.put('/:id',
  authenticate,
  requireRole('client'),
  updateJobValidation,
  validate,
  jobController.updateJob
);

// Close job
router.post('/:id/close',
  authenticate,
  requireRole('client'),
  closeJobValidation,
  validate,
  jobController.closeJob
);

// Delete job
router.delete('/:id',
  authenticate,
  requireRole('client', 'admin', 'superadmin'),
  deleteJobValidation,
  validate,
  jobController.deleteJob
);

module.exports = router;
