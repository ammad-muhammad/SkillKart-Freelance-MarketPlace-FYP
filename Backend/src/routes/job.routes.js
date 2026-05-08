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

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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

// Delete job
router.delete('/:id',
  authenticate,
  requireRole('client', 'admin', 'superadmin'),
  deleteJobValidation,
  validate,
  jobController.deleteJob
);

// Upload attachment
router.post('/upload/attachment',
  authenticate,
  requireRole('client'),
  upload.single('file'),
  jobController.uploadAttachment
);

module.exports = router;
