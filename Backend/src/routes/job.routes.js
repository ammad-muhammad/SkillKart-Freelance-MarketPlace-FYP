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
  closeJobValidation,
  recommendCategoryValidation,
  recommendSubcategoryValidation,
  reviewJobValidation
} = require('../validators/job.validator');

const { uploadSingle } = require('../middleware/upload.middleware');
const upload = { single: uploadSingle };

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

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: List open jobs
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of jobs retrieved successfully
 */
router.get('/',
  optionalAuth,
  listJobsValidation,
  validate,
  jobController.listJobs
);

// Get client's own projects (Must be before /:id)
router.get('/my-projects',
  authenticate,
  jobController.getMyProjects
);

// Get freelancer's contracts (hired jobs + escrow) — before /:id
router.get('/my-contracts',
  authenticate,
  requireRole('freelancer'),
  jobController.getMyContracts
);

router.post('/ai/recommend-category',
  authenticate,
  requireRole('client'),
  recommendCategoryValidation,
  validate,
  jobController.recommendCategory
);

router.post('/ai/recommend-subcategory',
  authenticate,
  requireRole('client'),
  recommendSubcategoryValidation,
  validate,
  jobController.recommendSubcategory
);

// Upload attachment (before /:id)
router.post('/upload/attachment',
  authenticate,
  requireRole('client'),
  upload.single('file'),
  jobController.uploadAttachment
);

// Get job by ID (public)
router.get('/:id',
  optionalAuth,
  getJobValidation,
  validate,
  jobController.getJobById
);

/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     summary: Create a new job post
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - budget
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *     responses:
 *       201:
 *         description: Job created successfully
 */
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

// Gig orders have no Contract/Milestone (legacy 50/50 Stripe flow), so their
// delivery lifecycle lives here rather than the Contract-based Delivery API.
router.post('/:id/gig-delivery',
  authenticate,
  requireRole('freelancer'),
  jobController.submitGigDelivery
);

router.post('/:id/gig-revision',
  authenticate,
  requireRole('client'),
  jobController.requestGigRevision
);

// Review a completed job
router.post('/:id/review',
  authenticate,
  requireRole('client', 'freelancer'),
  reviewJobValidation,
  validate,
  jobController.reviewJob
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
