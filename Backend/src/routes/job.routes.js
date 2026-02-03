const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard, requireCompleteProfile } = require('../middleware/roleGuard');
const validateRequest = require('../middleware/validateRequest');
const { createJobSchema, updateJobSchema, jobQuerySchema } = require('../validators/job.validator');

// Public routes
router.get('/', validateRequest(jobQuerySchema), jobController.getJobs);
router.get('/:id', jobController.getJobById);

// Protected routes
router.use(authenticate, requireCompleteProfile);

// Client only routes
router.post(
  '/',
  roleGuard('client'),
  validateRequest(createJobSchema),
  jobController.createJob
);

router.put(
  '/:id',
  roleGuard('client'),
  validateRequest(updateJobSchema),
  jobController.updateJob
);

router.delete('/:id', roleGuard('client'), jobController.deleteJob);

router.get('/my/posted', roleGuard('client'), jobController.getMyJobs);

module.exports = router;
