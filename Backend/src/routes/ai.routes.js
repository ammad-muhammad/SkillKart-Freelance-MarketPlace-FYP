const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { strictLimiter } = require('../middleware/rateLimit.middleware');
const { optionalAuth } = require('../middleware/auth.middleware');

/**
 * Public AI tools. Rate-limited (10/min) to protect provider quota.
 * `optionalAuth` populates req.user when logged in so Buddy can exempt them
 * from the guest message cap.
 */
router.post('/buddy', strictLimiter, optionalAuth, aiController.buddyChat);
router.post('/cost-estimate', strictLimiter, aiController.estimateCost);
router.post('/suggest-brief', strictLimiter, aiController.suggestBrief);
router.post('/validate-skill', strictLimiter, aiController.validateSkill);
router.post('/expand-skills', strictLimiter, aiController.expandSkills);

module.exports = router;
