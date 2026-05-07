const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cms.controller');
const freelancerController = require('../controllers/freelancer.controller');
const jobController = require('../controllers/job.controller');

/**
 * Public routes - No authentication required
 */

/**
 * @swagger
 * /api/v1/public/cms:
 *   get:
 *     summary: List all published CMS pages
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of pages retrieved
 */
router.get('/cms', cmsController.listPublishedPages);

/**
 * @swagger
 * /api/v1/public/cms/{pageId}:
 *   get:
 *     summary: Get a specific CMS page by ID
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Page content retrieved
 */
router.get('/cms/:pageId', cmsController.getPublicPage);

/**
 * Freelancers
 */
router.get('/freelancers/search', freelancerController.searchFreelancers);
router.get('/freelancers/:id', freelancerController.getFreelancerById);

/**
 * Jobs
 */
router.get('/jobs/search', jobController.searchJobs);
router.get('/jobs/:id', jobController.getJobById);
router.get('/jobs', jobController.listJobs);

/**
 * @swagger
 * /api/v1/public/health:
 *   get:
 *     summary: Public API health check
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: API is healthy
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    message: 'Public API is running'
  });
});

module.exports = router;
