const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cms.controller');
const freelancerController = require('../controllers/freelancer.controller');
const jobController = require('../controllers/job.controller');

/**
 * Public routes - No authentication required
 */

/**
 * CMS Content
 */
router.get('/cms/:pageId', cmsController.getPublicPage);
router.get('/cms', cmsController.listPublishedPages);

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
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    message: 'Public API is running'
  });
});

module.exports = router;
